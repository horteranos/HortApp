# Validación de Sistema Monitorización 0.5.0

## Comprobado en el entorno de preparación

140 pruebas automatizadas pasadas: 81 heredadas de la versión 0.4.0 y 59 nuevas de meteorología, sincronización simulada y exportaciones. Se ejecutaron con Node y un cargador local de TypeScript, dado que no pudieron instalarse las dependencias del proyecto. Las 59 nuevas también utilizan el corredor nativo `node --test`, sin dependencias adicionales.

Se comprobaron fechas Europe/Madrid, días de 23/24/25 horas, límites de la ventana de 72 horas, intervalos anteriores de lluvia/rachas, huecos del archivo, cobertura parcial, valores nulos, error del proveedor, fallos simulados de guardado, umbrales y caducidad de la previsión. Las pruebas de red usan respuestas simuladas, no son consultas reales a Open-Meteo o Supabase.

Revisión sintáctica sin errores de 49 archivos TS/TSX y comprobación de sintaxis de los módulos JavaScript. Esto no equivale a un `tsc` completo con los tipos de las dependencias instalados.

Revisión de presentación estática en Chromium a 1440 y 390 píxeles: Meteorología y Diario sin desbordamiento horizontal de la página. Se utilizaron componentes renderizados con dependencias simuladas y datos ficticios marcados como tales, no una sesión interactiva real.

Se generó y revisó un PDF de prueba de tres páginas desde el HTML real de exportación, con notas largas, acentos y texto similar a código HTML. El contenido se representa como texto, no se ejecuta. Ninguna nota de prueba se incluye en la base o los datos iniciales del paquete.

## Pendiente de comprobar en el entorno del usuario

- Instalación completa de npm, revisión completa de tipos, ESLint y compilación de Next.js. El entorno de preparación no pudo acceder al registro npm para descargar las dependencias.
- Ejecución de las migraciones 08/09 contra PostgreSQL/Supabase, permisos reales y comportamiento concurrente. No hubo una base PostgreSQL de pruebas ni acceso al proyecto del usuario.
- Llamadas reales a Open-Meteo desde el Mac y continuidad de la descarga de archivo.
- Instalación real de LaunchAgent, Llavero, reinicio/inicio de sesión, red y notificaciones. Este entorno no es macOS.
- Guardado, edición y exportación del diario con sesión real, perfiles de editor/lector y Safari. La revisión del PDF se realizó en Chromium, no en Safari.

## Comandos en el Mac

```bash
npm ci
npm run check
npm run test:monitor
npm run mac:comprobar
```

El archivo 09 contiene 24 comprobaciones estructurales de lectura. Un resultado OK no certifica por sí solo todos los permisos ni el arranque del Mac. Mantener el respaldo y completar las pruebas funcionales de `INSTRUCCIONES_0.5.0.md`.

## Alcance del parche

No publica la web, no crea cuentas de otros usuarios, no instala sensores y no incluye alertas oficiales. No garantiza disponibilidad meteorológica continua ni recupera información ajena a la disponible en el proveedor. La exportación PDF requiere Guardar como PDF en el diálogo de impresión.
