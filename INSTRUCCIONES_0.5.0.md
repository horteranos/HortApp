# Sistema Monitorización 0.5.0 - Instalación y uso en macOS

## 1. Antes de cambiar nada

Partimos de la versión 0.4.0 funcionando y del mismo proyecto de Supabase, usuario administrador y datos que ya has creado. No necesitas publicar la aplicación ni contratar un alojamiento.

Conserva la carpeta anterior y un respaldo/exportación de la base de datos antes de ejecutar la migración. Copiar la carpeta del Mac solo respalda el código: las notas y cultivos están en Supabase. No compartas contraseñas, `.env.local` ni autorizaciones del recuperador.

## 2. Abrir la actualización

Detén la aplicación anterior con Control + C en su terminal. Descomprime el ZIP en una carpeta nueva. En Visual Studio Code abre `sistema-monitorizacion-0.5.0`, la carpeta que contiene `package.json`.

Copia `.env.local` desde el proyecto anterior a esta carpeta nueva, junto a `package.json`. En Finder, Comando + Mayúsculas + punto muestra archivos ocultos. No sustituyas tu configuración por `.env.example`.

Abre Terminal > Nuevo terminal. Comprueba que `node --version` devuelve 22.13.0 o superior.

## 3. Actualizar Supabase

En el mismo proyecto, entra en SQL Editor. Selecciona el rol postgres. Ejecuta el contenido COMPLETO de cada archivo, por orden y en consultas separadas:

```text
supabase/08_meteorologia_diario.sql
supabase/09_comprobar_monitor.sql
```

El 09 debe mostrar 24 resultados OK. Son comprobaciones estructurales, no una prueba de todas las operaciones o permisos.

No vuelvas a ejecutar 01, 03, 04 ni 06 para esta actualización. No crees otra base ni otro administrador. El 08 añade tablas y una función; no recarga cultivos iniciales, no renumera goteros y no restablece su número a 109. Cambia el nombre visible del sistema; conserva su código interno `huerto-alboraya`.

Si aparece un error, conserva el mensaje completo y no continúes con consultas parciales o correcciones improvisadas. El archivo 08 utiliza una transacción para que una ejecución fallida no deje la migración a medias.

## 4. Comprobar y abrir la aplicación

Ejecuta uno por uno:

```bash
npm ci
npm run check
npm run dev
```

`npm run check` ejecuta pruebas, revisión de tipos, lint y compilación. Necesita instalar correctamente las dependencias. Si falla, copia el error completo. No uses `npm audit fix --force` ni actualices bibliotecas individualmente.

Abre `http://localhost:3000/aplicacion`, o el puerto indicado por la terminal. Inicia sesión con tu administrador. Deben aparecer la versión 0.5.0 y las nuevas pestañas Meteorología y Diario de actividad, además de Plano, Calendario e Historial.

## 5. Configurar Meteorología por primera vez

Abre Meteorología > Configuración de ubicación y avisos. Las coordenadas propuestas, 39.50 y -0.35, son una referencia municipal redondeada de Alboraya, no la ubicación exacta de tu terreno. Puedes usar esa referencia sin revelar una ubicación precisa, o introducir otras coordenadas. Una celda de modelo no equivale a un sensor local.

Revisa el nombre de la referencia y la fecha desde la que quieres recuperar datos. Por defecto se toma la fecha más antigua de las actividades guardadas, si existe. Confirma la referencia con la casilla correspondiente, guarda y pulsa Actualizar ahora.

La aplicación solicita los últimos días y la previsión, detecta las fechas ausentes o incompletas y recupera el archivo por lotes. Recupera hasta cuatro lotes de treinta días por ciclo. Cuando existen más fechas pendientes, los siguientes ciclos continúan el trabajo. No convierte los datos ausentes en cero y no borra los registros correctos cuando falla Internet.

El día en curso no se guarda como resumen diario terminado. Los días recientes proceden del modelo reciente; posteriormente se contrastan/reemplazan con datos de archivo. Las máximas y mínimas son extremos de la serie horaria disponible, no extremos medidos por una estación dentro del terreno. El listado muestra el origen y si la cobertura del día está completa.

La vista carga los últimos 365 días de la referencia activa. Los anteriores permanecen en Supabase. Cambiar coordenadas crea otra versión de referencia y no mezcla los datos del lugar anterior con los nuevos.

## 6. Activar la recuperación al entrar en el Mac

Este paso es necesario para actualizar sin abrir la web. Instala un agente del usuario, no un servicio de ChatGPT. Se ejecuta al iniciar sesión en macOS y cada hora mientras el Mac está despierto, conectado y con esa sesión iniciada. No se ejecuta con el equipo apagado, antes de desbloquear/iniciar sesión ni durante una suspensión del equipo.

En Meteorología, despliega Inicio automático al entrar en el Mac y pulsa Preparar autorización para este Mac. Se descarga:

```text
Sistema_Monitorizacion_Mac.json
```

Es una autorización privada y revocable: no la envíes a nadie ni la incluyas en ZIP o repositorios. Permite sincronizar meteorología, pero no leer el diario ni editar cultivos. No contiene tu contraseña de administrador ni una clave service_role.

Con el archivo en Descargas, ejecuta desde la carpeta del proyecto:

```bash
npm run mac:instalar -- "$HOME/Downloads/Sistema_Monitorizacion_Mac.json"
```

Si el navegador lo ha guardado con otro nombre o en otra carpeta, utiliza su ruta real. No cambies el contenido del JSON. El instalador solo funciona en macOS, no utiliza sudo y guarda la autorización en el Llavero del usuario. Acepta los permisos necesarios de macOS. Al final ofrece eliminar el JSON descargado; puedes hacerlo una vez comprobada la instalación. No conserves copias innecesarias de ese archivo privado.

Comprueba el agente con:

```bash
npm run mac:comprobar
```

Este comando muestra si está cargado y los últimos registros de ejecución. Debe verse un intento de sincronización, o el mensaje de que ya se ha actualizado recientemente. Una prueba manual se solicita con:

```bash
npm run mac:sincronizar
```

Se respeta el intervalo mínimo de 45 minutos entre actualizaciones automáticas; ejecutarlo inmediatamente después de instalar no necesariamente provoca otra descarga. El botón Actualizar ahora de la web permite una comprobación manual autorizada.

Para verificar el arranque real: cierra la web, detén Next.js, cierra sesión y vuelve a iniciarla o reinicia el Mac. Tras conectar a Internet, consulta `npm run mac:comprobar`. No hace falta mantener Visual Studio Code ni la terminal abiertos. Si no hay conexión al entrar, el agente reintenta en un ciclo posterior; lo guardado no se borra.

El agente se copia a `~/Library/Application Support/SistemaMonitorizacion`; el lanzador está en `~/Library/LaunchAgents/org.sistema-monitorizacion.meteo.plist`. No muevas o elimines la instalación de Node que utiliza el agente. Si actualizas Node y cambia su ruta, vuelve a ejecutar el instalador.

Para detener y eliminar el recuperador local:

```bash
npm run mac:desinstalar
```

Esto no borra los datos de Supabase. Revoca también la autorización correspondiente en Meteorología. La revocación impide nuevos accesos, aunque quedara una copia del JSON.

## 7. Avisos para las próximas 72 horas

El botón Avisos 72 h abre la ventana desde cualquier pestaña. Se abre automáticamente cuando aparece una nueva combinación de fecha, fenómeno y severidad, para evitar ventanas repetitivas. No sustituye las alertas oficiales ni garantiza que una previsión se cumpla.

Umbrales iniciales editables: lluvia con probabilidad del 50 % o al menos 0,2 mm en una hora; rachas de 50 km/h; temperatura baja de 2 grados C o menos; alta de 35 grados C o más; humedad del 90 % o más o del 30 % o menos durante al menos tres horas consecutivas. Incluye condiciones de tormenta, nieve o hielo cuando el proveedor las indica. Son criterios iniciales del software, no recomendaciones agronómicas universales.

La ventana muestra las horas previstas en la zona Europe/Madrid. Un periodo continuo de 72 horas puede abarcar partes de cuatro fechas civiles. Si la previsión tiene más de seis horas o faltan datos, se advierte expresamente: la ausencia de avisos no significa ausencia de riesgo.

El recuperador también intenta mostrar notificaciones de macOS con los fenómenos nuevos. El sistema debe permitir notificaciones de Script Editor/osascript y actividad del agente. El modo concentración y los permisos de macOS pueden ocultarlas. No se envían correos ni mensajes al móvil. Los avisos dentro de la web no dependen de aceptar notificaciones nativas.

## 8. Diario y exportaciones

En Diario de actividad puedes crear varias entradas para una fecha, elegir una categoría y escribir hasta 8000 caracteres por nota. La vinculación a una fila, cultivo y varios goteros es opcional. Las notas vinculadas se consultan también desde el historial, sin duplicarlas.

El borrador se conserva en ese navegador; solo Guardar nota lo almacena en Supabase. No cierres/elimines datos del navegador confiando en un borrador como si fuera un respaldo. Los lectores pueden consultar/exportar; los editores gestionan sus propias notas; los administradores pueden gestionar todas. La edición mantiene la localización original y comprueba la revisión para evitar sobrescribir otra edición. Las anuladas quedan consultables con Mostrar anuladas.

El diario no crea automáticamente siembras o cosechas del calendario. Las actividades estructuradas se registran en el formulario de fechas del cultivo.

Selecciona fechas/fila/tipo/texto y pulsa:

- Exportar TXT: descarga directa en UTF-8 con todas las entradas filtradas, no solo la página visible.
- Exportar PDF: abre una ventana preparada para imprimir; selecciona Guardar como PDF. Si el navegador bloquea esa ventana, permite su apertura y repite. Si no se abre el diálogo de impresión, pulsa Comando + P dentro de ella.

Los nombres propuestos siguen `Sistema_Monitorizacion_Diario_inicio_actualidad` o las fechas seleccionadas. Si la impresión del navegador propone otro nombre, cambia el nombre al guardar. Un archivo admite hasta 2000 entradas; al superar ese límite se solicita un periodo más corto, sin exportar una lista incompleta. No se contrata un servicio externo de generación de PDF.

## 9. Pruebas funcionales recomendadas

Primero confirma la ubicación, sincroniza y revisa una fecha completa y su fuente. Comprueba que dos sincronizaciones no duplican fechas. Crea una nota identificada como PRUEBA, recarga, comprueba que sigue guardada y expórtala a TXT y PDF; anúlala después. Revisa que los filtros de exportación coincidan con las entradas esperadas.

Comprueba con otra sesión las notas guardadas y un conflicto de edición; con cuentas de lector/editor, comprueba sus permisos. No compartas la contraseña del administrador. Para la ventana meteorológica, comprueba los mensajes sin datos y previsión antigua, además de cualquier aviso disponible: no se inyectan datos ficticios en tu base para provocar avisos.

Por último, comprueba el agente con el navegador cerrado, el inicio de sesión real, los permisos de notificación y una interrupción de red. Consulta `VALIDACION_0.5.0.md` antes de dar por validados estos pasos.

## 10. Límites y costes

El código usa Open-Meteo y los servicios que ya tienes; no incorpora una suscripción ni contrata pagos. La API gratuita de Open-Meteo está limitada a usos no comerciales y a sus condiciones de volumen y atribución. Debe revisarse si cambia el uso del proyecto. La aplicación mantiene la atribución al proveedor.

Recuperar los días sin consultar reduce huecos, pero no garantiza datos que el proveedor no tenga ni evita una pérdida de la base. No reemplaza las copias de seguridad. No habrá avisos locales con el Mac apagado. El terreno puede tener temperaturas, humedad y viento distintos de la referencia del modelo.
