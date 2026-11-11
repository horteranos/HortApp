# Sistema Monitorización v0.7.0 — iPhone (PWA privada)

## Qué incluye esta entrega
- Proyecto **Next.js** existente actualizado, sin modificar el esquema de Supabase ni los datos.
- Metadatos PWA, manifiesto `src/app/manifest.ts`, iconos adaptados a iPhone y service worker mínimo.
- Navegación inferior en móvil para Huerto, Calendario, Tareas, Tiempo y Diario; otras vistas en las pestañas superiores.
- Pantalla de desconexión: **NO hay edición offline** ni caché de datos personales. Internet es necesario para consultar y guardar.
- El prototipo anterior ahora redirige a la aplicación autenticada, para no mostrar información del huerto en una ruta pública.
- Los avisos meteorológicos de v0.6.1 siguen siendo **avisos dentro de la app**, no push al iPhone.

## PASO 0 — Seguridad y comprobación antes de publicar
1. Conserva la carpeta v0.6.1 funcional y haz respaldo independiente de Supabase.
2. Comprueba el estado de SQL 08/09, SQL 10 corregido y SQL 11. **No repitas migraciones a ciegas**; en este paquete no se incluyen migraciones nuevas.
3. **No subas** `.env.local`, autorizaciones privadas del Mac, respaldos ni credenciales a GitHub. `.gitignore` los excluye, pero inspecciona los ficheros antes de subirlos.
4. Para un proyecto personal no comercial, Vercel Hobby se puede utilizar sin pagar sujeto a sus condiciones y límites. La URL pública no implica que los datos sean públicos: el acceso real a `/aplicacion` requiere sesión y permisos RLS en Supabase.
5. El código PWA no reemplaza la verificación de las políticas RLS de Supabase. Revisa los permisos antes de facilitar la URL.

## PASO 1 — Instalar localmente en Mac
1. Descomprime este ZIP en una **carpeta nueva**.
2. Abre en VS Code la carpeta `sistema-monitorizacion-0.7.0` que contiene `package.json`.
3. Copia desde tu v0.6.1 el archivo privado `.env.local` a esa carpeta (no lo compartas). Utiliza el **mismo Supabase**.
4. Terminal dentro de esa carpeta:
   ```sh
   node --version
   npm ci
   npm run check
   npm run dev
   ```
5. Abre `http://localhost:3000/aplicacion`, accede y prueba filas, goteros, recuentos, calendario, tareas, diario, fotografías, semillero y meteorología.
6. Si `npm run check` falla, **no publiques**; anota el error para corregirlo. Para detener el servidor, pulsa Control+C.

## PASO 2 — Subir el código a GitHub (privado)
1. Crea una cuenta gratuita de GitHub si no la tienes.
2. Crea un repositorio **Private** vacío, por ejemplo `sistema-monitorizacion` (sin archivo README inicial).
3. En la Terminal de la carpeta del proyecto, usa (sustituyendo URL por la tuya):
   ```sh
   git init
   git add .
   git status
   git commit -m "PWA 0.7.0 inicial"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/sistema-monitorizacion.git
   git push -u origin main
   ```
4. **Antes de `git commit`**, revisa `git status`: nunca deben figurar `.env.local` ni claves, archivos `.json` de autorización Mac ni copias de Supabase. Si ya había repositorio Git, no repitas `git init`, remoto ni rama: haz un commit en tu repositorio existente.
5. Al subir por HTTPS puede ser necesario autenticar con la ventana del navegador o un token/gestor de credenciales de GitHub.

## PASO 3 — Desplegar en Vercel Hobby (sin dominio propio)
1. Crea cuenta personal en `https://vercel.com/`, elige **Hobby**, conecta GitHub.
2. `Add New > Project` e importa el repositorio privado.
3. Framework: Next.js. Root Directory: carpeta que contiene `package.json` (raíz del repositorio si subiste su contenido).
4. En Environment Variables, añade **las mismas** dos variables que utiliza tu `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL del Supabase existente)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Publishable key del mismo proyecto)
   **NO añadas contraseñas ni service_role / sb_secret_**. Estas variables son públicas por diseño y las protecciones de acceso dependen de sesión y RLS.
5. `Deploy`. Si falla, lee el build log y corrige el error antes de seguir. La plataforma asignará una dirección `https://...vercel.app` con HTTPS.
6. En esa URL, visita `/acceso`, inicia sesión y comprueba lectura y escritura en Supabase; abre una ventana privada y comprueba que no puedes leer datos sin sesión.
7. Revisa en Supabase Auth > URL Configuration la configuración apropiada de Site URL y Redirect URLs **si tu flujo de acceso por correo las utiliza**; no alteres valores existentes sin revisar usuarios y autenticación. El formulario actual usa correo/contraseña.
8. No envíes la URL ni credenciales a terceros hasta comprobar permisos, RLS y funcionamiento.

## PASO 4 — Añadir al iPhone
1. Con iPhone conectado a Internet, abre Safari y visita la URL `https://...vercel.app/aplicacion`.
2. Inicia sesión con tu usuario autorizado.
3. Pulsa el botón Compartir de Safari (o Menú de página > Compartir) > **Añadir a pantalla de inicio**.
4. Selecciona **Abrir como app web** cuando aparezca y pulsa **Añadir**.
5. Abre el nuevo icono «Mi Huerto»: se mostrará sin las barras habituales de Safari.
6. Prueba navegación inferior, mapa horizontal, modificación reversible de un recuento, calendario, diario y alertas meteorológicas.

## PASO 5 — Verificación final / límites actuales
- La URL de Vercel funcionará sin tener el Mac encendido; sin embargo, el agente de sincronización meteorológica `mac:...` de versiones anteriores **solo trabaja cuando el Mac está despierto y conectado**. Hacer que se ejecute en la nube es una tarea **pendiente**, no implementada en esta versión.
- **No hay notificaciones push remotas** en v0.7.0. Para recibirlas con la app cerrada habrá que añadir suscripciones web push y una tarea de servidor. Apple permite web push en PWA añadidas a inicio desde iOS 16.4 sin Apple Developer de pago.
- Offline: el SW guarda únicamente iconos públicos. **No guarda** páginas autenticadas, sesiones ni datos de cultivos; tampoco encola cambios. No registres observaciones cuando no haya conexión.
- Supabase Free puede pausar bases con poca actividad; vigila el correo y realiza respaldos periódicos. No hay disponibilidad garantizada.
- Para actualizar, publica un nuevo commit en GitHub y deja que Vercel vuelva a desplegar. Conserva copia antes de modificar cualquier versión.

## Comprobaciones en macOS
```sh
npm run check
npm run dev
```
La instalación en iPhone requiere HTTPS en el despliegue, y el service worker se registra solo en **modo producción**. En modo de desarrollo puedes comprobar responsive en las herramientas de desarrollador, pero el icono como PWA se verifica en la URL HTTPS publicada.
