# Meteorología, datos y seguridad - 0.5.0

## Procedencia y tratamiento

Forecast API de Open-Meteo para horas recientes y previstas. Historical Weather API para fechas anteriores, con margen conservador de siete días antes de sustituir datos recientes por archivo. El archivo puede combinar modelos/reanálisis; no se describe como una observación de la parcela ni como una serie climática homogénea de un único instrumento.

Se solicitan marcas de tiempo Unix en UTC, grados C, km/h y mm. Los días se agregan con Europe/Madrid, incluyendo cambios de horario. Temperatura y humedad a 2 m; viento y rachas a 10 m. Las máximas/mínimas corresponden a extremos de la serie horaria disponible. Para precipitación y rachas se respeta el intervalo de la hora anterior documentado por el proveedor. La suma diaria de precipitación solo se presenta con cobertura horaria completa.

La tabla diaria conserva fecha, fuente reciente/archivo, cobertura, coordenadas solicitadas y de malla cuando se reciben, y fecha de actualización. La previsión permanece separada y tiene fecha de consulta. Cambiar coordenadas incrementa la versión del lugar; los datos anteriores no se borran ni se mezclan.

Cada ciclo consulta la previsión y recupera como máximo cuatro lotes de hasta treinta días de archivo. Una consulta fallida no elimina datos. El bloqueo de sincronización caduca a los doce minutos; el intervalo mínimo automático es de cuarenta y cinco minutos. Se reintentan días ausentes/incompletos. Los datos del proveedor, sus campos y su disponibilidad pueden cambiar: deben mantenerse las pruebas y revisarse los errores, no ocultarlos.

## Permisos y recuperador

Se mantienen las membresías y roles existentes. RLS habilitado en las cinco tablas públicas nuevas. Los miembros tienen lectura; no se concede escritura directa. Las operaciones pasan por una función con `search_path` vacío, autorización explícita y validación de pertenencia.

El Mac recibe una capacidad aleatoria de 32 bytes para cuatro operaciones meteorológicas: iniciar, guardar, finalizar y consultar el estado. En Supabase solo se guarda su SHA-256. Se puede revocar y deja de ser válida si su creador ya no es administrador. No da acceso al diario o cultivos. Un token robado permite operaciones meteorológicas dentro de ese alcance: debe revocarse de inmediato, no tratarse como información pública.

El instalador guarda la capacidad en el Llavero del usuario. El JSON inicial de descarga es sensible y debe eliminarse después de su uso. El archivo de configuración del agente y el plist no incluyen ese token. No se guarda la contraseña de acceso de la aplicación, no se usa service_role y no se requiere sudo.

El agente necesita la sesión del usuario y la ruta instalada de Node. Sus solicitudes a Supabase usan la clave publicable en la cabecera apikey, no como Bearer. El proceso solo accede a los hosts meteorológicos definidos y al proyecto Supabase configurado. Las notificaciones AppleScript se pasan como argumentos, no como código generado a partir de notas.

## Diario

Cada entrada conserva autor, fecha, revisión y una instantánea de las referencias a fila/cultivo/puntos. Las revisiones previas y las anulaciones se conservan; no hay borrado definitivo desde la interfaz. La localización histórica no se reescribe al editar una nota. La exportación utiliza una consulta completa con los filtros, admite hasta 2000 entradas y rechaza conjuntos mayores en lugar de truncarlos silenciosamente.

La impresión HTML escapa texto libre, aplica una política de contenido sin scripts ni recursos externos y no envía notas a un servicio PDF externo. La descarga TXT conserva los caracteres originales. El borrador de localStorage es un apoyo local, no almacenamiento compartido ni una copia de seguridad.

## Fuentes primarias consultadas

Open-Meteo Forecast API: https://open-meteo.com/en/docs

Open-Meteo Historical Weather API: https://open-meteo.com/en/docs/historical-weather-api

Open-Meteo Terms: https://open-meteo.com/en/terms

Apple, Creating Launch Daemons and Agents: https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html

Supabase, Database Functions: https://supabase.com/docs/guides/database/functions

Supabase, API Keys: https://supabase.com/docs/guides/api/api-keys

Consulta: 1 de noviembre de 2026. La API gratuita de Open-Meteo se ofrece para usos no comerciales bajo sus límites y atribución CC BY 4.0. El proveedor no garantiza exactitud, completitud o disponibilidad ininterrumpida.
