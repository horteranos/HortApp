-- HUERTO ALBORAYA | Edición del plano | Migración 04
-- Ejecuta TODO el archivo en SQL Editor con el rol postgres.
-- Es reutilizable: no borra ni vuelve a cargar cultivos, puntos o membresías.
-- Los puntos conservan su UUID aunque cambie su número desde el oeste.

BEGIN;

DO $requisitos$
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Ejecuta esta migración desde SQL Editor con el rol postgres.';
  END IF;
  IF to_regclass('public.filas') IS NULL
     OR to_regclass('public.puntos_riego') IS NULL
     OR to_regclass('public.plantaciones') IS NULL
     OR to_regclass('public.plantacion_puntos') IS NULL
     OR to_regclass('public.miembros_huerto') IS NULL THEN
    RAISE EXCEPTION 'Falta la base de Huerto Alboraya. Comprueba el proyecto y la instalación de la Etapa 2.2.';
  END IF;
END;
$requisitos$;

ALTER TABLE public.filas
  ADD COLUMN IF NOT EXISTS version_plano integer NOT NULL DEFAULT 0;

DO $version$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.filas'::regclass
      AND attname = 'version_plano'
      AND atttypid = 'integer'::regtype
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'La columna version_plano ya existe con un tipo diferente. No se ha cambiado ningún dato.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.filas'::regclass
      AND conname = 'filas_version_plano_check'
  ) THEN
    ALTER TABLE public.filas ADD CONSTRAINT filas_version_plano_check
      CHECK (version_plano >= 0);
  END IF;
END;
$version$;

ALTER TABLE public.filas ALTER COLUMN version_plano SET DEFAULT 0;
ALTER TABLE public.filas ALTER COLUMN version_plano SET NOT NULL;
ALTER TABLE public.filas DROP CONSTRAINT IF EXISTS filas_goteros_previstos_check;
ALTER TABLE public.filas ADD CONSTRAINT filas_goteros_previstos_check
  CHECK (goteros_previstos BETWEEN 0 AND 1000);

COMMENT ON COLUMN public.filas.version_plano IS
  'Control de concurrencia: cada edición correcta del plano incrementa esta versión. No es una fecha ni un número de puntos.';

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
      -- Se elimina el punto con todas sus asociaciones, también históricas.
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
        AND c.estado = 'presente';

      INSERT INTO public.plantacion_puntos (huerto_id, fila_id, plantacion_id, punto_id)
      SELECT p_huerto_id, p_fila_id, u.id, v_punto
      FROM unnest(v_ids) AS u(id);
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

ALTER FUNCTION public.editar_plano(uuid, uuid, integer, text, uuid, integer, uuid[], text, text)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.editar_plano(uuid, uuid, integer, text, uuid, integer, uuid[], text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.editar_plano(uuid, uuid, integer, text, uuid, integer, uuid[], text, text)
  TO authenticated;

-- Las escrituras del plano pasan por una única operación atómica y versionada.
-- Se mantienen las políticas RLS y los permisos de lectura existentes.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.plantacion_puntos, public.filas, public.puntos_riego
  FROM PUBLIC, anon, authenticated;

-- Un DELETE directo de un lote eliminaría asociaciones por cascada sin pasar
-- por la versión del plano. Cambiar su fila o estado tendría el mismo problema.
-- La pantalla actual solo edita notas: los nuevos lotes se crean mediante RPC.
-- REVOKE de tabla no retira los grants por columna de la instalación 01;
-- por eso también se revocan explícitamente todas las columnas existentes.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.plantaciones FROM PUBLIC, anon, authenticated;
DO $permisos_lotes$
DECLARE
  columnas text;
BEGIN
  SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY a.attnum) INTO columnas
  FROM pg_catalog.pg_attribute AS a
  WHERE a.attrelid = 'public.plantaciones'::regclass
    AND a.attnum > 0 AND NOT a.attisdropped;

  EXECUTE format(
    'REVOKE INSERT (%1$s), UPDATE (%1$s), REFERENCES (%1$s) ON TABLE public.plantaciones FROM PUBLIC, anon, authenticated',
    columnas
  );
END;
$permisos_lotes$;
GRANT UPDATE (notas) ON public.plantaciones TO authenticated;

COMMENT ON FUNCTION public.editar_plano(uuid, uuid, integer, text, uuid, integer, uuid[], text, text) IS
  'Edición atómica y versionada. Administrador: añadir/eliminar puntos. Administrador/editor: asignar lotes presentes, preservando asociaciones históricas. Posiciones desde el oeste.';

NOTIFY pgrst, 'reload schema';
COMMIT;

SELECT 'Gestión del plano disponible. Los datos existentes se han conservado.' AS resultado,
  (SELECT count(*) FROM public.puntos_riego) AS puntos_actuales,
  (SELECT count(*) FROM public.plantaciones) AS lotes_actuales,
  (SELECT count(*) FROM public.plantacion_puntos) AS asociaciones_actuales;
