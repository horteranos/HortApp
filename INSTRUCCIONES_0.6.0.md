> DOCUMENTO HISTORICO DE LA VERSION 0.6.0. Para instalar el parche actualizado, utiliza INSTRUCCIONES_0.6.1.md. Las funciones de deteccion fitosanitaria descritas aqui han sido retiradas.

# Sistema Monitorización 0.6.0 — instalación controlada en macOS

**Actualización del proyecto existente. No es un sistema nuevo.** Este ZIP contiene la aplicación completa sobre el código de la entrega 0.5.0; se conservan las seis filas, goteros, cultivos, eventos y datos ya almacenados en el mismo Supabase. **No publiques aún la aplicación**, no vuelvas a importar datos iniciales y no ejecutes las migraciones 01 a 07 si ya funcionan.

## 1. Antes de hacer cambios

1. Detén `npm run dev` con **Control + C** en Terminal.
2. Conserva **intacta** tu carpeta anterior, funcional, y guarda una copia externa. No sobrescribas sus archivos.
3. Realiza una copia de seguridad **independiente** de tu base de datos Supabase (incluidos los datos) antes de cualquier SQL. El ZIP no almacena esos datos.
4. Descomprime `Sistema_Monitorizacion_0.6.0_macOS.zip` en otra carpeta y abre `sistema-monitorizacion-0.6.0` con Visual Studio Code (la carpeta que contiene `package.json`).
5. Copia el archivo privado `.env.local` de tu carpeta anterior a esta nueva carpeta, sin compartirlo ni incluirlo en ZIP. **No crees otro proyecto Supabase.**

## 2. Actualiza el MISMO proyecto Supabase, sin borrar datos

Abre **Supabase → SQL Editor** y ejecuta cada script en una consulta **separada**, usando el rol `postgres`.

- **Si aún no instalaste la versión 0.5.0:** primero ejecuta `supabase/08_meteorologia_diario.sql` y después `supabase/09_comprobar_monitor.sql`. La segunda consulta debe devolver **24 comprobaciones OK**. Si aparecen errores, detente y revisa antes de continuar.
- **En todos los casos:** ejecuta `supabase/10_ampliacion_0_6_0.sql` y, en una consulta aparte, `supabase/11_comprobar_ampliacion.sql`. La segunda consulta debe devolver **14 comprobaciones OK**.
- No ejecutes los SQL 10/11 si los 08/09 están pendientes o tienen errores. No ejecutes 01–07 nuevamente y nunca uses la opción de reinicializar/restablecer la base de datos.

La migración 10 añade tablas independientes `sm_tareas`, `sm_semillero`, `sm_recuentos`, `sm_diario_medios`, así como un bucket **privado** `sm-diario` con políticas RLS. No altera ni vacía `plantaciones`, `puntos_riego`, `eventos_cultivo`, `monitor_diario` ni los datos meteorológicos.

## 3. Instala y arranca la aplicación

En **Terminal → New Terminal**, situado dentro de la nueva carpeta del proyecto:

```bash
node --version
npm ci
npm run check
npm run dev
```

Requiere Node.js **22.13.0 o superior**. `npm ci` necesita acceso a Internet la primera vez. Si **`npm run check` falla, no sustituyas** la instalación funcional anterior: copia el error y corrige antes de proseguir. Si pasa, abre en el navegador:

`http://localhost:3000/aplicacion`

Accede con la cuenta de administrador ya creada. Los lectores solo consultan y los editores/administradores pueden registrar información. No es necesario mantener dos servidores Next.js activos.

## 4. Verificaciones funcionales (con datos de prueba reversibles)

1. **Semillero:** comprueba que hay 20 posiciones numeradas. Da de alta una plaza libre, cambia su estado, recarga la página y comprueba persistencia. Después libera la plaza de prueba.
2. **Plantas por fila:** selecciona una fila en el plano. Junto a cada lote, comprueba el apartado *Plantas reales registradas*. Introduce una cantidad de prueba, recarga y confirma que el número de goteros no ha cambiado. Usa el valor real después de la prueba.
3. **Tareas:** crea una tarea con fecha próxima, abre *Ver en calendario*, comprueba que aparece el día correcto y márcala como hecha. Puedes cancelar la tarea de prueba.
4. **Diario y calendario:** crea una nota fechada el **04/11/2026**, independientemente del día en que la escribas. Abre el calendario de noviembre 2026, selecciona el día **4** y comprueba título y texto. Verifica que varias notas pueden coincidir en la misma fecha.
5. **Dictado:** en Diario pulsa *Dictar nota*. El navegador puede solicitar permiso para usar el micrófono. Revisa el texto reconocido antes de guardar. Si no existe compatibilidad, usa el dictado integrado de macOS.
6. **Fotos y vídeos:** adjunta un JPG/PNG/WebP/GIF o vídeo MP4/WebM/MOV a una nota. Vuelve a *Ver / añadir fotos y vídeos*: comprueba que puede abrirse con URL privada temporal. Prueba de nuevo tras iniciar sesión. El máximo previsto por archivo es 50 MB, sujeto al límite de tu plan de Supabase.
7. **Rotaciones:** registra/consulta una cosecha en *Historial*. En *Rotaciones sugeridas*, verifica que propone especies distintas de la misma familia botánica de la cosecha, según la época. La cosecha por sí sola **no** marca un espacio como libre.
8. **Plagas y enfermedades:** abre la pestaña y el botón de *Avisos 72 h* después de actualizar Meteorología. Los avisos se muestran solo cuando existen condiciones meteorológicas orientativas de riesgo; no diagnostican una enfermedad ni significan que haya plaga real.
9. **Fotografía de síntomas:** opcional. Si configuras una clave válida de API y consientes el envío explícito, analiza una imagen JPG/PNG/WebP menor de 5 MB. Puedes guardar la inspección y la fotografía en el Diario. No utilices un resultado provisional como confirmación fitopatológica.

## 5. Configuración opcional del análisis de fotografías por IA

El sistema NO envía fotografías a ningún proveedor externo automáticamente. Para activar *Analizar fotografía*, añade al `.env.local` **del servidor**:

```dotenv
OPENAI_API_KEY=tu_clave_privada_de_api
OPENAI_VISION_MODEL=gpt-4.1-mini
```

Reinicia `npm run dev` después de editar el archivo. Una suscripción a ChatGPT no implica crédito de API: el servicio puede requerir facturación **por uso**. No añadas `NEXT_PUBLIC_` a la clave, no la envíes por correo ni la incluyas en capturas, exportaciones o repositorios. Sin esta clave, el registro manual de plagas/incidencias y sus fotografías sigue operativo.

La respuesta visual se formula como **hipótesis provisionales** y comprobaciones sobre síntomas visibles. Puede confundir insectos, hongos, estrés hídrico o carencias; se necesita confirmación antes de tratamientos.

## 6. Límites que debes conocer

- La transcripción usa el reconocimiento de voz que ofrezca el navegador/dispositivo. Su disponibilidad, privacidad y calidad **no están garantizadas**; en algunos navegadores el reconocimiento implica procesamiento externo. La aplicación no guarda el audio del dictado.
- Las fotos/vídeos se almacenan en un bucket privado de Supabase, no en la carpeta local del Mac. Las exportaciones TXT/PDF del Diario siguen exportando **texto**, no los archivos multimedia originales.
- Los avisos fitosanitarios se basan en reglas sencillas sobre humedad, lluvia y calor de una **previsión externa**. No hay sensores de esporas, trampas ni modelos de diagnóstico entrenados con datos reales de este huerto.
- Los avisos del navegador se consultan al abrir la aplicación. **No son notificaciones push**, ni se envían con el Mac apagado, en suspensión o la aplicación inaccesible.
- Los calendarios, recuentos, semillero, tareas y adjuntos son multiusuario y requieren una conexión válida a Supabase. Las conexiones fallidas no deben interpretarse como datos vacíos.
- La opción de fotografiar plagas no requiere haber publicado la aplicación: se usa desde el navegador local en Mac. Para móvil u otro equipo hace falta acceso a la app desde ese dispositivo, no disponible en `localhost` del Mac.

## 7. Recuperador meteorológico de macOS

Si la versión 0.5.0 ya tiene el agente configurado, **no hace falta reinstalarlo** para estas mejoras. Si no lo has configurado, sigue `INSTRUCCIONES_0.5.0.md`, después de comprobar que funciona la aplicación y los datos meteorológicos. Nunca compartas `Sistema_Monitorizacion_Mac.json` ni credenciales.

## 8. Volver a la versión anterior si algo falla

1. Detén la 0.6.0 con Control + C y vuelve a abrir la carpeta anterior (conservada en el paso 1).
2. El SQL 10 **no borra** las tablas anteriores, de modo que la interfaz antigua sigue utilizando las mismas tablas y datos. Deja las nuevas tablas sin uso en vez de borrarlas apresuradamente.
3. Restaurar un respaldo o eliminar tablas requiere evaluar primero los datos añadidos a estas tablas. No ejecutes comandos destructivos de forma automática.

Consulta también `VALIDACION_0.6.0.md` para ver qué se ha podido comprobar en el entorno de creación y qué sigue pendiente en tu Mac.
