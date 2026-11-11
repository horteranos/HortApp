-- HUERTO ALBORAYA 0.4.0 | Ejecutar COMPLETO como postgres tras la migracion 04.
-- Aditiva, transaccional y repetible. No recarga datos de ejemplo ni borra cultivos.
-- Las ubicaciones de eventos son fotografias del registro, no coordenadas fisicas.
BEGIN;
DO $preflight$
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Selecciona postgres en SQL Editor.';
  END IF;
  IF to_regprocedure('public.editar_plano(uuid,uuid,integer,text,uuid,integer,uuid[],text,text)') IS NULL
     OR to_regnamespace('huerto_privado') IS NULL THEN
    RAISE EXCEPTION 'Falta la migracion 04_gestion_plano.sql. No se ha modificado nada.';
  END IF;
END;
$preflight$;

ALTER TABLE public.huertos ADD COLUMN IF NOT EXISTS version_cuaderno bigint NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.huertos.version_cuaderno IS 'Revision tecnica de eventos y ocupaciones; no es una fecha de cultivo.';

CREATE TABLE IF NOT EXISTS public.eventos_cultivo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  huerto_id uuid NOT NULL REFERENCES public.huertos(id) ON DELETE CASCADE,
  plantacion_id uuid NOT NULL REFERENCES public.plantaciones(id) ON DELETE RESTRICT,
  fila_id uuid,
  fila_codigo text,
  cultivo text NOT NULL,
  variedad text,
  tipo text NOT NULL CHECK (tipo IN ('siembra','resiembra','plantacion','cosecha','incorporacion','inicio_no_precisado')),
  fecha date NOT NULL CHECK (fecha >= DATE '1900-01-01'),
  precision_fecha text NOT NULL DEFAULT 'exacta' CHECK (precision_fecha IN ('exacta','aproximada')),
  puntos_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(puntos_snapshot) = 'array'),
  notas text CHECK (char_length(notas) <= 4000),
  origen text NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual','migracion_06')),
  clave_importacion text,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  creado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  anulado_en timestamptz,
  motivo_anulacion text CHECK (char_length(motivo_anulacion) <= 500),
  UNIQUE (huerto_id, clave_importacion)
);
CREATE INDEX IF NOT EXISTS eventos_cultivo_fecha_idx ON public.eventos_cultivo (huerto_id, fecha, id);
CREATE INDEX IF NOT EXISTS eventos_cultivo_lote_idx ON public.eventos_cultivo (huerto_id, plantacion_id);

-- No hay FK a puntos_riego: eliminar un gotero NO debe eliminar su historia.
CREATE TABLE IF NOT EXISTS public.ocupaciones_cultivo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  huerto_id uuid NOT NULL REFERENCES public.huertos(id) ON DELETE CASCADE,
  plantacion_id uuid NOT NULL REFERENCES public.plantaciones(id) ON DELETE RESTRICT,
  punto_id uuid NOT NULL,
  fila_id uuid NOT NULL,
  fila_codigo text NOT NULL,
  numero_al_asignar integer NOT NULL CHECK (numero_al_asignar > 0),
  numero_al_retirar integer,
  cultivo text NOT NULL,
  variedad text,
  registrado_en timestamptz NOT NULL DEFAULT now(),
  retirado_en timestamptz,
  inicio_desconocido boolean NOT NULL DEFAULT false,
  registrado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ocupacion_abierta_unica
  ON public.ocupaciones_cultivo (plantacion_id, punto_id) WHERE retirado_en IS NULL;
CREATE INDEX IF NOT EXISTS ocupaciones_fila_idx ON public.ocupaciones_cultivo (huerto_id, fila_id, punto_id);

CREATE TABLE IF NOT EXISTS huerto_privado.revisiones_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  huerto_id uuid NOT NULL REFERENCES public.huertos(id) ON DELETE CASCADE,
  evento_id uuid NOT NULL REFERENCES public.eventos_cultivo(id) ON DELETE RESTRICT,
  anterior jsonb NOT NULL,
  posterior jsonb NOT NULL,
  usuario_id uuid,
  registrado_en timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON huerto_privado.revisiones_eventos FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION huerto_privado.auditar_evento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO huerto_privado.revisiones_eventos (huerto_id, evento_id, anterior, posterior, usuario_id)
      VALUES (NEW.huerto_id, NEW.id, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
  END IF;
  UPDATE public.huertos SET version_cuaderno = version_cuaderno + 1 WHERE id = NEW.huerto_id;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION huerto_privado.auditar_evento() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS eventos_auditoria ON public.eventos_cultivo;
CREATE TRIGGER eventos_auditoria AFTER INSERT OR UPDATE ON public.eventos_cultivo
  FOR EACH ROW EXECUTE FUNCTION huerto_privado.auditar_evento();

CREATE OR REPLACE FUNCTION huerto_privado.registrar_ocupacion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE v_numero integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ocupaciones_cultivo
      (huerto_id, plantacion_id, punto_id, fila_id, fila_codigo, numero_al_asignar, cultivo, variedad, registrado_por)
    SELECT NEW.huerto_id, NEW.plantacion_id, NEW.punto_id, NEW.fila_id, f.codigo,
           p.numero_desde_oeste, c.cultivo, c.variedad, auth.uid()
    FROM public.puntos_riego p JOIN public.filas f ON f.id = p.fila_id
    JOIN public.plantaciones c ON c.id = NEW.plantacion_id
    WHERE p.id = NEW.punto_id;
    UPDATE public.huertos SET version_cuaderno = version_cuaderno + 1 WHERE id = NEW.huerto_id;
    RETURN NEW;
  END IF;
  SELECT numero_desde_oeste INTO v_numero FROM public.puntos_riego WHERE id = OLD.punto_id;
  UPDATE public.ocupaciones_cultivo
    SET retirado_en = clock_timestamp(), numero_al_retirar = v_numero
    WHERE plantacion_id = OLD.plantacion_id AND punto_id = OLD.punto_id AND retirado_en IS NULL;
  UPDATE public.huertos SET version_cuaderno = version_cuaderno + 1 WHERE id = OLD.huerto_id;
  RETURN OLD;
END;
$fn$;
REVOKE ALL ON FUNCTION huerto_privado.registrar_ocupacion() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS ocupacion_alta ON public.plantacion_puntos;
DROP TRIGGER IF EXISTS ocupacion_baja ON public.plantacion_puntos;
CREATE TRIGGER ocupacion_alta AFTER INSERT ON public.plantacion_puntos
  FOR EACH ROW EXECUTE FUNCTION huerto_privado.registrar_ocupacion();
CREATE TRIGGER ocupacion_baja BEFORE DELETE ON public.plantacion_puntos
  FOR EACH ROW EXECUTE FUNCTION huerto_privado.registrar_ocupacion();

-- Situacion ya existente, sin atribuirle una fecha de siembra inventada.
INSERT INTO public.ocupaciones_cultivo
  (huerto_id, plantacion_id, punto_id, fila_id, fila_codigo, numero_al_asignar, cultivo, variedad, inicio_desconocido)
SELECT a.huerto_id, a.plantacion_id, a.punto_id, a.fila_id, f.codigo,
       p.numero_desde_oeste, c.cultivo, c.variedad, true
FROM public.plantacion_puntos a JOIN public.filas f ON f.id = a.fila_id
JOIN public.puntos_riego p ON p.id = a.punto_id JOIN public.plantaciones c ON c.id = a.plantacion_id
WHERE NOT EXISTS (SELECT 1 FROM public.ocupaciones_cultivo o
                  WHERE o.plantacion_id = a.plantacion_id AND o.punto_id = a.punto_id AND o.retirado_en IS NULL);

-- Recupera fechas declaradas SIN inferir los goteros ocupados en esa fecha.
INSERT INTO public.eventos_cultivo
  (huerto_id, plantacion_id, fila_id, fila_codigo, cultivo, variedad, tipo, fecha,
   precision_fecha, notas, origen, clave_importacion)
SELECT c.huerto_id, c.id, c.fila_id, f.codigo, c.cultivo, c.variedad,
       CASE c.tipo_inicio WHEN 'plantacion' THEN 'plantacion' WHEN 'incorporacion' THEN 'incorporacion'
            ELSE 'inicio_no_precisado' END,
       c.fecha_inicio, c.precision_fecha_inicio,
       concat_ws(E'\n', 'Fecha recuperada del lote previo. Los puntos ocupados en esa fecha no se han inferido.', c.detalle_fecha_inicio),
       'migracion_06', 'inicio:' || c.id::text
FROM public.plantaciones c LEFT JOIN public.filas f ON f.id = c.fila_id
WHERE c.fecha_inicio IS NOT NULL AND c.precision_fecha_inicio IN ('exacta','aproximada')
ON CONFLICT (huerto_id, clave_importacion) DO NOTHING;
INSERT INTO public.eventos_cultivo
  (huerto_id, plantacion_id, fila_id, fila_codigo, cultivo, variedad, tipo, fecha,
   precision_fecha, notas, origen, clave_importacion)
SELECT c.huerto_id, c.id, c.fila_id, f.codigo, c.cultivo, c.variedad, 'resiembra',
       c.fecha_ultima_resiembra, c.precision_fecha_resiembra,
       concat_ws(E'\n', 'Resiembra recuperada del lote previo; puntos historicos sin confirmar.', c.detalle_fecha_resiembra),
       'migracion_06', 'resiembra:' || c.id::text
FROM public.plantaciones c LEFT JOIN public.filas f ON f.id = c.fila_id
WHERE c.fecha_ultima_resiembra IS NOT NULL AND c.precision_fecha_resiembra IN ('exacta','aproximada')
ON CONFLICT (huerto_id, clave_importacion) DO NOTHING;

ALTER TABLE public.eventos_cultivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocupaciones_cultivo ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.eventos_cultivo, public.ocupaciones_cultivo FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.eventos_cultivo, public.ocupaciones_cultivo TO authenticated;
DROP POLICY IF EXISTS eventos_lectura ON public.eventos_cultivo;
CREATE POLICY eventos_lectura ON public.eventos_cultivo FOR SELECT TO authenticated
  USING (huerto_privado.tiene_rol(huerto_id, ARRAY['administrador','editor','lector']));
DROP POLICY IF EXISTS ocupaciones_lectura ON public.ocupaciones_cultivo;
CREATE POLICY ocupaciones_lectura ON public.ocupaciones_cultivo FOR SELECT TO authenticated
  USING (huerto_privado.tiene_rol(huerto_id, ARRAY['administrador','editor','lector']));

CREATE OR REPLACE FUNCTION public.editar_puntos_lote(
  p_huerto_id uuid, p_fila_id uuid, p_version integer, p_puntos uuid[], p_modo text,
  p_plantaciones uuid[] DEFAULT ARRAY[]::uuid[], p_cultivo text DEFAULT NULL, p_variedad text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_rol text; v_version integer; v_ids uuid[]; v_nuevo uuid; v_cultivo text; v_variedad text; v_n integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Inicia sesion.'; END IF;
  SELECT rol INTO v_rol FROM public.miembros_huerto
    WHERE huerto_id = p_huerto_id AND usuario_id = auth.uid() FOR SHARE;
  IF v_rol IS NULL OR v_rol NOT IN ('administrador','editor') THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Sin permiso de escritura.';
  END IF;
  IF p_modo IS NULL OR p_modo NOT IN ('agregar','retirar','reemplazar','eliminar_puntos') THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Modo no valido.';
  END IF;
  IF p_modo = 'eliminar_puntos' AND v_rol <> 'administrador' THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Solo el administrador elimina goteros.';
  END IF;
  SELECT version_plano INTO v_version FROM public.filas
    WHERE id = p_fila_id AND huerto_id = p_huerto_id FOR UPDATE;
  IF NOT FOUND OR p_version IS NULL OR v_version <> p_version THEN
    RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='La fila ha cambiado. Actualiza antes de guardar.';
  END IF;
  IF p_puntos IS NULL OR cardinality(p_puntos) NOT BETWEEN 1 AND 1000
     OR coalesce(array_ndims(p_puntos),1) <> 1 OR array_position(p_puntos,NULL) IS NOT NULL
     OR (SELECT count(DISTINCT x) FROM unnest(p_puntos) x) <> cardinality(p_puntos) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Seleccion de goteros no valida.';
  END IF;
  IF (SELECT count(*) FROM public.puntos_riego WHERE huerto_id=p_huerto_id AND fila_id=p_fila_id AND id=ANY(p_puntos))
      <> cardinality(p_puntos) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Todos los puntos deben pertenecer a la misma fila.';
  END IF;
  IF p_plantaciones IS NULL OR cardinality(p_plantaciones)>1000 OR coalesce(array_ndims(p_plantaciones),1)<>1
     OR array_position(p_plantaciones,NULL) IS NOT NULL
     OR (SELECT count(DISTINCT x) FROM unnest(p_plantaciones) x)<>cardinality(p_plantaciones) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Seleccion de cultivos no valida.';
  END IF;
  v_ids := p_plantaciones;
  v_cultivo := nullif(btrim(p_cultivo),''); v_variedad := nullif(btrim(p_variedad),'');
  IF (v_cultivo IS NOT NULL AND (char_length(v_cultivo)>100 OR v_cultivo ~ '[[:cntrl:]]'))
     OR (v_variedad IS NOT NULL AND (char_length(v_variedad)>100 OR v_variedad ~ '[[:cntrl:]]'))
     OR (v_cultivo IS NULL AND v_variedad IS NOT NULL)
     OR (p_modo IN ('retirar','eliminar_puntos') AND v_cultivo IS NOT NULL) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Revisa cultivo, variedad y operacion.';
  END IF;
  PERFORM id FROM public.plantaciones WHERE huerto_id=p_huerto_id AND fila_id=p_fila_id ORDER BY id FOR UPDATE;
  IF (SELECT count(*) FROM public.plantaciones WHERE huerto_id=p_huerto_id AND fila_id=p_fila_id
      AND estado='presente' AND id=ANY(v_ids)) <> cardinality(v_ids) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Los lotes deben estar presentes en esta fila.';
  END IF;
  IF p_modo IN ('agregar','retirar') AND cardinality(v_ids)=0 AND v_cultivo IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Selecciona al menos un cultivo.';
  END IF;
  IF p_modo = 'eliminar_puntos' THEN
    DELETE FROM public.plantacion_puntos WHERE huerto_id=p_huerto_id AND fila_id=p_fila_id AND punto_id=ANY(p_puntos);
    DELETE FROM public.puntos_riego WHERE huerto_id=p_huerto_id AND fila_id=p_fila_id AND id=ANY(p_puntos);
    UPDATE public.puntos_riego SET numero_desde_oeste=numero_desde_oeste+2000
      WHERE huerto_id=p_huerto_id AND fila_id=p_fila_id;
    WITH orden AS (SELECT id, row_number() OVER (ORDER BY numero_desde_oeste) n
                  FROM public.puntos_riego WHERE huerto_id=p_huerto_id AND fila_id=p_fila_id)
    UPDATE public.puntos_riego p SET numero_desde_oeste=o.n FROM orden o WHERE p.id=o.id;
    SELECT count(*) INTO v_n FROM public.puntos_riego WHERE huerto_id=p_huerto_id AND fila_id=p_fila_id;
    UPDATE public.filas SET goteros_previstos=v_n WHERE id=p_fila_id;
  ELSE
    IF v_cultivo IS NOT NULL THEN
      INSERT INTO public.plantaciones(huerto_id,fila_id,cultivo,variedad,estado)
        VALUES(p_huerto_id,p_fila_id,v_cultivo,v_variedad,'presente') RETURNING id INTO v_nuevo;
      v_ids := array_append(v_ids,v_nuevo);
    END IF;
    IF p_modo IN ('retirar','reemplazar') THEN
      DELETE FROM public.plantacion_puntos a USING public.plantaciones c
      WHERE a.huerto_id=p_huerto_id AND a.fila_id=p_fila_id AND a.punto_id=ANY(p_puntos)
        AND c.id=a.plantacion_id AND c.estado='presente'
        AND ((p_modo='retirar' AND a.plantacion_id=ANY(v_ids))
             OR (p_modo='reemplazar' AND NOT(a.plantacion_id=ANY(v_ids))));
    END IF;
    IF p_modo IN ('agregar','reemplazar') THEN
      INSERT INTO public.plantacion_puntos(huerto_id,fila_id,plantacion_id,punto_id)
      SELECT p_huerto_id,p_fila_id,c.id,p.id FROM unnest(v_ids) c(id) CROSS JOIN unnest(p_puntos) p(id)
      ON CONFLICT (plantacion_id,punto_id) DO NOTHING;
    END IF;
  END IF;
  UPDATE public.filas SET version_plano=version_plano+1 WHERE id=p_fila_id RETURNING version_plano INTO v_version;
  RETURN jsonb_build_object('version_plano',v_version,'plantacion_id',v_nuevo,'puntos',cardinality(p_puntos));
END;
$fn$;

CREATE OR REPLACE FUNCTION public.guardar_evento_cultivo(
  p_huerto_id uuid, p_plantacion_id uuid, p_evento_id uuid, p_revision integer,
  p_tipo text, p_fecha date, p_precision text, p_notas text DEFAULT NULL,
  p_puntos uuid[] DEFAULT ARRAY[]::uuid[], p_version_fila integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_rol text; v_fila uuid; v_fila_codigo text; v_version integer; v_lote public.plantaciones%ROWTYPE;
  v_evento public.eventos_cultivo%ROWTYPE; v_puntos jsonb; v_hoy date; v_notas text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Inicia sesion.'; END IF;
  SELECT rol INTO v_rol FROM public.miembros_huerto WHERE huerto_id=p_huerto_id AND usuario_id=auth.uid() FOR SHARE;
  IF v_rol IS NULL OR v_rol NOT IN ('administrador','editor') THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='No tienes permiso para registrar fechas.';
  END IF;
  SELECT (clock_timestamp() AT TIME ZONE zona_horaria)::date INTO v_hoy FROM public.huertos WHERE id=p_huerto_id;
  IF p_evento_id IS NULL OR p_revision IS NULL OR p_revision < -1 OR p_tipo IS NULL
     OR p_tipo NOT IN ('siembra','resiembra','plantacion','cosecha','incorporacion','inicio_no_precisado')
     OR p_fecha IS NULL OR p_fecha < DATE '1900-01-01' OR p_fecha > v_hoy
     OR p_precision IS NULL OR p_precision NOT IN ('exacta','aproximada')
     OR char_length(p_notas)>4000 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Revisa la fecha, el tipo y las notas. Este cuaderno registra hechos, no previsiones futuras.';
  END IF;
  IF p_puntos IS NULL OR cardinality(p_puntos)>1000 OR coalesce(array_ndims(p_puntos),1)<>1
     OR array_position(p_puntos,NULL) IS NOT NULL
     OR (SELECT count(DISTINCT x) FROM unnest(p_puntos) x)<>cardinality(p_puntos) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Lista de puntos no valida.';
  END IF;
  v_notas := nullif(btrim(p_notas),'');
  SELECT fila_id INTO v_fila FROM public.plantaciones WHERE id=p_plantacion_id AND huerto_id=p_huerto_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Lote no disponible.'; END IF;
  -- Mismo orden de bloqueos que las operaciones del plano: fila, lote, evento.
  IF v_fila IS NOT NULL THEN
    SELECT version_plano,codigo INTO v_version,v_fila_codigo FROM public.filas WHERE id=v_fila AND huerto_id=p_huerto_id FOR UPDATE;
  END IF;
  SELECT * INTO v_lote FROM public.plantaciones WHERE id=p_plantacion_id AND huerto_id=p_huerto_id FOR UPDATE;
  IF v_lote.fila_id IS DISTINCT FROM v_fila THEN
    RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='Ha cambiado la ubicacion del lote.';
  END IF;
  SELECT * INTO v_evento FROM public.eventos_cultivo WHERE id=p_evento_id FOR UPDATE;
  IF FOUND THEN
    IF v_evento.huerto_id<>p_huerto_id OR v_evento.plantacion_id<>p_plantacion_id THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Este evento no pertenece a ese lote.';
    END IF;
    -- Reintento de una creacion ya confirmada: nunca genera un duplicado.
    IF p_revision=-1 AND v_evento.tipo=p_tipo AND v_evento.fecha=p_fecha
       AND v_evento.precision_fecha=p_precision AND v_evento.notas IS NOT DISTINCT FROM v_notas
       AND v_evento.anulado_en IS NULL
       AND (SELECT coalesce(array_agg(x.id ORDER BY x.id),ARRAY[]::uuid[])
            FROM jsonb_to_recordset(v_evento.puntos_snapshot) AS x(id uuid,numero integer))
           = (SELECT coalesce(array_agg(x ORDER BY x),ARRAY[]::uuid[]) FROM unnest(p_puntos) x) THEN
      RETURN jsonb_build_object('id',v_evento.id,'revision',v_evento.revision);
    END IF;
    IF p_revision<>v_evento.revision OR v_evento.anulado_en IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='Este evento ha cambiado. Actualiza antes de editarlo.';
    END IF;
    -- Editar fecha/tipo/notas no reescribe la fotografia historica de puntos.
    UPDATE public.eventos_cultivo SET tipo=p_tipo,fecha=p_fecha,precision_fecha=p_precision,notas=v_notas,
      revision=revision+1,actualizado_en=clock_timestamp()
      WHERE id=p_evento_id RETURNING * INTO v_evento;
  ELSE
    IF p_revision<>-1 THEN RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='El evento ya no esta disponible.'; END IF;
    IF cardinality(p_puntos)>0 THEN
      IF v_fila IS NULL OR p_version_fila IS NULL OR v_version<>p_version_fila THEN
        RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='La seleccion de puntos ha cambiado. Actualiza el plano.';
      END IF;
      IF (SELECT count(*) FROM public.plantacion_puntos a JOIN public.puntos_riego p ON p.id=a.punto_id
          WHERE a.huerto_id=p_huerto_id AND a.plantacion_id=p_plantacion_id AND a.fila_id=v_fila
            AND p.id=ANY(p_puntos)) <> cardinality(p_puntos) THEN
        RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Primero asocia este cultivo a todos los puntos seleccionados.';
      END IF;
    END IF;
    SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'numero',p.numero_desde_oeste)
           ORDER BY p.numero_desde_oeste),'[]'::jsonb) INTO v_puntos
      FROM public.puntos_riego p WHERE p.id=ANY(p_puntos) AND p.huerto_id=p_huerto_id AND p.fila_id=v_fila;
    INSERT INTO public.eventos_cultivo
      (id,huerto_id,plantacion_id,fila_id,fila_codigo,cultivo,variedad,tipo,fecha,precision_fecha,puntos_snapshot,notas,creado_por)
    VALUES(p_evento_id,p_huerto_id,p_plantacion_id,v_fila,v_fila_codigo,v_lote.cultivo,v_lote.variedad,
           p_tipo,p_fecha,p_precision,v_puntos,v_notas,auth.uid()) RETURNING * INTO v_evento;
  END IF;
  RETURN jsonb_build_object('id',v_evento.id,'revision',v_evento.revision);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.anular_evento_cultivo(p_huerto_id uuid,p_evento_id uuid,p_revision integer,p_motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE v_rol text; v_evento public.eventos_cultivo%ROWTYPE;
BEGIN
  SELECT rol INTO v_rol FROM public.miembros_huerto WHERE huerto_id=p_huerto_id AND usuario_id=auth.uid() FOR SHARE;
  IF auth.uid() IS NULL OR v_rol IS NULL OR v_rol NOT IN ('administrador','editor') THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='No tienes permiso para anular eventos.';
  END IF;
  IF p_motivo IS NULL OR char_length(btrim(p_motivo)) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Indica el motivo de la anulacion (1 a 500 caracteres).';
  END IF;
  SELECT * INTO v_evento FROM public.eventos_cultivo WHERE id=p_evento_id AND huerto_id=p_huerto_id FOR UPDATE;
  IF NOT FOUND OR p_revision IS NULL OR v_evento.revision<>p_revision OR v_evento.anulado_en IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='El evento ha cambiado. Actualiza antes de anularlo.';
  END IF;
  UPDATE public.eventos_cultivo SET anulado_en=clock_timestamp(),motivo_anulacion=btrim(p_motivo),
    revision=revision+1,actualizado_en=clock_timestamp() WHERE id=p_evento_id RETURNING * INTO v_evento;
  RETURN jsonb_build_object('id',v_evento.id,'revision',v_evento.revision);
END;
$fn$;

ALTER FUNCTION public.editar_puntos_lote(uuid,uuid,integer,uuid[],text,uuid[],text,text) OWNER TO postgres;
ALTER FUNCTION public.guardar_evento_cultivo(uuid,uuid,uuid,integer,text,date,text,text,uuid[],integer) OWNER TO postgres;
ALTER FUNCTION public.anular_evento_cultivo(uuid,uuid,integer,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.editar_puntos_lote(uuid,uuid,integer,uuid[],text,uuid[],text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.guardar_evento_cultivo(uuid,uuid,uuid,integer,text,date,text,text,uuid[],integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.anular_evento_cultivo(uuid,uuid,integer,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.editar_puntos_lote(uuid,uuid,integer,uuid[],text,uuid[],text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.guardar_evento_cultivo(uuid,uuid,uuid,integer,text,date,text,text,uuid[],integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.anular_evento_cultivo(uuid,uuid,integer,text) TO authenticated;

COMMENT ON TABLE public.eventos_cultivo IS 'Fechas declaradas, conservando precision. Una cosecha no finaliza ni retira automaticamente el cultivo.';
COMMENT ON TABLE public.ocupaciones_cultivo IS 'Registro de asociaciones, no de germinacion ni de cantidad. Inicio desconocido para la situacion anterior al parche.';

-- La funcion antigua se actualiza debajo para evitar retiradas/altas ficticias
-- al guardar una seleccion de cultivos que no ha cambiado.
CREATE OR REPLACE FUNCTION public.editar_plano(
  p_huerto_id uuid,
  p_fila_id uuid,
  p_version integer,
  p_operacion text,
  p_punto_id uuid DEFAULT NULL,
  p_posicion integer DEFAULT NULL,
  p_plantacion_ids uuid[] DEFAULT NULL,
  p_cultivo text DEFAULT NULL,
  p_variedad text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $editar$
DECLARE
  v_usuario uuid := auth.uid();
  v_rol text;
  v_version integer;
  v_n integer;
  v_min integer;
  v_max integer;
  v_posicion integer;
  v_desplazamiento integer;
  v_punto uuid;
  v_plantacion_nueva uuid;
  v_ids uuid[];
  v_ids_validos integer;
  v_cultivo text;
  v_variedad text;
  v_resultado jsonb;
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Inicia sesión para editar el plano.';
  END IF;

  IF p_operacion IS NULL OR p_operacion NOT IN ('anadir_punto','eliminar_punto','asignar_cultivos') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'La operación solicitada no es válida.';
  END IF;

  -- Se comprueba la membresía de la identidad verificada por Auth. El llamante
  -- no puede indicar otro usuario ni aprovechar el rol propietario de la función.
  SELECT m.rol INTO v_rol
  FROM public.miembros_huerto AS m
  WHERE m.huerto_id = p_huerto_id AND m.usuario_id = v_usuario
  FOR SHARE;
  IF NOT FOUND OR v_rol NOT IN ('administrador','editor') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No tienes permiso para editar este plano.';
  END IF;
  IF p_operacion IN ('anadir_punto','eliminar_punto') AND v_rol <> 'administrador' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Solo el administrador puede añadir o eliminar puntos de riego.';
  END IF;

  SELECT f.version_plano INTO v_version
  FROM public.filas AS f
  WHERE f.huerto_id = p_huerto_id AND f.id = p_fila_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'La fila seleccionada no pertenece a este huerto.';
  END IF;
  IF p_version IS NULL OR p_version < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Falta una versión válida del plano. Recarga la página.';
  END IF;
  IF p_version <> v_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'El plano ha cambiado desde que lo abriste. Recarga la fila antes de guardar.';
  END IF;

  SELECT count(*)::integer, min(p.numero_desde_oeste), max(p.numero_desde_oeste)
    INTO v_n, v_min, v_max
  FROM public.puntos_riego AS p
  WHERE p.huerto_id = p_huerto_id AND p.fila_id = p_fila_id;
  IF v_n > 1000 OR (v_n > 0 AND (v_min <> 1 OR v_max <> v_n)) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'La numeración de esta fila necesita revisión antes de editarla.';
  END IF;

  IF p_operacion = 'anadir_punto' THEN
    IF v_n >= 1000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'La fila ya tiene el máximo de 1000 puntos.';
    END IF;
    IF p_posicion IS NULL OR p_posicion < 1 OR p_posicion > v_n + 1 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Selecciona una posición válida desde el oeste.';
    END IF;

    -- Dos desplazamientos positivos evitan colisiones con la restricción única
    -- inmediata. Los números temporales están siempre por debajo de 2002.
    v_desplazamiento := v_n + 1;
    UPDATE public.puntos_riego
      SET numero_desde_oeste = numero_desde_oeste + v_desplazamiento
      WHERE huerto_id = p_huerto_id AND fila_id = p_fila_id
        AND numero_desde_oeste >= p_posicion;
    UPDATE public.puntos_riego
      SET numero_desde_oeste = numero_desde_oeste - v_desplazamiento + 1
      WHERE huerto_id = p_huerto_id AND fila_id = p_fila_id
        AND numero_desde_oeste > v_n;

    INSERT INTO public.puntos_riego (huerto_id, fila_id, numero_desde_oeste)
      VALUES (p_huerto_id, p_fila_id, p_posicion)
      RETURNING id INTO v_punto;
    UPDATE public.filas SET goteros_previstos = v_n + 1
      WHERE huerto_id = p_huerto_id AND id = p_fila_id;

  ELSE
    SELECT p.id, p.numero_desde_oeste INTO v_punto, v_posicion
    FROM public.puntos_riego AS p
    WHERE p.huerto_id = p_huerto_id AND p.fila_id = p_fila_id AND p.id = p_punto_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'El punto seleccionado no pertenece a esta fila o ya no existe.';
    END IF;

    IF p_operacion = 'eliminar_punto' THEN
      -- Los triggers conservan las ocupaciones historicas antes de retirar las asociaciones.
      -- Los lotes, sus notas y sus restantes ubicaciones se conservan.
      DELETE FROM public.plantacion_puntos
        WHERE huerto_id = p_huerto_id AND fila_id = p_fila_id AND punto_id = v_punto;
      DELETE FROM public.puntos_riego
        WHERE huerto_id = p_huerto_id AND fila_id = p_fila_id AND id = v_punto;

      v_desplazamiento := v_n + 1;
      UPDATE public.puntos_riego
        SET numero_desde_oeste = numero_desde_oeste + v_desplazamiento
        WHERE huerto_id = p_huerto_id AND fila_id = p_fila_id
          AND numero_desde_oeste > v_posicion;
      UPDATE public.puntos_riego
        SET numero_desde_oeste = numero_desde_oeste - v_desplazamiento - 1
        WHERE huerto_id = p_huerto_id AND fila_id = p_fila_id
          AND numero_desde_oeste > v_n;
      UPDATE public.filas SET goteros_previstos = v_n - 1
        WHERE huerto_id = p_huerto_id AND id = p_fila_id;

    ELSE
      -- NULL no significa "vaciar". Para vaciar las asignaciones presentes,
      -- el cliente debe enviar explícitamente un array vacío de UUID.
      IF p_plantacion_ids IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Indica la selección de cultivos; usa una lista vacía para retirar los presentes.';
      END IF;
      IF coalesce(array_ndims(p_plantacion_ids), 1) <> 1 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'La selección de cultivos debe ser una lista simple.';
      END IF;
      IF array_position(p_plantacion_ids, NULL) IS NOT NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'La selección de cultivos contiene un identificador vacío.';
      END IF;
      IF cardinality(p_plantacion_ids) > 1000 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'La selección admite como máximo 1000 cultivos.';
      END IF;

      SELECT coalesce(array_agg(DISTINCT u.id), ARRAY[]::uuid[])
        INTO v_ids FROM unnest(p_plantacion_ids) AS u(id);
      IF cardinality(v_ids) <> cardinality(p_plantacion_ids) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'La selección contiene cultivos repetidos.';
      END IF;

      -- Bloquea lotes seleccionados y lotes actualmente vinculados al punto.
      -- Así, un cambio concurrente de estado no borra una ubicación histórica.
      PERFORM c.id FROM public.plantaciones AS c
      WHERE c.huerto_id = p_huerto_id AND c.fila_id = p_fila_id
        AND (c.id = ANY (v_ids) OR EXISTS (
          SELECT 1 FROM public.plantacion_puntos AS a
          WHERE a.huerto_id = p_huerto_id AND a.fila_id = p_fila_id
            AND a.punto_id = v_punto AND a.plantacion_id = c.id
        ))
      ORDER BY c.id
      FOR UPDATE;

      SELECT count(*)::integer INTO v_ids_validos
      FROM public.plantaciones AS c
      WHERE c.huerto_id = p_huerto_id AND c.fila_id = p_fila_id
        AND c.estado = 'presente' AND c.id = ANY (v_ids);
      IF v_ids_validos <> cardinality(v_ids) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Todos los cultivos seleccionados deben estar presentes en esta misma fila y huerto.';
      END IF;

      v_cultivo := CASE WHEN p_cultivo IS NULL THEN NULL ELSE btrim(p_cultivo) END;
      v_variedad := nullif(btrim(p_variedad), '');
      IF p_cultivo IS NOT NULL AND (
        char_length(v_cultivo) NOT BETWEEN 1 AND 100 OR p_cultivo ~ '[[:cntrl:]]'
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'El nombre del nuevo cultivo debe tener entre 1 y 100 caracteres y ocupar una sola línea.';
      END IF;
      IF v_variedad IS NOT NULL AND (
        char_length(v_variedad) > 100 OR p_variedad ~ '[[:cntrl:]]'
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'La variedad admite como máximo 100 caracteres y debe ocupar una sola línea.';
      END IF;
      IF p_cultivo IS NULL AND v_variedad IS NOT NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Indica el cultivo al añadir una variedad nueva.';
      END IF;
      -- PostgreSQL no admite NUL en valores text: lo rechaza antes de ejecutar
      -- la función. No se sustituye ni trunca ese carácter silenciosamente.

      IF v_cultivo IS NOT NULL THEN
        INSERT INTO public.plantaciones (huerto_id, fila_id, cultivo, variedad, estado)
          VALUES (p_huerto_id, p_fila_id, v_cultivo, v_variedad, 'presente')
          RETURNING id INTO v_plantacion_nueva;
        v_ids := array_append(v_ids, v_plantacion_nueva);
        -- Los valores por defecto conservan cantidad, fechas y código de
        -- origen desconocidos. creado_en es solo la fecha del registro.
      END IF;

      DELETE FROM public.plantacion_puntos AS a
      USING public.plantaciones AS c
      WHERE a.huerto_id = p_huerto_id AND a.fila_id = p_fila_id
        AND a.punto_id = v_punto AND a.plantacion_id = c.id
        AND c.huerto_id = p_huerto_id AND c.fila_id = p_fila_id
        AND c.estado = 'presente' AND NOT (a.plantacion_id = ANY (v_ids));

      INSERT INTO public.plantacion_puntos (huerto_id, fila_id, plantacion_id, punto_id)
      SELECT p_huerto_id, p_fila_id, u.id, v_punto
      FROM unnest(v_ids) AS u(id)
      ON CONFLICT (plantacion_id, punto_id) DO NOTHING;
    END IF;
  END IF;

  UPDATE public.filas SET version_plano = version_plano + 1
    WHERE huerto_id = p_huerto_id AND id = p_fila_id
    RETURNING version_plano INTO v_version;
  v_resultado := jsonb_build_object('version_plano', v_version, 'punto_id', v_punto);
  IF v_plantacion_nueva IS NOT NULL THEN
    v_resultado := v_resultado || jsonb_build_object('plantacion_id', v_plantacion_nueva);
  END IF;
  RETURN v_resultado;
END;
$editar$;


NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT 'Parche 0.4.0 aplicado. Ejecuta 07_comprobar_cuaderno.sql.' AS resultado;
