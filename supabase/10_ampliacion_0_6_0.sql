-- SISTEMA MONITORIZACION 0.6.0. Solo ejecutar tras migracion 08 / comprobacion 09.
-- Aditiva, repetible. No reinicia goteros, plantaciones, eventos ni notas.
BEGIN;
DO $$ BEGIN
 IF current_user <> 'postgres' THEN RAISE EXCEPTION 'Ejecuta como postgres.'; END IF;
 IF to_regclass('public.monitor_diario') IS NULL OR to_regclass('public.eventos_cultivo') IS NULL
 THEN RAISE EXCEPTION 'Debes completar primero las migraciones 06 y 08. No se ha cambiado nada.'; END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.sm_tareas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), huerto_id uuid NOT NULL REFERENCES public.huertos(id) ON DELETE CASCADE,
 titulo text NOT NULL CHECK (length(btrim(titulo)) BETWEEN 2 AND 160),
 descripcion text NOT NULL DEFAULT '' CHECK (length(descripcion)<=2000),
 fecha date NOT NULL CHECK (fecha BETWEEN '2000-01-01' AND '2100-12-31'),
 hora time, prioridad text NOT NULL DEFAULT 'normal' CHECK (prioridad IN ('baja','normal','alta')),
 estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','hecha','cancelada')),
 fila_id uuid REFERENCES public.filas(id), plantacion_id uuid REFERENCES public.plantaciones(id),
 creada_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 revision integer NOT NULL DEFAULT 0,
 creada_en timestamptz NOT NULL DEFAULT now(), actualizada_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sm_tareas_agenda ON public.sm_tareas(huerto_id,fecha,estado);
CREATE TABLE IF NOT EXISTS public.sm_semillero (
 huerto_id uuid NOT NULL REFERENCES public.huertos(id) ON DELETE CASCADE,
 plaza smallint NOT NULL CHECK (plaza BETWEEN 1 AND 20),
 cultivo text NOT NULL CHECK (length(btrim(cultivo)) BETWEEN 1 AND 100),
 variedad text NOT NULL DEFAULT '' CHECK (length(variedad)<=100),
 fecha_siembra date, fecha_prevista date,
 estado text NOT NULL DEFAULT 'sembrado' CHECK (estado IN ('sembrado','germinando','listo','trasplantado','descartado')),
 observaciones text NOT NULL DEFAULT '' CHECK (length(observaciones)<=1500),
 revision integer NOT NULL DEFAULT 0, actualizado_en timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(huerto_id,plaza),
 CHECK (fecha_prevista IS NULL OR fecha_siembra IS NULL OR fecha_prevista>=fecha_siembra)
);
CREATE TABLE IF NOT EXISTS public.sm_recuentos (
 plantacion_id uuid PRIMARY KEY REFERENCES public.plantaciones(id) ON DELETE CASCADE,
 huerto_id uuid NOT NULL REFERENCES public.huertos(id) ON DELETE CASCADE,
 plantas_actuales integer NOT NULL CHECK (plantas_actuales BETWEEN 0 AND 100000),
 fecha date NOT NULL CHECK (fecha BETWEEN '2000-01-01' AND '2100-12-31'),
 observaciones text NOT NULL DEFAULT '' CHECK (length(observaciones)<=1000),
 revision integer NOT NULL DEFAULT 0, actualizado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sm_recuentos_huerto ON public.sm_recuentos(huerto_id);
CREATE TABLE IF NOT EXISTS public.sm_diario_medios (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 huerto_id uuid NOT NULL REFERENCES public.huertos(id) ON DELETE CASCADE,
 entrada_id uuid NOT NULL REFERENCES public.monitor_diario(id),
 ruta text NOT NULL UNIQUE CHECK (length(ruta)<=350),
 nombre text NOT NULL CHECK (length(nombre) BETWEEN 1 AND 180),
 mime text NOT NULL CHECK (mime IN ('image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime')),
 tamano bigint NOT NULL CHECK (tamano BETWEEN 1 AND 52428800),
 subido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL, creado_en timestamptz NOT NULL DEFAULT now(),
 CHECK (split_part(ruta,'/',1)=huerto_id::text AND split_part(ruta,'/',2)=entrada_id::text)
);
CREATE INDEX IF NOT EXISTS sm_diario_medios_entrada ON public.sm_diario_medios(entrada_id,creado_en);

DO $policy$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['sm_tareas','sm_semillero','sm_recuentos','sm_diario_medios'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
  EXECUTE format('DROP POLICY IF EXISTS sm_leer ON public.%I',t);
  EXECUTE format('DROP POLICY IF EXISTS sm_insertar ON public.%I',t);
  EXECUTE format('DROP POLICY IF EXISTS sm_actualizar ON public.%I',t);
  EXECUTE format('DROP POLICY IF EXISTS sm_borrar ON public.%I',t);
  EXECUTE format('CREATE POLICY sm_leer ON public.%I FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.miembros_huerto m WHERE m.huerto_id=%I.huerto_id AND m.usuario_id=(select auth.uid())))',t,t);
  EXECUTE format('CREATE POLICY sm_insertar ON public.%I FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM public.miembros_huerto m WHERE m.huerto_id=%I.huerto_id AND m.usuario_id=(select auth.uid()) AND m.rol IN (''administrador'',''editor'')))',t,t);
  EXECUTE format('CREATE POLICY sm_actualizar ON public.%I FOR UPDATE TO authenticated USING (EXISTS(SELECT 1 FROM public.miembros_huerto m WHERE m.huerto_id=%I.huerto_id AND m.usuario_id=(select auth.uid()) AND m.rol IN (''administrador'',''editor''))) WITH CHECK (EXISTS(SELECT 1 FROM public.miembros_huerto m WHERE m.huerto_id=%I.huerto_id AND m.usuario_id=(select auth.uid()) AND m.rol IN (''administrador'',''editor'')))',t,t,t);
  EXECUTE format('CREATE POLICY sm_borrar ON public.%I FOR DELETE TO authenticated USING (EXISTS(SELECT 1 FROM public.miembros_huerto m WHERE m.huerto_id=%I.huerto_id AND m.usuario_id=(select auth.uid()) AND m.rol IN (''administrador'',''editor'')))',t,t);
 END LOOP;
END $policy$;
-- Restricciones adicionales: asociaciones siempre dentro del mismo huerto.
DROP POLICY IF EXISTS sm_insertar ON public.sm_recuentos;
CREATE POLICY sm_insertar ON public.sm_recuentos FOR INSERT TO authenticated WITH CHECK(
 EXISTS(SELECT 1 FROM public.miembros_huerto m WHERE m.huerto_id=sm_recuentos.huerto_id AND m.usuario_id=(select auth.uid()) AND m.rol IN ('administrador','editor'))
 AND EXISTS(SELECT 1 FROM public.plantaciones p WHERE p.id=sm_recuentos.plantacion_id AND p.huerto_id=sm_recuentos.huerto_id));
DROP POLICY IF EXISTS sm_actualizar ON public.sm_recuentos;
CREATE POLICY sm_actualizar ON public.sm_recuentos FOR UPDATE TO authenticated USING (
 EXISTS(SELECT 1 FROM public.miembros_huerto m WHERE m.huerto_id=sm_recuentos.huerto_id AND m.usuario_id=(select auth.uid()) AND m.rol IN ('administrador','editor'))
 ) WITH CHECK (
 EXISTS(SELECT 1 FROM public.miembros_huerto m WHERE m.huerto_id=sm_recuentos.huerto_id AND m.usuario_id=(select auth.uid()) AND m.rol IN ('administrador','editor'))
 AND EXISTS(SELECT 1 FROM public.plantaciones p WHERE p.id=sm_recuentos.plantacion_id AND p.huerto_id=sm_recuentos.huerto_id));
DROP POLICY IF EXISTS sm_insertar ON public.sm_tareas;
CREATE POLICY sm_insertar ON public.sm_tareas FOR INSERT TO authenticated WITH CHECK (
 EXISTS(SELECT 1 FROM public.miembros_huerto m WHERE m.huerto_id=sm_tareas.huerto_id AND m.usuario_id=(select auth.uid()) AND m.rol IN ('administrador','editor'))
 AND (sm_tareas.fila_id IS NULL OR EXISTS (SELECT 1 FROM public.filas f WHERE f.id=sm_tareas.fila_id AND f.huerto_id=sm_tareas.huerto_id))
 AND (sm_tareas.plantacion_id IS NULL OR EXISTS (SELECT 1 FROM public.plantaciones p WHERE p.id=sm_tareas.plantacion_id AND p.huerto_id=sm_tareas.huerto_id)));
DROP POLICY IF EXISTS sm_actualizar ON public.sm_tareas;
CREATE POLICY sm_actualizar ON public.sm_tareas FOR UPDATE TO authenticated USING (
 EXISTS(SELECT 1 FROM public.miembros_huerto m WHERE m.huerto_id=sm_tareas.huerto_id AND m.usuario_id=(select auth.uid()) AND m.rol IN ('administrador','editor'))
 ) WITH CHECK (
 EXISTS(SELECT 1 FROM public.miembros_huerto m WHERE m.huerto_id=sm_tareas.huerto_id AND m.usuario_id=(select auth.uid()) AND m.rol IN ('administrador','editor'))
 AND (sm_tareas.fila_id IS NULL OR EXISTS (SELECT 1 FROM public.filas f WHERE f.id=sm_tareas.fila_id AND f.huerto_id=sm_tareas.huerto_id))
 AND (sm_tareas.plantacion_id IS NULL OR EXISTS (SELECT 1 FROM public.plantaciones p WHERE p.id=sm_tareas.plantacion_id AND p.huerto_id=sm_tareas.huerto_id)));
DROP POLICY IF EXISTS sm_insertar ON public.sm_diario_medios;
CREATE POLICY sm_insertar ON public.sm_diario_medios FOR INSERT TO authenticated WITH CHECK (
 EXISTS(SELECT 1 FROM public.miembros_huerto m WHERE m.huerto_id=sm_diario_medios.huerto_id AND m.usuario_id=(select auth.uid()) AND m.rol IN ('administrador','editor'))
 AND EXISTS(SELECT 1 FROM public.monitor_diario d WHERE d.id=sm_diario_medios.entrada_id AND d.huerto_id=sm_diario_medios.huerto_id AND d.anulado_en IS NULL
   AND (d.creado_por=(select auth.uid()) OR EXISTS(SELECT 1 FROM public.miembros_huerto m WHERE m.huerto_id=sm_diario_medios.huerto_id AND m.usuario_id=(select auth.uid()) AND m.rol='administrador'))));
DROP POLICY IF EXISTS sm_actualizar ON public.sm_diario_medios;
DROP POLICY IF EXISTS sm_borrar ON public.sm_diario_medios;
CREATE POLICY sm_borrar ON public.sm_diario_medios FOR DELETE TO authenticated USING (
 EXISTS(SELECT 1 FROM public.miembros_huerto m WHERE m.huerto_id=sm_diario_medios.huerto_id AND m.usuario_id=(select auth.uid()) AND m.rol='administrador')
 OR EXISTS(SELECT 1 FROM public.monitor_diario d WHERE d.id=sm_diario_medios.entrada_id AND d.huerto_id=sm_diario_medios.huerto_id AND d.creado_por=(select auth.uid())));

-- Un contenedor PRIVADO; nunca publicar fotos o vídeos mediante enlaces permanentes abiertos.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('sm-diario','sm-diario',false,52428800,ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
 ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS sm_storage_leer ON storage.objects;
DROP POLICY IF EXISTS sm_storage_insertar ON storage.objects;
DROP POLICY IF EXISTS sm_storage_borrar ON storage.objects;
CREATE POLICY sm_storage_leer ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id='sm-diario' AND EXISTS(SELECT 1 FROM public.miembros_huerto m WHERE m.huerto_id::text=(storage.foldername(name))[1] AND m.usuario_id=(select auth.uid())));
CREATE POLICY sm_storage_insertar ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id='sm-diario' AND EXISTS (
 SELECT 1 FROM public.monitor_diario d JOIN public.miembros_huerto m ON m.huerto_id=d.huerto_id
 WHERE d.huerto_id::text=(storage.foldername(name))[1] AND d.id::text=(storage.foldername(name))[2]
  AND d.anulado_en IS NULL AND m.usuario_id=(select auth.uid()) AND m.rol IN ('administrador','editor')
  AND (d.creado_por=(select auth.uid()) OR m.rol='administrador')));
CREATE POLICY sm_storage_borrar ON storage.objects FOR DELETE TO authenticated USING (
 bucket_id='sm-diario' AND EXISTS (
 SELECT 1 FROM public.monitor_diario d JOIN public.miembros_huerto m ON m.huerto_id=d.huerto_id
 WHERE d.huerto_id::text=(storage.foldername(name))[1] AND d.id::text=(storage.foldername(name))[2]
  AND m.usuario_id=(select auth.uid()) AND (d.creado_por=(select auth.uid()) OR m.rol='administrador')));
NOTIFY pgrst,'reload schema';
COMMIT;
SELECT 'Migracion 10 aplicada. Ejecuta 11_comprobar_ampliacion.sql.' AS resultado;
