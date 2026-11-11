# Sistema Monitorización 0.7.0 — Paquete completo de navegación móvil (revisión 2)

## Motivo de la entrega
La actualización parcial anterior provocó en el equipo del usuario nueve errores TypeScript detectados desde `PanelHuerto.tsx:15`. No se dispone del texto completo de los nueve errores, por lo que NO se atribuyen definitivamente a una causa concreta. Los imports locales del proyecto empaquetado se han verificado; un archivo copiado en una carpeta equivocada podría producir errores similares.

Por ese motivo se entrega **el proyecto íntegro** y se desaconseja extraer o copiar componentes sueltos. El directorio interno del paquete se llama `sistema-monitorizacion-0.7.0-nav-revisada` para distinguirlo de versiones previas.

## Mejoras incluidas
- Navegación por las ocho vistas sin bloquear todos los menús cuando el cuaderno no está disponible.
- Barra inferior para iPhone con cinco secciones de acceso directo; pestañas horizontales para las restantes.
- Mensaje explícito si la sección necesita migraciones o datos aún no disponibles.
- Estado de Tareas independiente de la carga del cuaderno.
- Prueba automática de que cada import local de `src` se resuelve a un archivo real, que las rutas del menú existen y que el ZIP contiene el proyecto completo.
- Correcciones ESLint de la anterior revisión preservadas.

No se han modificado las migraciones de Supabase ni los datos históricos. No se incluyen credenciales ni `.env.local`.

## Instalación segura en el Mac
1. Detener todos los servidores `next dev` abiertos con `Control + C` en sus terminales; conservar intacta una copia del proyecto anterior y una copia de seguridad de Supabase.
2. Descomprimir el ZIP en una **carpeta nueva**. No arrastrar `PanelHuerto.tsx` a la raíz ni mezclarlo con otra versión.
3. Abrir en VS Code **la carpeta interna** `sistema-monitorizacion-0.7.0-nav-revisada`, la que contiene `package.json`, `src/` y `tests/`.
4. Copiar el archivo privado `.env.local` de la versión anterior a esta carpeta interna, sin subirlo aquí ni a GitHub.
5. En Terminal > New Terminal, dentro de la carpeta nueva, ejecutar:

```bash
pwd
ls package.json src/components/huerto/PanelHuerto.tsx src/components/huerto/GestorPuntos.tsx
npm ci
npm run check
```

El segundo comando debe listar los tres archivos; si falla, probablemente estás en la carpeta equivocada. `npm run check` debe completar test, typecheck, lint y build. **No continuar al iPhone si falla.**

6. Si el check pasa, ejecutar:

```bash
npm run dev -- -H 0.0.0.0
```

7. Desde el iPhone, conectado a la misma Wi-Fi que el Mac, abrir en Safari `http://IP_DEL_MAC:3000/aplicacion`, cambiando la IP y el puerto por los reales. Para obtener la IP habitual del Mac, ejecutar en otra terminal `ipconfig getifaddr en0`.
8. Probar sucesivamente Huerto, Calendario, Tareas, Tiempo y Diario, así como Semillero, Rotaciones e Historial desde las pestañas horizontales. Si Calendario indica `Datos del cuaderno no disponibles`, la navegación está desbloqueada pero falta confirmar el estado de las migraciones de Supabase.

## Si el puerto 3000 está ocupado
Detén la terminal anterior con `Control + C`. Si la sesión antigua quedó en segundo plano, `lsof -nP -iTCP:3000 -sTCP:LISTEN` muestra su PID para identificarla antes de detenerla. No borres la carpeta `.next` mientras el servidor esté funcionando.

## Alcance de la validación previa a la entrega
- Suite de pruebas ejecutada mediante un cargador temporal de TypeScript en un entorno sin dependencias npm.
- Comprobación aislada de tipos de las funciones puras y revisión de AST TypeScript.
- Comprobación de importaciones locales, integridad del ZIP y coherencia de dependencias.
- **No se ha podido ejecutar `npm ci`, `npm run check` completo ni una prueba real en Safari/iPhone en el entorno de generación** por falta de acceso al registro de paquetes y al dispositivo. El paso 5 en el Mac es obligatorio.
