-- SOLO LECTURA. Ejecutar despues de 08, en el mismo proyecto y como postgres.
-- Comprobaciones estructurales: no sustituyen las pruebas de acceso y guardado.
WITH checks(comprobacion,correcto) AS (VALUES
 ('01. Configuracion instalada',to_regclass('public.monitor_config') IS NOT NULL),
 ('02. Diario instalado',to_regclass('public.monitor_diario') IS NOT NULL),
 ('03. Historico meteorologico instalado',to_regclass('public.monitor_meteo_dias') IS NOT NULL),
 ('04. Previsiones instaladas',to_regclass('public.monitor_meteo_prevision') IS NOT NULL),
 ('05. Control de sincronizacion instalado',to_regclass('public.monitor_sync') IS NOT NULL),
 ('06. Registro privado de dispositivos',to_regclass('huerto_privado.monitor_dispositivos') IS NOT NULL),
 ('07. Registro privado de revisiones',to_regclass('huerto_privado.monitor_diario_revisiones') IS NOT NULL),
 ('08. Funcion de operaciones disponible',to_regprocedure('public.monitor_operacion(uuid,text,jsonb,text)') IS NOT NULL),
 ('09. RLS en las cinco tablas nuevas',(SELECT count(*)=5 AND bool_and(c.relrowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('monitor_config','monitor_diario','monitor_meteo_dias','monitor_meteo_prevision','monitor_sync'))),
 ('10. Cinco politicas de lectura',(SELECT count(*)=5 FROM pg_policies WHERE schemaname='public' AND tablename IN ('monitor_config','monitor_diario','monitor_meteo_dias','monitor_meteo_prevision','monitor_sync') AND policyname='monitor_lectura')),
 ('11. Sin escritura directa para authenticated',(SELECT bool_and(NOT has_table_privilege('authenticated','public.'||t,'INSERT') AND NOT has_table_privilege('authenticated','public.'||t,'UPDATE') AND NOT has_table_privilege('authenticated','public.'||t,'DELETE')) FROM unnest(ARRAY['monitor_config','monitor_diario','monitor_meteo_dias','monitor_meteo_prevision','monitor_sync']) t)),
 ('12. Sin lectura anonima directa',(SELECT bool_and(NOT has_table_privilege('anon','public.'||t,'SELECT')) FROM unnest(ARRAY['monitor_config','monitor_diario','monitor_meteo_dias','monitor_meteo_prevision','monitor_sync']) t)),
 ('13. Tokens no accesibles a usuarios',NOT has_table_privilege('authenticated','huerto_privado.monitor_dispositivos','SELECT') AND NOT has_table_privilege('anon','huerto_privado.monitor_dispositivos','SELECT')),
 ('14. RPC ejecutable para miembros',has_function_privilege('authenticated','public.monitor_operacion(uuid,text,jsonb,text)','EXECUTE')),
 ('15. RPC disponible para dispositivo con token',has_function_privilege('anon','public.monitor_operacion(uuid,text,jsonb,text)','EXECUTE')),
 ('16. Funcion con search_path fijo',(SELECT prosecdef AND EXISTS(SELECT 1 FROM unnest(proconfig) v WHERE v IN ('search_path=""','search_path=')) FROM pg_proc WHERE oid=to_regprocedure('public.monitor_operacion(uuid,text,jsonb,text)'))),
 ('17. Una configuracion para el sistema',(SELECT count(*)=1 FROM public.monitor_config c JOIN public.huertos h ON h.id=c.huerto_id WHERE h.codigo='huerto-alboraya')),
 ('18. Control de sincronizacion preparado',(SELECT count(*)=1 FROM public.monitor_sync c JOIN public.huertos h ON h.id=c.huerto_id WHERE h.codigo='huerto-alboraya')),
 ('19. El identificador tecnico se conserva',(SELECT count(*)=1 FROM public.huertos WHERE codigo='huerto-alboraya')),
 ('20. Nombre publico actualizado',(SELECT nombre=U&'Sistema Monitorizaci\00F3n' FROM public.huertos WHERE codigo='huerto-alboraya')),
 ('21. El calendario existente se conserva',to_regclass('public.eventos_cultivo') IS NOT NULL),
 ('22. El historial existente se conserva',to_regclass('public.ocupaciones_cultivo') IS NOT NULL),
 ('23. Zona horaria de Madrid',(SELECT bool_and(zona_horaria='Europe/Madrid') FROM public.monitor_config)),
 ('24. Diario con indice por fecha',to_regclass('public.monitor_diario_fecha_idx') IS NOT NULL)
)
SELECT comprobacion,CASE WHEN correcto IS TRUE THEN 'OK' ELSE 'REVISAR' END AS resultado FROM checks ORDER BY comprobacion;
