# Alcance de validación - versión 0.4.0

Fecha de preparación: 1 de noviembre de 2026. Base: ZIP de la versión 0.3.0 recuperado de esta conversación. La confirmación de funcionamiento de 0.3.0 procede del usuario; esta entrega es nueva.

## Ejecutado en el entorno de preparación

- 81 pruebas unitarias (38 anteriores y 43 nuevas), todas superadas. Cubren validación de formularios, selecciones, fechas, calendario, identidad de puntos, paginación, notas y reglas puras. Se ejecutaron con Node 22.16 y el cargador global ts-node, porque no fue posible instalar el cargador tsx del proyecto. No son pruebas SQL ni pruebas de integración con Supabase.
- 41 archivos TypeScript/TSX analizados con el compilador de TypeScript: sin errores de sintaxis. Esta comprobación no sustituye la compilación de producción.
- Tipos estrictos de las funciones puras del cuaderno, validación de formularios y contratos de datos: sin errores.
- Revisión adicional interna de contratos entre componentes con declaraciones provisionales de bibliotecas: no constituye validación con los tipos oficiales de React, Next o Supabase.
- Inspección visual estática de plano, calendario e historial, con datos de muestra anteriores, en anchuras 1680 y 390 píxeles. Se utilizó un renderizador JSX auxiliar y Chromium; no se ejecutó la aplicación Next.js ni se probaron interacciones reales. El auxiliar y sus mocks no forman parte del paquete.

## Pendiente y no afirmado como superado

- Instalación de dependencias, lint, tipos del proyecto completo y build de Next.js. La descarga de npm falló por falta de resolución/conectividad en el entorno de preparación.
- Ejecución SQL de la migración y de las 24 comprobaciones. No había PostgreSQL ni acceso a tu Supabase en este entorno.
- Pruebas funcionales con sesiones reales: altas y bajas, calendario, edición, anulación, concurrencia y permisos efectivos con cuentas distintas.
- Verificación visual final en Safari/Chrome de tu Mac y en tu móvil.

## Para comprobar en el Mac

Tras `npm ci`, ejecuta `npm run check`. Este comando sí utiliza las dependencias fijadas del proyecto y encadena pruebas, tipos, lint y build. Conserva cualquier mensaje de error completo.

En Supabase, ejecuta 06 completo y luego 07. Las 24 filas de 07 deben indicar OK. El archivo 07 revisa esquema, privilegios y coherencia básica; no sustituye la prueba funcional de las operaciones.

No se han incluido credenciales, una copia de la base de datos ni un fichero `.env.local`. No se ha accedido a datos vivos del proyecto del usuario.
