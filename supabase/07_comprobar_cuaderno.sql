-- Solo lectura. Ejecutar tras 06 como postgres. No cambia datos ni crea usuarios.
WITH comprobaciones(orden,comprobacion,ok) AS (
  VALUES
  (1,'Tabla de eventos disponible',to_regclass('public.eventos_cultivo') IS NOT NULL),
  (2,'Tabla de ocupaciones disponible',to_regclass('public.ocupaciones_cultivo') IS NOT NULL),
  (3,'Revisiones privadas disponibles',to_regclass('huerto_privado.revisiones_eventos') IS NOT NULL),
  (4,'RLS de eventos activo',(SELECT relrowsecurity FROM pg_class WHERE oid='public.eventos_cultivo'::regclass)),
  (5,'RLS de ocupaciones activo',(SELECT relrowsecurity FROM pg_class WHERE oid='public.ocupaciones_cultivo'::regclass)),
  (6,'Lectura autenticada disponible',has_table_privilege('authenticated','public.eventos_cultivo','SELECT') AND has_table_privilege('authenticated','public.ocupaciones_cultivo','SELECT')),
  (7,'Escritura directa de eventos bloqueada',NOT has_table_privilege('authenticated','public.eventos_cultivo','INSERT,UPDATE,DELETE')),
  (8,'Escritura directa de ocupaciones bloqueada',NOT has_table_privilege('authenticated','public.ocupaciones_cultivo','INSERT,UPDATE,DELETE')),
  (9,'Acceso anonimo bloqueado',NOT has_table_privilege('anon','public.eventos_cultivo','SELECT,INSERT,UPDATE,DELETE')),
  (10,'Funcion de seleccion multiple disponible',to_regprocedure('public.editar_puntos_lote(uuid,uuid,integer,uuid[],text,uuid[],text,text)') IS NOT NULL),
  (11,'Funcion de fechas disponible',to_regprocedure('public.guardar_evento_cultivo(uuid,uuid,uuid,integer,text,date,text,text,uuid[],integer)') IS NOT NULL),
  (12,'Funcion de anulacion disponible',to_regprocedure('public.anular_evento_cultivo(uuid,uuid,integer,text)') IS NOT NULL),
  (13,'Funciones no ejecutables por anon',NOT has_function_privilege('anon','public.editar_puntos_lote(uuid,uuid,integer,uuid[],text,uuid[],text,text)','EXECUTE') AND NOT has_function_privilege('anon','public.guardar_evento_cultivo(uuid,uuid,uuid,integer,text,date,text,text,uuid[],integer)','EXECUTE') AND NOT has_function_privilege('anon','public.anular_evento_cultivo(uuid,uuid,integer,text)','EXECUTE')),
  (14,'Funciones ejecutables con sesion',has_function_privilege('authenticated','public.editar_puntos_lote(uuid,uuid,integer,uuid[],text,uuid[],text,text)','EXECUTE') AND has_function_privilege('authenticated','public.guardar_evento_cultivo(uuid,uuid,uuid,integer,text,date,text,text,uuid[],integer)','EXECUTE')),
  (15,'Triggers de ocupacion activos',(SELECT count(*)=2 FROM pg_trigger WHERE tgrelid='public.plantacion_puntos'::regclass AND tgname IN ('ocupacion_alta','ocupacion_baja') AND tgenabled='O')),
  (16,'Auditoria de eventos activa',EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.eventos_cultivo'::regclass AND tgname='eventos_auditoria' AND tgenabled='O')),
  (17,'Todas las asociaciones actuales tienen historial',NOT EXISTS(SELECT 1 FROM public.plantacion_puntos a WHERE NOT EXISTS(SELECT 1 FROM public.ocupaciones_cultivo o WHERE o.plantacion_id=a.plantacion_id AND o.punto_id=a.punto_id AND o.retirado_en IS NULL))),
  (18,'Ninguna ocupacion vigente carece de asociacion',NOT EXISTS(SELECT 1 FROM public.ocupaciones_cultivo o WHERE o.retirado_en IS NULL AND NOT EXISTS(SELECT 1 FROM public.plantacion_puntos a WHERE a.plantacion_id=o.plantacion_id AND a.punto_id=o.punto_id))),
  (19,'Fechas iniciales previas conservadas',NOT EXISTS(SELECT 1 FROM public.plantaciones c WHERE c.fecha_inicio IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.eventos_cultivo e WHERE e.huerto_id=c.huerto_id AND e.clave_importacion='inicio:'||c.id::text))),
  (20,'Resiembras previas conservadas',NOT EXISTS(SELECT 1 FROM public.plantaciones c WHERE c.fecha_ultima_resiembra IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.eventos_cultivo e WHERE e.huerto_id=c.huerto_id AND e.clave_importacion='resiembra:'||c.id::text))),
  (21,'Eventos y lotes del mismo huerto',NOT EXISTS(SELECT 1 FROM public.eventos_cultivo e JOIN public.plantaciones c ON c.id=e.plantacion_id WHERE e.huerto_id<>c.huerto_id)),
  (22,'Identidad historica de goteros independiente de su borrado',NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.ocupaciones_cultivo'::regclass AND contype='f' AND confrelid='public.puntos_riego'::regclass)),
  (23,'Revision del cuaderno disponible',EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.huertos'::regclass AND attname='version_cuaderno' AND NOT attisdropped)),
  (24,'Numeracion de goteros contigua y recuentos coherentes',NOT EXISTS(SELECT 1 FROM public.filas f LEFT JOIN public.puntos_riego p ON p.fila_id=f.id GROUP BY f.id HAVING count(p.id)<>f.goteros_previstos OR (count(p.id)>0 AND (min(p.numero_desde_oeste)<>1 OR max(p.numero_desde_oeste)<>count(p.id)))))
)
SELECT orden,comprobacion,CASE WHEN ok THEN 'OK' ELSE 'REVISAR' END AS resultado FROM comprobaciones ORDER BY orden;
