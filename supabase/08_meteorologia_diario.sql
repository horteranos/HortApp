-- SISTEMA MONITORIZACION 0.5.0. Ejecutar COMPLETO como postgres, despues de 06.
-- Aditiva y repetible. No reinstala datos, no renumera puntos ni borra notas.
BEGIN;
DO $$ BEGIN
  IF current_user <> 'postgres' THEN RAISE EXCEPTION 'Selecciona el rol postgres.'; END IF;
  IF to_regclass('public.eventos_cultivo') IS NULL OR to_regnamespace('huerto_privado') IS NULL THEN
    RAISE EXCEPTION 'Falta la migracion 06. No se ha cambiado nada.';
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.monitor_config (
 huerto_id uuid PRIMARY KEY REFERENCES public.huertos(id) ON DELETE CASCADE,
 latitud double precision NOT NULL CHECK(latitud BETWEEN -90 AND 90),
 longitud double precision NOT NULL CHECK(longitud BETWEEN -180 AND 180),
 ubicacion text NOT NULL CHECK(length(ubicacion) BETWEEN 1 AND 120),
 confirmada boolean NOT NULL DEFAULT false,
 zona_horaria text NOT NULL DEFAULT 'Europe/Madrid' CHECK(zona_horaria='Europe/Madrid'),
 desde date NOT NULL CHECK(desde>='1940-01-02'),
 revision integer NOT NULL DEFAULT 0,
 lugar_version integer NOT NULL DEFAULT 1,
 umbrales jsonb NOT NULL DEFAULT '{"lluvia_prob":50,"lluvia_mm":0.2,"racha":50,"frio":2,"calor":35,"humedad_alta":90,"humedad_baja":30}'::jsonb
);
CREATE TABLE IF NOT EXISTS public.monitor_diario (
 id uuid PRIMARY KEY,
 huerto_id uuid NOT NULL REFERENCES public.huertos(id) ON DELETE CASCADE,
 fecha date NOT NULL CHECK(fecha>='1900-01-01'),
 titulo text CHECK(length(titulo)<=120),
 texto text NOT NULL CHECK(length(btrim(texto)) BETWEEN 1 AND 8000),
 tipo text NOT NULL CHECK(tipo IN ('observacion','riego','mantenimiento','plantacion','cosecha','incidencia','otros')),
 fila_id uuid, fila_codigo text, plantacion_id uuid, cultivo text,
 puntos_snapshot jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(puntos_snapshot)='array'),
 creado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 creado_en timestamptz NOT NULL DEFAULT now(), actualizado_en timestamptz NOT NULL DEFAULT now(),
 revision integer NOT NULL DEFAULT 0, anulado_en timestamptz
);
CREATE INDEX IF NOT EXISTS monitor_diario_fecha_idx ON public.monitor_diario(huerto_id,fecha DESC,id);
CREATE TABLE IF NOT EXISTS public.monitor_meteo_dias (
 huerto_id uuid NOT NULL REFERENCES public.huertos(id) ON DELETE CASCADE,
 lugar_version integer NOT NULL,
 fecha date NOT NULL, fuente text NOT NULL CHECK(fuente IN ('archivo','reciente')),
 completo boolean NOT NULL, datos jsonb NOT NULL,
 actualizado_en timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(huerto_id,lugar_version,fecha)
);
CREATE TABLE IF NOT EXISTS public.monitor_meteo_prevision (
 huerto_id uuid NOT NULL REFERENCES public.huertos(id) ON DELETE CASCADE,
 lugar_version integer NOT NULL, datos jsonb NOT NULL,
 consultado_en timestamptz NOT NULL,
 PRIMARY KEY(huerto_id,lugar_version)
);
CREATE TABLE IF NOT EXISTS public.monitor_sync (
 huerto_id uuid PRIMARY KEY REFERENCES public.huertos(id) ON DELETE CASCADE,
 ultimo_intento timestamptz, ultimo_ok timestamptz, mensaje text,
 lease uuid, lease_en timestamptz
);
CREATE TABLE IF NOT EXISTS huerto_privado.monitor_dispositivos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), huerto_id uuid NOT NULL REFERENCES public.huertos(id) ON DELETE CASCADE,
 nombre text NOT NULL CHECK(length(nombre) BETWEEN 1 AND 100), token_hash text NOT NULL UNIQUE,
 creado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 creado_en timestamptz NOT NULL DEFAULT now(), ultimo_uso timestamptz, revocado_en timestamptz
);
CREATE TABLE IF NOT EXISTS huerto_privado.monitor_diario_revisiones (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, entrada_id uuid NOT NULL REFERENCES public.monitor_diario(id),
 anterior jsonb NOT NULL, cambiado_por uuid, cambiado_en timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON huerto_privado.monitor_dispositivos,huerto_privado.monitor_diario_revisiones FROM PUBLIC,anon,authenticated;
-- Rounded municipal reference, not the location of a particular property.
INSERT INTO public.monitor_config(huerto_id,latitud,longitud,ubicacion,desde)
 SELECT h.id,39.50,-0.35,'Alboraya - referencia aproximada, pendiente de confirmar',
 greatest(DATE '1940-01-02',least(current_date,coalesce((SELECT min(fecha) FROM public.eventos_cultivo e WHERE e.huerto_id=h.id),current_date)))
 FROM public.huertos h WHERE h.codigo='huerto-alboraya' ON CONFLICT DO NOTHING;
INSERT INTO public.monitor_sync(huerto_id) SELECT huerto_id FROM public.monitor_config ON CONFLICT DO NOTHING;
UPDATE public.huertos SET nombre=U&'Sistema Monitorizaci\00F3n' WHERE codigo='huerto-alboraya' AND nombre IN ('Huerto Alboraya','Sistema Monitorizacion',U&'Sistema Monitorizaci\00F3n');
-- All new reads require membership. All writes go through the checked RPC.
DO $rls$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['monitor_config','monitor_diario','monitor_meteo_dias','monitor_meteo_prevision','monitor_sync'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  EXECUTE format('DROP POLICY IF EXISTS monitor_lectura ON public.%I',t);
  EXECUTE format('CREATE POLICY monitor_lectura ON public.%I FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.miembros_huerto m WHERE m.huerto_id=%I.huerto_id AND m.usuario_id=auth.uid()))',t,t);
 END LOOP;
END $rls$;

CREATE OR REPLACE FUNCTION public.monitor_operacion(p_huerto_id uuid,p_accion text,p_datos jsonb DEFAULT '{}'::jsonb,p_token text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
 v_uid uuid:=auth.uid(); v_rol text; v_device uuid; c public.monitor_config%ROWTYPE;
 s public.monitor_sync%ROWTYPE; e public.monitor_diario%ROWTYPE; v_id uuid;
 v_fila uuid; v_lote uuid; v_fecha date; v_desde date; v_hasta date; v_fila_codigo text; v_cultivo text;
 v_puntos jsonb:='[]'; v_item jsonb; v_prevision jsonb; v_rows jsonb; v_total bigint;
 v_pagina integer; v_lease uuid; v_umbrales jsonb; v_nombre text; v_count integer;
BEGIN
 IF p_huerto_id IS NULL OR p_accion IS NULL OR p_datos IS NULL OR jsonb_typeof(p_datos)<>'object' OR octet_length(p_datos::text)>350000 THEN
  RAISE EXCEPTION 'Solicitud no valida.' USING ERRCODE='22023'; END IF;
 IF p_token IS NOT NULL THEN
  IF length(p_token)<>64 OR p_token!~'^[a-f0-9]{64}$' OR p_accion NOT IN ('sync_inicio','sync_guardar','sync_fin','estado_dispositivo') THEN
   RAISE EXCEPTION 'Dispositivo no autorizado.' USING ERRCODE='42501'; END IF;
  SELECT d.id INTO v_device FROM huerto_privado.monitor_dispositivos d
   JOIN public.miembros_huerto m ON m.huerto_id=d.huerto_id AND m.usuario_id=d.creado_por AND m.rol='administrador'
   WHERE d.huerto_id=p_huerto_id AND d.revocado_en IS NULL AND d.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  IF v_device IS NULL THEN RAISE EXCEPTION 'Dispositivo no autorizado o revocado.' USING ERRCODE='42501'; END IF;
  UPDATE huerto_privado.monitor_dispositivos SET ultimo_uso=now() WHERE id=v_device;
 ELSE
  SELECT rol INTO v_rol FROM public.miembros_huerto WHERE huerto_id=p_huerto_id AND usuario_id=v_uid;
  IF v_rol IS NULL THEN RAISE EXCEPTION 'Sin acceso.' USING ERRCODE='42501'; END IF;
 END IF;
 SELECT * INTO c FROM public.monitor_config WHERE huerto_id=p_huerto_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'No existe configuracion meteorologica. Revisa la migracion 08.' USING ERRCODE='22023'; END IF;
 IF p_accion IN ('leer','estado_dispositivo') THEN
  RETURN jsonb_build_object('config',to_jsonb(c),'historial',coalesce((SELECT jsonb_agg(datos ORDER BY fecha DESC) FROM public.monitor_meteo_dias WHERE huerto_id=p_huerto_id AND lugar_version=c.lugar_version AND fecha>=(now() AT TIME ZONE c.zona_horaria)::date-365),'[]'::jsonb),
   'dias',coalesce((SELECT jsonb_agg(jsonb_build_object('fecha',fecha,'fuente',fuente,'completo',completo) ORDER BY fecha) FROM public.monitor_meteo_dias WHERE huerto_id=p_huerto_id AND lugar_version=c.lugar_version),'[]'::jsonb),
   'prevision',(SELECT datos FROM public.monitor_meteo_prevision WHERE huerto_id=p_huerto_id AND lugar_version=c.lugar_version),
   'sync',(SELECT jsonb_build_object('ultimo_intento',ultimo_intento,'ultimo_ok',ultimo_ok,'mensaje',mensaje) FROM public.monitor_sync WHERE huerto_id=p_huerto_id),
   'dispositivos',CASE WHEN v_rol='administrador' THEN coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'nombre',nombre,'creado_en',creado_en,'ultimo_uso',ultimo_uso,'revocado_en',revocado_en) ORDER BY creado_en DESC) FROM huerto_privado.monitor_dispositivos WHERE huerto_id=p_huerto_id),'[]'::jsonb) ELSE '[]'::jsonb END);
 END IF;
 IF p_accion IN ('diario_listar','diario_exportar') THEN
  v_desde:=coalesce(nullif(p_datos->>'desde','')::date,DATE '1900-01-01');v_hasta:=coalesce(nullif(p_datos->>'hasta','')::date,DATE '9999-12-31');
  v_pagina:=greatest(0,least(100000,coalesce((p_datos->>'pagina')::integer,0)));
  WITH filtradas AS (
   SELECT * FROM public.monitor_diario d WHERE huerto_id=p_huerto_id AND fecha BETWEEN v_desde AND v_hasta
    AND (anulado_en IS NULL OR coalesce((p_datos->>'incluir_anulados')::boolean,false))
    AND (nullif(p_datos->>'fila','') IS NULL OR fila_id::text=p_datos->>'fila')
    AND (nullif(p_datos->>'punto','') IS NULL OR EXISTS(SELECT 1 FROM jsonb_array_elements(d.puntos_snapshot) pp WHERE pp->>'id'=p_datos->>'punto'))
    AND (nullif(p_datos->>'cultivo','') IS NULL OR d.plantacion_id::text=p_datos->>'cultivo')
    AND (nullif(p_datos->>'tipo','') IS NULL OR tipo=p_datos->>'tipo')
    AND (nullif(p_datos->>'texto','') IS NULL OR strpos(lower(coalesce(titulo,'')||' '||texto),lower(p_datos->>'texto'))>0)
  ) SELECT (SELECT count(*) FROM filtradas),coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY fecha DESC,creado_en DESC,id) FROM (SELECT * FROM filtradas ORDER BY fecha DESC,creado_en DESC,id LIMIT CASE WHEN p_accion='diario_exportar' THEN 2001 ELSE 100 END OFFSET CASE WHEN p_accion='diario_exportar' THEN 0 ELSE v_pagina*100 END) x),'[]'::jsonb) INTO v_total,v_rows;
  IF p_accion='diario_exportar' AND v_total>2000 THEN RAISE EXCEPTION 'Selecciona un periodo mas corto: maximo 2000 entradas por exportacion. No se ha exportado una lista incompleta.' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('entradas',v_rows,'total',v_total,'pagina',v_pagina,'limite',CASE WHEN p_accion='diario_exportar' THEN 2000 ELSE 100 END);
 END IF;
 IF p_accion IN ('config_guardar','dispositivo_crear','dispositivo_revocar') AND v_rol IS DISTINCT FROM 'administrador' THEN
  RAISE EXCEPTION 'Solo el administrador puede configurar este apartado.' USING ERRCODE='42501'; END IF;
 IF p_accion IN ('diario_guardar','diario_anular','sync_inicio','sync_guardar','sync_fin') AND v_device IS NULL AND coalesce(v_rol,'') NOT IN ('administrador','editor') THEN
  RAISE EXCEPTION 'Permiso de edicion requerido.' USING ERRCODE='42501'; END IF;
 IF p_accion='config_guardar' THEN
  SELECT * INTO c FROM public.monitor_config WHERE huerto_id=p_huerto_id FOR UPDATE;
  IF (p_datos->>'revision')::integer IS DISTINCT FROM c.revision THEN RAISE EXCEPTION 'La configuracion ha cambiado. Recarga antes de guardar.' USING ERRCODE='40001'; END IF;
  v_umbrales:=p_datos->'umbrales';
  IF jsonb_typeof(v_umbrales) IS DISTINCT FROM 'object' OR NOT (v_umbrales ?& ARRAY['lluvia_prob','lluvia_mm','racha','frio','calor','humedad_alta','humedad_baja']) THEN
   RAISE EXCEPTION 'Faltan umbrales.' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_each(v_umbrales) x WHERE jsonb_typeof(x.value)<>'number') THEN RAISE EXCEPTION 'Todos los umbrales deben ser numericos.' USING ERRCODE='22023'; END IF;
  IF NOT ((v_umbrales->>'lluvia_prob')::numeric BETWEEN 1 AND 100 AND (v_umbrales->>'lluvia_mm')::numeric BETWEEN 0.1 AND 100
   AND (v_umbrales->>'racha')::numeric BETWEEN 5 AND 250 AND (v_umbrales->>'frio')::numeric BETWEEN -30 AND 20
   AND (v_umbrales->>'calor')::numeric BETWEEN 20 AND 60 AND (v_umbrales->>'humedad_alta')::numeric BETWEEN 50 AND 100
   AND (v_umbrales->>'humedad_baja')::numeric BETWEEN 1 AND 50) THEN RAISE EXCEPTION 'Umbrales fuera de rango.' USING ERRCODE='22023'; END IF;
  v_fecha:=(p_datos->>'desde')::date;
  IF v_fecha IS NULL OR v_fecha<DATE '1940-01-02' OR v_fecha>(now() AT TIME ZONE c.zona_horaria)::date THEN RAISE EXCEPTION 'La fecha de inicio no es valida.' USING ERRCODE='22023'; END IF;
  UPDATE public.monitor_config SET latitud=(p_datos->>'latitud')::double precision,longitud=(p_datos->>'longitud')::double precision,
   lugar_version=CASE WHEN latitud IS DISTINCT FROM (p_datos->>'latitud')::double precision OR longitud IS DISTINCT FROM (p_datos->>'longitud')::double precision THEN lugar_version+1 ELSE lugar_version END,
   ubicacion=btrim(p_datos->>'ubicacion'),confirmada=coalesce((p_datos->>'confirmada')::boolean,false),desde=v_fecha,
   umbrales=v_umbrales,revision=revision+1 WHERE huerto_id=p_huerto_id RETURNING * INTO c;
  RETURN to_jsonb(c);
 END IF;
 IF p_accion='dispositivo_crear' THEN
  IF coalesce(p_datos->>'token','')!~'^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Token no valido.' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO v_count FROM huerto_privado.monitor_dispositivos WHERE huerto_id=p_huerto_id AND revocado_en IS NULL;
  IF v_count>=10 THEN RAISE EXCEPTION 'Revoca un dispositivo anterior antes de crear otro.' USING ERRCODE='22023'; END IF;
  INSERT INTO huerto_privado.monitor_dispositivos(huerto_id,nombre,token_hash,creado_por)
   VALUES(p_huerto_id,coalesce(nullif(btrim(p_datos->>'nombre'),''),'Mac meteorologia'),encode(sha256(convert_to(p_datos->>'token','UTF8')),'hex'),v_uid) RETURNING id INTO v_id;
  RETURN jsonb_build_object('id',v_id);
 END IF;
 IF p_accion='dispositivo_revocar' THEN
  UPDATE huerto_privado.monitor_dispositivos SET revocado_en=now() WHERE huerto_id=p_huerto_id AND id=(p_datos->>'id')::uuid;
  RETURN jsonb_build_object('ok',true);
 END IF;
 IF p_accion IN ('diario_guardar','diario_anular') THEN
  v_id:=(p_datos->>'id')::uuid;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Falta identificador del registro.' USING ERRCODE='22023'; END IF;
  SELECT * INTO e FROM public.monitor_diario WHERE id=v_id FOR UPDATE;
  IF FOUND THEN
   IF e.huerto_id<>p_huerto_id OR (v_rol<>'administrador' AND e.creado_por IS DISTINCT FROM v_uid) THEN RAISE EXCEPTION 'Solo puedes editar tus notas.' USING ERRCODE='42501'; END IF;
   IF (p_datos->>'revision')::integer IS DISTINCT FROM e.revision OR e.anulado_en IS NOT NULL THEN RAISE EXCEPTION 'La entrada ha cambiado o esta anulada. Recarga el diario.' USING ERRCODE='40001'; END IF;
   INSERT INTO huerto_privado.monitor_diario_revisiones(entrada_id,anterior,cambiado_por) VALUES(e.id,to_jsonb(e),v_uid);
   IF p_accion='diario_anular' THEN
    UPDATE public.monitor_diario SET anulado_en=now(),actualizado_en=now(),revision=revision+1 WHERE id=v_id RETURNING * INTO e;
   ELSE
    -- Location snapshots remain immutable on edit; do not lose deleted points.
    UPDATE public.monitor_diario SET fecha=(p_datos->>'fecha')::date,titulo=nullif(btrim(p_datos->>'titulo'),''),texto=btrim(p_datos->>'texto'),tipo=p_datos->>'tipo',actualizado_en=now(),revision=revision+1 WHERE id=v_id RETURNING * INTO e;
   END IF;
   RETURN to_jsonb(e);
  END IF;
  IF p_accion='diario_anular' OR (p_datos->>'revision')::integer IS DISTINCT FROM -1 THEN RAISE EXCEPTION 'Entrada no encontrada.' USING ERRCODE='40001'; END IF;
  v_fila:=nullif(p_datos->>'fila_id','')::uuid;v_lote:=nullif(p_datos->>'plantacion_id','')::uuid;
  IF v_fila IS NOT NULL THEN
   SELECT codigo INTO v_fila_codigo FROM public.filas WHERE id=v_fila AND huerto_id=p_huerto_id;
   IF NOT FOUND THEN RAISE EXCEPTION 'Fila no valida.' USING ERRCODE='22023'; END IF;
  END IF;
  IF v_lote IS NOT NULL THEN
   SELECT cultivo||coalesce(' - '||variedad,'') INTO v_cultivo FROM public.plantaciones WHERE id=v_lote AND huerto_id=p_huerto_id AND (v_fila IS NULL OR fila_id=v_fila OR fila_prevista_id=v_fila);
   IF NOT FOUND THEN RAISE EXCEPTION 'Cultivo no valido para esta fila.' USING ERRCODE='22023'; END IF;
  END IF;
  IF jsonb_typeof(coalesce(p_datos->'puntos','[]'))<>'array' THEN RAISE EXCEPTION 'Seleccion de puntos no valida.' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO v_count FROM jsonb_array_elements_text(coalesce(p_datos->'puntos','[]'));
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'numero',p.numero_desde_oeste) ORDER BY p.numero_desde_oeste),'[]'::jsonb) INTO v_puntos
   FROM public.puntos_riego p WHERE p.huerto_id=p_huerto_id AND p.fila_id=v_fila AND p.id IN (SELECT value::uuid FROM jsonb_array_elements_text(coalesce(p_datos->'puntos','[]')));
  IF jsonb_array_length(v_puntos)<>v_count THEN RAISE EXCEPTION 'Los puntos han cambiado o no pertenecen a la fila.' USING ERRCODE='40001'; END IF;
  INSERT INTO public.monitor_diario(id,huerto_id,fecha,titulo,texto,tipo,fila_id,fila_codigo,plantacion_id,cultivo,puntos_snapshot,creado_por)
   VALUES(v_id,p_huerto_id,(p_datos->>'fecha')::date,nullif(btrim(p_datos->>'titulo'),''),btrim(p_datos->>'texto'),p_datos->>'tipo',v_fila,v_fila_codigo,v_lote,v_cultivo,v_puntos,v_uid) RETURNING * INTO e;
  RETURN to_jsonb(e);
 END IF;
 IF p_accion='sync_inicio' THEN
  IF NOT c.confirmada THEN RETURN jsonb_build_object('omitir',true,'mensaje','Confirma la ubicacion en Meteorologia antes de sincronizar.'); END IF;
  SELECT * INTO s FROM public.monitor_sync WHERE huerto_id=p_huerto_id FOR UPDATE;
  IF s.lease IS NOT NULL AND s.lease_en>now()-interval '12 minutes' THEN RETURN jsonb_build_object('omitir',true,'mensaje','Otra sincronizacion esta en curso.'); END IF;
  IF s.ultimo_intento>now()-interval '45 minutes' AND NOT (v_device IS NULL AND coalesce((p_datos->>'forzar')::boolean,false)) THEN
   RETURN jsonb_build_object('omitir',true,'mensaje','Actualizacion reciente. Se volvera a comprobar en el siguiente ciclo.'); END IF;
  v_lease:=gen_random_uuid();UPDATE public.monitor_sync SET lease=v_lease,lease_en=now(),ultimo_intento=now(),mensaje='Sincronizacion en curso' WHERE huerto_id=p_huerto_id;
  RETURN jsonb_build_object('lease',v_lease,'config',to_jsonb(c),'dias',coalesce((SELECT jsonb_agg(jsonb_build_object('fecha',fecha,'fuente',fuente,'completo',completo)) FROM public.monitor_meteo_dias WHERE huerto_id=p_huerto_id AND lugar_version=c.lugar_version),'[]'::jsonb));
 END IF;
 IF p_accion IN ('sync_guardar','sync_fin') THEN
  SELECT * INTO s FROM public.monitor_sync WHERE huerto_id=p_huerto_id FOR UPDATE;
  IF s.lease IS NULL OR s.lease IS DISTINCT FROM (p_datos->>'lease')::uuid OR s.lease_en<now()-interval '12 minutes' THEN
   RAISE EXCEPTION 'Sincronizacion caducada. Se reintentara sin borrar datos.' USING ERRCODE='40001'; END IF;
  IF p_accion='sync_fin' THEN
   UPDATE public.monitor_sync SET lease=NULL,lease_en=NULL,mensaje=left(p_datos->>'mensaje',1500),ultimo_ok=CASE WHEN coalesce((p_datos->>'correcto')::boolean,false) THEN now() ELSE ultimo_ok END WHERE huerto_id=p_huerto_id;
   RETURN jsonb_build_object('ok',true);
  END IF;
  IF (p_datos->>'lugar_version')::integer IS DISTINCT FROM c.lugar_version OR NOT c.confirmada THEN RAISE EXCEPTION 'Ubicacion modificada. Reintenta con la nueva configuracion.' USING ERRCODE='40001'; END IF;
  IF jsonb_typeof(p_datos->'filas') IS DISTINCT FROM 'array' OR jsonb_array_length(p_datos->'filas')>50 THEN RAISE EXCEPTION 'Lote meteorologico no valido.' USING ERRCODE='22023'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_datos->'filas') LOOP
   v_fecha:=(v_item->>'fecha')::date;
   IF v_fecha IS NULL OR v_fecha<c.desde OR v_fecha>=(now() AT TIME ZONE c.zona_horaria)::date OR coalesce(v_item->>'fuente','') NOT IN ('archivo','reciente')
    OR coalesce((v_item->>'horas_esperadas')::integer,0) NOT BETWEEN 23 AND 25 OR jsonb_typeof(v_item->'cobertura') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Resumen meteorologico no valido.' USING ERRCODE='22023'; END IF;
   IF (v_item->>'completo')::boolean THEN
    IF EXISTS(SELECT 1 FROM jsonb_each_text(v_item->'cobertura') x WHERE x.value::integer<>(v_item->>'horas_esperadas')::integer)
     OR (SELECT count(*) FROM jsonb_object_keys(v_item->'cobertura'))<>5
     OR EXISTS(SELECT 1 FROM unnest(ARRAY['tmin','tmax','hrmin','hrmax','hrmedia','viento','racha','lluvia']) k WHERE v_item->>k IS NULL) THEN
      RAISE EXCEPTION 'No se puede marcar completo un dia con datos ausentes.' USING ERRCODE='22023'; END IF;
   END IF;
   IF (v_item->>'hrmin')::numeric NOT BETWEEN 0 AND 100 OR (v_item->>'hrmax')::numeric NOT BETWEEN 0 AND 100 OR (v_item->>'hrmedia')::numeric NOT BETWEEN 0 AND 100 OR (v_item->>'lluvia')::numeric<0
    OR (v_item->>'tmin')::numeric NOT BETWEEN -100 AND 70 OR (v_item->>'tmax')::numeric NOT BETWEEN -100 AND 70 OR (v_item->>'tmin')::numeric>(v_item->>'tmax')::numeric
    OR (v_item->>'viento')::numeric<0 OR (v_item->>'racha')::numeric<0 THEN RAISE EXCEPTION 'Valores meteorologicos fuera de rango.' USING ERRCODE='22023'; END IF;
   INSERT INTO public.monitor_meteo_dias(huerto_id,lugar_version,fecha,fuente,completo,datos) VALUES(p_huerto_id,c.lugar_version,v_fecha,v_item->>'fuente',(v_item->>'completo')::boolean,v_item)
    ON CONFLICT(huerto_id,lugar_version,fecha) DO UPDATE SET fuente=excluded.fuente,completo=excluded.completo,datos=excluded.datos,actualizado_en=now()
    WHERE (NOT public.monitor_meteo_dias.completo OR excluded.completo) AND NOT (public.monitor_meteo_dias.fuente='archivo' AND excluded.fuente='reciente');
  END LOOP;
  v_prevision:=p_datos->'prevision';
  IF v_prevision IS NOT NULL AND v_prevision<>'null'::jsonb THEN
   IF jsonb_typeof(v_prevision->'horas') IS DISTINCT FROM 'array' OR jsonb_array_length(v_prevision->'horas') NOT BETWEEN 1 AND 120
    OR (v_prevision->>'consultado_en')::timestamptz NOT BETWEEN now()-interval '1 hour' AND now()+interval '5 minutes'
    OR v_prevision->>'consultado_en' IS NULL THEN RAISE EXCEPTION 'Prevision no valida.' USING ERRCODE='22023'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_prevision->'horas') h WHERE (h->>'t')::numeric NOT BETWEEN extract(epoch FROM now()-interval '1 day') AND extract(epoch FROM now()+interval '7 days') OR h->>'t' IS NULL)
    OR (SELECT count(*) FROM jsonb_array_elements(v_prevision->'horas'))<>(SELECT count(DISTINCT h->>'t') FROM jsonb_array_elements(v_prevision->'horas') h) THEN RAISE EXCEPTION 'Horas de prevision no validas.' USING ERRCODE='22023'; END IF;
   INSERT INTO public.monitor_meteo_prevision(huerto_id,lugar_version,datos,consultado_en) VALUES(p_huerto_id,c.lugar_version,v_prevision,(v_prevision->>'consultado_en')::timestamptz)
    ON CONFLICT(huerto_id,lugar_version) DO UPDATE SET datos=excluded.datos,consultado_en=excluded.consultado_en WHERE excluded.consultado_en>=public.monitor_meteo_prevision.consultado_en;
  END IF;
  RETURN jsonb_build_object('ok',true);
 END IF;
 RAISE EXCEPTION 'Operacion no reconocida.' USING ERRCODE='22023';
END;
$fn$;
REVOKE ALL ON FUNCTION public.monitor_operacion(uuid,text,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.monitor_operacion(uuid,text,jsonb,text) TO authenticated,anon;
COMMENT ON FUNCTION public.monitor_operacion(uuid,text,jsonb,text) IS 'Authenticated members or a SHA-256 hashed, revocable, weather-only device capability. No service_role required.';
NOTIFY pgrst,'reload schema';
COMMIT;
SELECT 'Migracion 08 aplicada. Ejecuta ahora 09_comprobar_monitor.sql.' AS resultado;
