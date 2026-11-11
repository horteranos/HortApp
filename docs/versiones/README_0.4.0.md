# Huerto Alboraya 0.4.0

Selección múltiple, iconos de cultivos, fechas, calendario, plano de tierra con riego e historial por filas y goteros. Paquete completo con el parche integrado sobre 0.3.0; **no es una base de datos nueva**.

La versión 0.3.0 ya funciona en tu Mac, según tu confirmación. Se mantienen el proyecto Supabase, el usuario administrador y `.env.local`. No se añaden dependencias ni se cambian sus versiones.

## 1. Preparar la carpeta sin perder la anterior

Detén el servidor anterior con **Control + C**. Conserva esa carpeta como respaldo. Descomprime `huerto-alboraya-parche-0.4.0-macos.zip` y abre **huerto-alboraya-0.4.0**, la carpeta que contiene `package.json`, en Visual Studio Code.

Copia **`.env.local` de tu carpeta anterior a la nueva**, junto a `package.json`. En Finder puedes mostrar archivos ocultos con **Comando + Mayúsculas + punto**. No sustituyas la configuración que ya funciona por `.env.example`, ni compartas contraseñas o claves privadas.

La carpeta anterior es una copia del código, no una copia de la base de datos. Si los datos son importantes, conserva también una exportación o respaldo de tu base antes de ejecutar una migración. Este paquete no ha accedido a tu base ni creado ese respaldo.

## 2. Actualizar la base de datos EXISTENTE

Dentro del mismo proyecto de Supabase, abre **SQL Editor**, crea una consulta nueva y selecciona el rol **postgres**.

1. Abre `supabase/06_cuaderno_calendario.sql` en Visual Studio Code. Copia **todo** el archivo, pégalo en la consulta y pulsa Run. Debe terminar correctamente.
2. En otra consulta, ejecuta completo `supabase/07_comprobar_cuaderno.sql`. Deben aparecer **24 comprobaciones con resultado OK**.

**Solo 06 y 07 para esta actualización.** No vuelvas a crear el huerto o el administrador. No ejecutes 01, 03 o 04 de nuevo. Los archivos 04/05 se conservan como antecedentes; volver a ejecutar 04 después de 06 sustituiría una función ajustada por este parche.

La migración 06 está diseñada como una transacción repetible: añade tablas, permisos, funciones y seguimiento, sin recargar la semilla inicial ni cambiar deliberadamente tus cultivos, notas o asociaciones actuales. Importa las fechas anteriores disponibles una sola vez. El archivo 07 es de solo lectura y usa los recuentos actuales: no exige que sigan existiendo exactamente 109 goteros.

Si 06 falla, detente y conserva el mensaje completo. No sigas con 07 ni ejecutes fragmentos aislados. Si SQL Editor indica que la transacción sigue abortada, ejecuta `ROLLBACK;` antes de un nuevo intento completo corregido.

## 3. Instalar, comprobar y arrancar en el Mac

En Visual Studio Code: **Terminal > Nuevo terminal**, dentro de la carpeta nueva. Se mantiene el requisito del proyecto de Node **22.13.0 o superior**.

```bash
node --version
npm ci
```

Con las dependencias instaladas, comprueba el proyecto:

```bash
npm run check
```

Este comando ejecuta pruebas, tipos, lint y compilación. Si falla, conserva el mensaje; no lo interpretes como una comprobación superada. No uses `npm audit fix --force` como corrección automática.

Después arranca:

```bash
npm run dev
```

Abre `http://localhost:3000/aplicacion` (o el puerto de tu terminal) y entra con tu administrador habitual. Debe aparecer **VERSIÓN 0.4.0**, con las vistas Plano y cultivos, Calendario e Historial de cultivos.

Si aparece el aviso de migración pendiente, comprueba que 06 se ejecutó en el mismo proyecto configurado en `.env.local` y pulsa Actualizar. `/prototipo` permanece como referencia histórica local, no como copia de los datos reales.

## 4. Qué incorpora y cómo utilizarlo

### Seleccionar y editar varios goteros

Activa **Seleccionar varios** y pulsa los goteros. También hay selección con Comando/Ctrl y selección de un tramo con Mayúsculas; en móvil basta el selector y los toques. **Toda la fila** selecciona los puntos de la fila activa. Cambiar de fila limpia la selección: las operaciones por lote se hacen dentro de una misma fila.

Con dos o más goteros seleccionados, el panel permite añadir cultivos conservando los otros, retirar solo los marcados o sustituir las asociaciones. La sustitución exige confirmación. Crear un cultivo nuevo genera **un lote compartido** por los puntos seleccionados, no un lote por gotero. El administrador también puede eliminar varios goteros con confirmación. Las funciones anteriores de añadir/eliminar un punto siguen disponibles.

Si el lote ya existe, selecciónalo en vez de crearlo otra vez. Después de aplicar una operación múltiple se limpia la selección para no reutilizar una versión antigua del plano.

### Cultivos sobre tierra y tubos de riego

El fondo simula tierra y cada fila tiene una tubería. Los puntos asociados muestran emojis de los cultivos presentes, con nombres exactos al seleccionarlos o consultarlos. No todas las especies tienen un emoji propio: algunos iconos son compartidos o genéricos.

Se conserva **Este a la izquierda, Oeste a la derecha, F6 arriba y F1 abajo**. El punto 1 está en el oeste (derecha). En pantallas pequeñas el plano se desplaza horizontalmente dentro de su panel. Sigue siendo un esquema, no un plano a escala. Un punto sin icono significa **sin cultivo registrado**, no necesariamente vacío.

### Siembra, plantación y cosecha con fecha

Selecciona uno o varios goteros que compartan un cultivo ya asociado. En **Registrar fecha en la selección**, pulsa el nombre del cultivo. Elige actividad, fecha, precisión exacta/aproximada y notas. Puedes limitar el registro a los puntos seleccionados o dejarlo como registro del lote sin ubicación puntual confirmada.

También puedes abrir **Registrar siembra, plantación o cosecha** desde la ficha de un lote. Se admiten siembra, resiembra, plantación/trasplante y cosecha. Incorporación e inicio sin tipo confirmado conservan la semántica de datos anteriores.

Si la actividad ya figura en el calendario, edita ese registro en lugar de crear otro para el mismo hecho.

Las fechas representan hechos realizados: no se admiten fechas futuras. Una cosecha **no retira ni finaliza automáticamente el cultivo**: puedes registrar recolecciones sucesivas. Para retirar su asociación, utiliza el plano.

### Calendario

La pestaña Calendario ofrece vista mensual y agenda, con filtros de fila, actividad y lote. Las semanas empiezan en lunes. Pulsa un día para ver sus registros; usa las flechas o Ir al mes para consultar fechas antiguas. Los datos iniciales de septiembre/octubre de 2026 se encuentran en esos meses, no en el mes actual por defecto.

Desde la agenda puedes editar la fecha, actividad o notas, y anular un registro indicando un motivo. La anulación lo excluye del calendario activo, pero no destruye su historial. Editar una fecha conserva la fotografía histórica de puntos: no la sustituye por las asociaciones actuales.

### Historial por fila, gotero y cultivo

La pestaña Historial de cultivos agrupa **fila > gotero > cultivos y actividades**. Conserva los identificadores de los puntos aunque se renumeren o eliminen, y las asociaciones anteriores aunque retires el cultivo del plano.

Se distinguen expresamente dos hechos: **cuándo se asoció un cultivo en la aplicación** y **qué fecha declaraste para sembrar, plantar o cosechar**. No son equivalentes.

El seguimiento de ocupaciones comienza al aplicar este parche. La situación previa se marca como existente, con inicio desconocido. Las fechas ya guardadas se recuperan como registros de lote; no se inventan los goteros ocupados en aquellas fechas. Los registros sin puntos se muestran en un apartado propio dentro de la fila. Los eventos anulados pueden consultarse con Mostrar registros anulados.

## 5. Permisos, sincronización y datos

Administrador: consulta, notas, asociaciones, fechas y estructura de goteros. Editor: consulta, notas, asociaciones y fechas; no añade/elimina goteros. Lector: solo consulta. La verificación está en el servidor y en PostgreSQL; no depende únicamente de ocultar botones.

La lectura utiliza la sesión del usuario y RLS. Las nuevas escrituras pasan por funciones controladas. No se utiliza una clave service_role en el navegador ni para el acceso normal.

La actualización entre sesiones es **manual**, mediante Actualizar. Los formularios conservan su versión inicial para detectar conflictos. Ante un conflicto, cierra, actualiza, revisa y vuelve a abrir; no repitas a ciegas. Las nuevas fechas tienen un identificador de solicitud para evitar duplicar un reintento de la misma creación.

## 6. Validación de esta entrega

Ver `VALIDACION_0.4.0.md` para el alcance exacto. **81 pruebas de lógica superadas**; sintaxis TypeScript/TSX revisada y tipos estrictos de los módulos puros comprobados. Se ha revisado la presentación estática de las tres vistas en ordenador y móvil.

**No se ha completado aquí npm ci, lint, comprobación integral de tipos ni compilación de Next.js:** el entorno no pudo descargar dependencias. **No se ha ejecutado 06 contra PostgreSQL/Supabase**, ni probado una sesión real con tu base. Las comprobaciones anteriores no sustituyen esos pasos. El archivo 07 aporta 24 verificaciones de esquema/datos tras ejecutar 06, no una prueba integral de todas las operaciones.

La lista de pruebas manuales está en `docs/comprobar-0.4.0.md`.
