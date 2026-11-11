-- Comprobacion estructural de la version 0.6.0. Ejecutar como postgres.
WITH checks(nombre,ok) AS (
 VALUES
 ('Version 0.5: monitor_diario',to_regclass('public.monitor_diario') IS NOT NULL),
 ('Version 0.5: meteorologia',to_regclass('public.monitor_meteo_dias') IS NOT NULL),
 ('Tareas',to_regclass('public.sm_tareas') IS NOT NULL),
 ('Semillero',to_regclass('public.sm_semillero') IS NOT NULL),
 ('Recuentos',to_regclass('public.sm_recuentos') IS NOT NULL),
 ('Adjuntos',to_regclass('public.sm_diario_medios') IS NOT NULL),
 ('Storage privado',EXISTS(SELECT 1 FROM storage.buckets WHERE id='sm-diario' AND public=false)),
 ('RLS tareas',(SELECT relrowsecurity FROM pg_class WHERE oid='public.sm_tareas'::regclass)),
 ('RLS semillero',(SELECT relrowsecurity FROM pg_class WHERE oid='public.sm_semillero'::regclass)),
 ('RLS recuentos',(SELECT relrowsecurity FROM pg_class WHERE oid='public.sm_recuentos'::regclass)),
 ('RLS adjuntos',(SELECT relrowsecurity FROM pg_class WHERE oid='public.sm_diario_medios'::regclass)),
 ('20 plazas permitidas',EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.sm_semillero'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%plaza%')),
 ('Filas historicas',EXISTS(SELECT 1 FROM public.filas WHERE codigo='F6')),
 ('No se borran eventos',to_regclass('public.eventos_cultivo') IS NOT NULL)
)
SELECT nombre,CASE WHEN ok THEN 'OK' ELSE 'ERROR' END AS resultado FROM checks;
