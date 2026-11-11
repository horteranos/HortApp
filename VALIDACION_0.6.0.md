# Sistema Monitorización 0.6.0 — estado de validación

Fecha de preparación: 04/11/2026.

**Validado en el entorno de preparación**

- Paquete construido partiendo del código completo de 0.5.0, conservando todas las migraciones y módulos originales.
- Comprobación sintáctica/transpilación de 66 archivos `.ts` y `.tsx`: sin errores de sintaxis detectados.
- Se ejecutaron las 59 pruebas independientes del módulo meteorológico/diario heredadas: 59 correctas, 0 fallos.
- Se ejecutaron cuatro pruebas adicionales de rotaciones y avisos fitosanitarios mediante transpilación TypeScript local: 4 correctas, 0 fallos.
- El paquete no incluye secretos `.env.local`, `node_modules`, datos de Supabase ni ficheros de usuario.

**No verificado aquí y OBLIGATORIO en el Mac**

- `npm ci` no se pudo completar en el entorno de preparación por acceso/tiempos de descarga de paquetes npm. Por ello **no se ejecutó de principio a fin `npm run check`**, que incluye todas las pruebas, verificación de tipos, ESLint y compilación `next build`.
- Las migraciones SQL 08/09 y 10/11 no se han ejecutado contra el proyecto de Supabase del usuario. Ni la estructura real ni las políticas RLS de los nuevos objetos han sido probadas en ese proyecto.
- No se han comprobado de manera interactiva permisos reales de roles administrador/editor/lector, dictado en Safari/Chrome, cargas multimedia desde el navegador, consumo y coste de API, funcionamiento de `storage.objects`, visualización de día en calendario ni el agente macOS después de una sesión real.
- La entrega del código **no demuestra** que se haya instalado la versión 0.5.0 previamente: hay que verificarlo en Supabase antes de aplicar SQL 10.

**Criterios de aceptación para declarar 0.6.0 operativa**

1. SQL 09 devuelve 24 registros OK y SQL 11 devuelve 14 registros OK.
2. `npm run check` termina sin errores, después de `npm ci`, en el Mac del usuario.
3. Se realiza la lista de verificaciones funcionales de `INSTRUCCIONES_0.6.0.md`.
4. Después de reiniciar el navegador y el Mac, se comprueba la persistencia de una tarea, un plantel, una nota con imagen y un recuento de plantas.
5. El proyecto de Supabase, las seis filas, los cultivos, eventos y goteros anteriores permanecen intactos.

No se debe dar por cumplido ninguno de los criterios pendientes sin probarlo expresamente.

## Corrección posterior del test cuaderno

La captura del usuario muestra que 144 pruebas pasaron antes de que `npm run typecheck` informara de TS2352 en `tests/cuaderno.test.ts:50`. Se sustituyeron los objetos ficticios incompletos por un constructor de eventos de prueba que devuelve el tipo completo `EventoCultivo`. El constructor se verificó mediante `tsc --noEmit --strict` contra `src/types/cuaderno.ts` en una compilación aislada y el archivo completo se transpiló sin errores de sintaxis. **No se ha podido completar la instalación npm ni ejecutar la cadena íntegra de `npm run check` aquí.** El usuario debe repetirla en su Mac.
