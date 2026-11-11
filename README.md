# Sistema Monitorizacion v0.6.1 (macOS, aplicacion local)

Actualizacion aditiva del codigo de la version 0.6.0 corregida, sobre el MISMO Supabase. Este ZIP no es una base de datos ni incluye `.env.local`.

**Empieza por `INSTRUCCIONES_0.6.1.md`.** Documentos de versiones previas se conservan unicamente como historial. No publicar todavia.

## Cambios

- La cantidad que se muestra inmediatamente a la derecha del nombre del cultivo se toma primero del recuento REAL almacenado en `sm_recuentos`. Si no hay un recuento, se distingue la cantidad inicial declarada de un recuento actual. El editor esta en la misma cabecera; no se muestra un segundo contador debajo.
- Retiradas la pantalla de plagas/enfermedades, el analizador de fotografias y la llamada a una API externa para ese fin. Se conservan fotos y entradas existentes del Diario; no se borra ningun registro almacenado en Supabase.
- Avisos meteorologicos a 72 horas personalizados para los cultivos presentes, con posibles impactos y acciones de comprobacion. Ademas del dialogo de avisos, hay un resumen en Plano y cultivos. No se infieren enfermedades ni se sustituyen medidas locales por pronosticos.
- El calendario muestra, con un estilo visual distinto, ventanas orientativas de cosecha segun las fechas reales de siembra/trasplante. Las cosechas estimadas no se guardan como cosechas reales. Los cultivos permanentes o sin fecha no reciben fechas inventadas.
- Se mantienen tareas, diario multimedia/dictado, semillero, rotaciones, historial, riego, plano, permisos y sincronizacion.

## Compatibilidad

El parche 0.6.1 NO agrega tablas ni requiere SQL nuevos. **Si la migracion SQL 10 corregida de 0.6.0 todavia no esta aplicada, el modulo de recuentos requerira que completes correctamente el proceso 08/09 y 10/11 descrito en los documentos anteriores.** Antes de ejecutar SQL, comprueba cual es el estado real. Si ya estaba aplicado no repitas las migraciones.

El codigo se entrega como proyecto completo para abrirlo en una carpeta separada. Necesita Node.js 22.13 o superior, `npm ci`, `npm run check` y `npm run dev` en el Mac. No se ha ejecutado el chequeo de Next.js integro en el entorno de preparacion por falta de dependencias npm; consulta la nota de validacion.
