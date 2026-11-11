# Sistema Monitorización 0.7.0 — Corrección de navegación móvil

## Problema y causa identificada en el código
El menú inferior y las pestañas tenían el atributo `disabled` siempre que `datos.cuaderno.estado !== 'listo'` (o durante otras operaciones). Esto impedía cambiar de sección incluso para Tareas, Meteorología y Diario, que no requieren ese estado para mostrar sus propias vistas.

Esta condición explica el síntoma de las pestañas deshabilitadas, pero no demuestra que esa sea la única posible causa de fallos de navegación en el dispositivo concreto.

## Cambios
1. `src/components/huerto/PanelHuerto.tsx`: eliminación de `disabled` de los tres menús de navegación (lateral, pestañas compactas y barra inferior); las operaciones de edición conservan sus propios bloqueos. Si el cuaderno no está preparado, Calendario, Historial y Rotaciones muestran un aviso de dependencia de migración, en lugar de dejar el menú bloqueado.
2. `src/components/gestion/Tareas.tsx`: mensaje de carga y estado no disponible; no se presenta una lista vacía como resultado válido durante la carga, y no se habilita el formulario si el servidor no ha proporcionado los datos de gestión.
3. `tests/pwa.test.mjs`: prueba de regresión para comprobar que ninguna navegación queda bloqueada por el estado de la base de datos.
4. Corrección del pie de la interfaz, que aún indicaba v0.6.1.

No se han cambiado scripts SQL ni configuraciones de Supabase, autenticación o credenciales. El código se basa en el ZIP completo v0.7.0 con corrección ESLint.

## Instalación rápida del parche (sin reemplazar la carpeta completa)
1. Detén el servidor de Next.js (`Control + C`) y guarda una copia de la carpeta 0.7.0 que te funciona.
2. Abre la carpeta REAL del proyecto que estabas ejecutando en el Mac (la que contiene `package.json`).
3. Desde el ZIP de parche, copia los DOS archivos siguientes, conservando exactamente las rutas y aceptando sustituir los existentes:
   - `src/components/huerto/PanelHuerto.tsx`
   - `src/components/gestion/Tareas.tsx`
4. En esa carpeta del proyecto, ejecuta:

```bash
npm run check
npm run dev -- -H 0.0.0.0
```

5. Abre en Safari del iPhone `http://IP-DEL-MAC:3000/aplicacion` (o el puerto que aparezca en la terminal) y recarga la página. No instales aún la PWA desde HTTP local; primero se prueba como web.
6. Comprueba que el menú Huerto/Calendario/Tareas/Tiempo/Diario responde al toque y muestra títulos diferentes. Si Calendario muestra `Datos del cuaderno no disponibles`, hay que comprobar el estado de las migraciones 06/07 antes de ejecutarlas, no recrear la base de datos.
7. Si Tareas muestra un error relativo a la migración 10, habrá que comprobar 10/11 antes de ejecutar nada de nuevo.

Este parche no activa funciones cuya migración SQL no esté aplicada; permite acceder a las vistas y mostrar el motivo cuando falten datos.

## Validaciones efectuadas aquí
- `node --test tests/pwa.test.mjs`: 6 pruebas superadas.
- Comprobación de sintaxis TSX de los dos componentes con TypeScript: correcta.
- `npm run check` completo (test, typecheck, lint y build) no se ha podido ejecutar aquí por ausencia de las dependencias instaladas. Es indispensable ejecutarlo en el Mac.
