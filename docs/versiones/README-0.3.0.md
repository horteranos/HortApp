> DOCUMENTO HISTORICO DE 0.3.0. No utilizar para instalar 0.4.0. Ver README.md en la raiz.

# Huerto Alboraya - Etapa 2: gestión del plano

**Versión 0.3.0 · macOS.** Esta actualización permite gestionar goteros y asignarles lotes de cultivo desde el plano. La vista muestra **este a la izquierda, oeste a la derecha, F6 arriba y F1 abajo**. El punto 1 sigue siendo el más occidental: aparece a la derecha.

El acceso a la aplicación ya se ha confirmado. La persistencia entre dos sesiones y la actualización del esquema de esta versión siguen pendientes de comprobar en tu proyecto. Se conservan la base de datos, el administrador y la configuración que ya utilizas.

## 1. Abrir la actualización sin sustituir la carpeta anterior

1. Detén el servidor anterior desde su terminal con **Control + C**, no Comando + C.
2. Conserva la carpeta de la aplicación que ya funciona.
3. Crea una carpeta nueva, por ejemplo **Huerto_Alboraya_0_3_0**, y descomprime dentro `huerto-alboraya-etapa2-plano-macos.zip`.
4. El ZIP contiene una carpeta llamada **huerto-alboraya-etapa2**. Abre esa carpeta interna con **Visual Studio Code > Archivo > Abrir carpeta...**. Debe contener `package.json`.

Usar una carpeta contenedora nueva evita mezclar dos versiones cuyo directorio interno tiene el mismo nombre.

## 2. Copiar la configuración que ya funciona

Copia el archivo **`.env.local` de la carpeta anterior a la nueva**, junto a `package.json`. Puedes hacerlo desde Finder o Visual Studio Code. En Finder, **Comando + Mayúsculas + .** permite mostrar los archivos que empiezan por un punto.

La nueva carpeta debe utilizar los mismos valores de `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` que la aplicación anterior. Conserva el archivo en tu Mac; no necesitas pegar sus valores en el chat.

**No sustituyas ese archivo por `.env.example`**. Si `.env.local` ya está presente y configurado en la carpeta nueva, consérvalo.

## 3. Instalar las dependencias

Abre **Terminal > Nuevo terminal** en Visual Studio Code y ejecuta uno a uno:

```bash
node --version
npm --version
npm ci
```

El proyecto requiere **Node.js 22.13.0 o superior**. Si necesitas actualizarlo, instala una versión **LTS** compatible desde [Node.js](https://nodejs.org/en/download) y vuelve a abrir Visual Studio Code.

`npm ci` instala las versiones de `package-lock.json` y necesita conexión a Internet. Espera a que termine antes de continuar.

## 4. Aplicar la actualización de la base de datos

Este paquete necesita ejecutar **`supabase/04_gestion_plano.sql` sobre la base actual**:

1. Entra en el [panel de Supabase](https://supabase.com/dashboard) y abre el mismo proyecto del huerto.
2. Abre **SQL Editor** y crea una consulta nueva.
3. En Visual Studio Code, abre `supabase/04_gestion_plano.sql`, copia todo su contenido y pégalo en la consulta.
4. Selecciona el rol **postgres** en SQL Editor y ejecuta la consulta completa.
5. Comprueba que termina correctamente antes de usar las acciones nuevas del plano.
6. Ejecuta después `supabase/05_comprobar_plano.sql` en otra consulta del mismo proyecto. Es una comprobación de solo lectura: revisa sus resultados.

El archivo 04 es una actualización **idempotente**: puede volver a ejecutarse sin duplicar la instalación. Conserva los datos existentes. **No vuelvas a ejecutar los archivos 01 o 03, no borres tablas y no crees de nuevo el administrador.**

El archivo 05 contiene **13 comprobaciones** del esquema y los permisos actuales. Revisa que todas indiquen **OK**. El total de puntos puede variar y no tiene que volver a 109 después de editar el plano.

Si aparece un error, conserva el mensaje completo y detén este paso para revisarlo. No se presupone que la actualización ya se haya aplicado en tu proyecto.

## 5. Arrancar y acceder

```bash
npm run dev
```

Abre [la aplicación local](http://localhost:3000/aplicacion), utilizando otro puerto si así lo indica la terminal. Entra con el administrador existente.

Si modificas `.env.local`, detén el servidor con **Control + C** y vuelve a arrancarlo. La ruta **`/aplicacion`** utiliza Supabase. **`/prototipo`** conserva los datos históricos de la Etapa 1 y es de solo lectura; su orientación visual se adapta a la nueva vista, pero sus datos no se sincronizan con la base.

## 6. Usar el plano y comprobar la actualización

Las instrucciones de uso y la prueba breve están en [docs/actualizar-plano.md](docs/actualizar-plano.md).

| Acción | Administrador | Editor | Lector |
| --- | --- | --- | --- |
| Consultar plano, cultivos y notas | Sí | Sí | Sí |
| Añadir o eliminar goteros | Sí | No | No |
| Asociar o desasociar lotes presentes de la misma fila | Sí | Sí | No |
| Crear un lote sencillo en un punto | Sí | Sí | No |
| Editar notas | Sí | Sí | No |

Una cuenta sin membresía del huerto no obtiene acceso. Los permisos se comprueban en el servidor y en la base de datos; el rol mostrado por la interfaz no sustituye esas comprobaciones.

Los lotes nuevos se crean mediante la operación controlada del plano. El acceso directo a los lotes permite su lectura y, a quienes tienen permiso, la edición de notas; las demás escrituras directas están bloqueadas.

### Qué significa editar el plano

- Al seleccionar una fila, el administrador puede añadir un gotero; al seleccionar un punto, puede consultar sus asociaciones y eliminarlo con confirmación.
- El selector de cultivos trabaja con **lotes presentes de esa misma fila**. Un lote puede corresponder a varias plantas. Se admiten varios lotes asociados a un mismo punto; desmarcar uno retira su asociación, sin eliminar el lote.
- También se puede crear un lote sencillo indicando cultivo y, opcionalmente, variedad. Las fechas y cantidades no informadas permanecen desconocidas; asociarlo a un gotero no equivale a registrar una planta ni una fecha de siembra.
- Eliminar un gotero elimina ese punto y sus asociaciones. **Los lotes de cultivo permanecen**, al igual que sus notas y sus asociaciones a otros puntos.
- Insertar o eliminar puntos puede cambiar su numeración visible. Los puntos conservados mantienen sus identificadores internos, por lo que sus asociaciones siguen vinculadas al mismo punto.

Pulsa **Actualizar** para consultar cambios de otra sesión. La actualización es manual; no se utiliza Supabase Realtime. Si aparece un conflicto, conserva el borrador, cierra el formulario, actualiza y vuelve a abrirlo antes de revisar y guardar.

### Datos e incertidumbres que se conservan

La carga original tenía seis filas, 109 puntos de goteo y 21 lotes o árboles. Al editar el plano o crear lotes, los recuentos pueden cambiar; ya no son cifras fijas que deba mantener la aplicación.

Se conservan las cebollas Babosa plantadas el **31/10/2026**, en el **este de F5**, con cantidad declarada de **15**; y los guisantes Rondo asociados a **nueve puntos del oeste de F6**, con siembra **aproximada del 18/10/2026**, resiembra del **24/10/2026** y observación «salieron 2». Esta observación no se convierte en un recuento actual de plantas vivas.

El plano sigue siendo esquemático. **Un punto sin cultivo registrado puede estar ocupado**. Las cantidades desconocidas no se convierten en cero y no se inventan ubicaciones, fechas ni número de plantas. Los números de los puntos pueden variar al modificar la fila; las asociaciones identifican los puntos correspondientes.

## Verificación de esta versión

| Comprobación | Estado |
| --- | --- |
| Pruebas automatizadas de la versión 0.3.0 | **38/38 superadas** |
| TypeScript, lint y compilación de producción | **Superados, sin errores** |
| Pruebas SQL en PGlite | **26/26 grupos superados** |
| Comprobación SQL 05 en el entorno de pruebas | **13/13 OK con 109, 110 y 108 puntos** |
| Aplicación del SQL 04 en tu proyecto de Supabase | Pendiente de confirmar |
| Acceso con el administrador en la versión anterior | Confirmado por el usuario |
| Persistencia y conflictos entre dos sesiones | Pendientes de comprobar |
| Revisión visual de la interfaz en navegador | Pendiente en el Mac |

La lectura paginada también se ha comprobado con una API limitada a 100 registros por respuesta.

Para las comprobaciones locales, detén el servidor y ejecuta, uno a uno:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

La validación técnica del paquete no sustituye la prueba con tu base real. La prueba de roles con un segundo usuario distinto también queda pendiente. El [plan de etapas](docs/etapas.md) mantiene los siguientes pasos del proyecto.
