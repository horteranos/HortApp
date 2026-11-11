-- HUERTO ALBORAYA | Comprobación de 04_gestion_plano.sql | Solo lectura
-- Ejecutar en SQL Editor con el rol postgres después de la actualización 04.
-- Los 13 resultados deben indicar OK. Los conteos no se fijan en 109:
-- añadir y eliminar puntos cambia legítimamente el tamaño del plano.

WITH objetivo AS (
  SELECT id FROM public.huertos WHERE codigo = 'huerto-alboraya'
), funcion AS (
  SELECT p.* FROM pg_catalog.pg_proc AS p
  WHERE p.oid = to_regprocedure('public.editar_plano(uuid,uuid,integer,text,uuid,integer,uuid[],text,text)')
), conteos AS (
  SELECT f.id, f.goteros_previstos, f.version_plano,
    count(p.id)::integer AS puntos,
    min(p.numero_desde_oeste) AS primero,
    max(p.numero_desde_oeste) AS ultimo,
    count(DISTINCT p.numero_desde_oeste)::integer AS distintos
  FROM public.filas AS f
  JOIN objetivo AS h ON h.id = f.huerto_id
  LEFT JOIN public.puntos_riego AS p ON p.huerto_id = f.huerto_id AND p.fila_id = f.id
  GROUP BY f.id, f.goteros_previstos, f.version_plano
), comprobaciones AS (
  SELECT 1 AS orden, 'Huerto y seis filas disponibles' AS comprobacion,
    (SELECT count(*) FROM objetivo) = 1 AND (SELECT count(*) FROM conteos) = 6 AS correcto
  UNION ALL
  SELECT 2, 'Versiones del plano no negativas',
    NOT EXISTS (SELECT 1 FROM conteos WHERE version_plano IS NULL OR version_plano < 0)
  UNION ALL
  SELECT 3, 'Función de edición instalada con la firma prevista', EXISTS (SELECT 1 FROM funcion)
  UNION ALL
  SELECT 4, 'Función con propietario postgres y permisos controlados',
    coalesce((SELECT prosecdef AND pg_catalog.pg_get_userbyid(proowner) = 'postgres' FROM funcion), false)
  UNION ALL
  SELECT 5, 'Función con search_path vacío',
    coalesce((SELECT EXISTS (
      SELECT 1 FROM unnest(proconfig) AS c(config)
      WHERE config IN ('search_path=', 'search_path=""')
    ) FROM funcion), false)
  UNION ALL
  SELECT 6, 'Ejecución permitida a sesiones autenticadas',
    coalesce((SELECT has_function_privilege('authenticated', oid, 'EXECUTE') FROM funcion), false)
  UNION ALL
  SELECT 7, 'Ejecución denegada a anónimos y PUBLIC',
    coalesce((SELECT NOT has_function_privilege('anon', f.oid, 'EXECUTE') AND NOT EXISTS (
      SELECT 1 FROM aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) AS a
      WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
    ) FROM funcion AS f), false)
  UNION ALL
  SELECT 8, 'RLS activo en las seis tablas',
    (SELECT count(*) = 6 AND bool_and(c.relrowsecurity)
      FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN
        ('huertos','miembros_huerto','filas','puntos_riego','plantaciones','plantacion_puntos'))
  UNION ALL
  SELECT 9, 'Puntos protegidos frente a escritura directa de authenticated',
    NOT has_table_privilege('authenticated', 'public.puntos_riego', 'INSERT,UPDATE,DELETE')
    AND NOT has_any_column_privilege('authenticated', 'public.puntos_riego', 'INSERT,UPDATE')
  UNION ALL
  SELECT 10, 'Asociaciones se modifican mediante la función controlada',
    NOT has_table_privilege('authenticated', 'public.plantacion_puntos', 'INSERT,UPDATE,DELETE')
    AND NOT has_any_column_privilege('authenticated', 'public.plantacion_puntos', 'INSERT,UPDATE')
  UNION ALL
  SELECT 11, 'Conteos de goteros coherentes y numeración continua',
    NOT EXISTS (SELECT 1 FROM conteos WHERE puntos <> goteros_previstos OR distintos <> puntos
      OR (puntos > 0 AND (primero <> 1 OR ultimo <> puntos)))
  UNION ALL
  SELECT 12, 'Administrador del huerto conservado',
    EXISTS (SELECT 1 FROM public.miembros_huerto AS m JOIN objetivo AS h ON h.id = m.huerto_id
      WHERE m.rol = 'administrador')
  UNION ALL
  SELECT 13, 'Lotes protegidos: lectura y edición directa solo de notas',
    has_table_privilege('authenticated', 'public.plantaciones', 'SELECT')
    AND has_column_privilege('authenticated', 'public.plantaciones', 'notas', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.plantaciones', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    AND NOT has_any_column_privilege('authenticated', 'public.plantaciones', 'INSERT,REFERENCES')
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute AS a
      WHERE a.attrelid = 'public.plantaciones'::regclass
        AND a.attnum > 0 AND NOT a.attisdropped AND a.attname <> 'notas'
        AND has_column_privilege('authenticated', 'public.plantaciones', a.attnum, 'UPDATE')
    )
    AND NOT has_table_privilege('anon', 'public.plantaciones', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    AND NOT has_any_column_privilege('anon', 'public.plantaciones', 'INSERT,UPDATE,REFERENCES')
)
SELECT comprobacion, CASE WHEN correcto THEN 'OK' ELSE 'REVISAR' END AS resultado
FROM comprobaciones ORDER BY orden;
