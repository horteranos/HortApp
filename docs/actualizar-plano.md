> HISTORICO DE 0.3.0. Para instalar 0.4.0 usa README.md de la raiz; solo SQL 06 y 07. No repitas SQL 04 despues de 06.

# Actualizar y utilizar el plano del huerto

**Versión 0.3.0.** El usuario ya ha confirmado el acceso en la versión anterior de la aplicación conectada. La actualización añade gestión de goteros y de sus asociaciones con lotes de cultivo.

## 1. Instalar la actualización

1. Detén la aplicación anterior con **Control + C** y conserva su carpeta.
2. Descomprime `huerto-alboraya-etapa2-plano-macos.zip` dentro de una carpeta nueva. Abre en Visual Studio Code la carpeta interna **huerto-alboraya-etapa2**, que contiene `package.json`.
3. Copia a esa carpeta el **`.env.local` de la versión que ya funciona**, utilizando Finder o Visual Studio Code. No lo sustituyas por `.env.example` ni pegues las claves en el chat.
4. Ejecuta `npm ci`. Se requiere Node >=22.13.0; se recomienda una versión LTS compatible.
5. En tu proyecto actual de Supabase, abre **SQL Editor**, selecciona el rol **postgres** y ejecuta completo `supabase/04_gestion_plano.sql`.
6. Ejecuta después `supabase/05_comprobar_plano.sql`, que solo consulta la base, y comprueba que sus **13 comprobaciones indican OK**.
7. Si la actualización y sus comprobaciones terminan correctamente, ejecuta `npm run dev` y entra en `/aplicacion` con tu administrador existente.

El SQL 04 modifica la instalación existente y es idempotente. **No ejecutes de nuevo los archivos 01 o 03, no borres datos y no recrees el administrador.** Si falla, conserva el mensaje para revisarlo antes de continuar.

Para comprobar esta versión utiliza el SQL 05. Revisa el esquema y los permisos de la gestión del plano; no exige un total fijo de 109 goteros cuando ya has añadido o eliminado puntos.

Estas instrucciones no significan que el SQL ya se haya aplicado en tu proyecto; esa ejecución sigue pendiente de confirmación.

## 2. Entender la orientación y la numeración

| Elemento | Posición en pantalla |
| --- | --- |
| Este | Izquierda |
| Oeste | Derecha |
| F6 | Fila superior |
| F1 | Fila inferior |
| Punto 1 de cada fila | Extremo derecho, porque se numera desde el oeste |

El cambio de vista no cambia por sí solo las asociaciones guardadas. Los guisantes vinculados a los goteros del oeste de F6 aparecen en el extremo derecho de la fila superior.

Al añadir o eliminar un punto, la numeración visible puede reorganizarse para mantener el orden desde el oeste. Cada punto conservado mantiene su **identificador interno (UUID)**, por lo que sus cultivos siguen asociados al punto correspondiente aunque cambie el número mostrado.

Un gotero sin cultivos asociados significa **ubicación no registrada**, no necesariamente un espacio vacío. El plano sigue siendo esquemático y no permite deducir cantidades de plantas ni distancias nuevas.

## 3. Añadir un gotero

**Permiso necesario: administrador.**

1. Selecciona la fila.
2. Pulsa **+ Añadir gotero a F...**.
3. Rellena **Nueva posición, contando desde el oeste**: `1` inserta al oeste, a la derecha; el número de puntos actual más uno añade al este, a la izquierda. Por ejemplo, si hay 19 puntos, escribe `20` para añadir al este. Una posición intermedia inserta entre puntos y desplaza los números posteriores.
4. Pulsa **Añadir gotero**, espera el mensaje **«Punto de goteo añadido.»** y comprueba que el nuevo punto aparece en la fila.

El recuento del plano se obtiene de la base. Las cifras originales de 109 goteros son una referencia de la instalación inicial; pueden cambiar con estas operaciones.

## 4. Asociar cultivos a un punto

**Permiso necesario: administrador o editor.**

### Utilizar un lote existente

1. Selecciona el punto que quieres completar.
2. El formulario puede abrirse directamente; si está cerrado, pulsa **Editar cultivos del gotero**.
3. Marca los lotes que correspondan en **Lotes existentes en esta fila**. Se muestran los que están presentes en **esa misma fila**.
4. Pulsa **Guardar cultivos del gotero**, espera **«Cultivos del punto guardados.»** y comprueba la asociación.

El selector utiliza lotes, no nombres de cultivo sin contexto. Por ejemplo, dos lotes de lechugas son registros distintos aunque compartan el nombre del cultivo. Asociar un lote existente no crea otro lote ni cambia su cantidad declarada.

Se admite **más de un lote por punto** y un mismo lote puede estar asociado a varios puntos. Una asociación no equivale a una planta individual.

Para retirar una asociación, desmarca el lote y guarda. El lote sigue existiendo. Desmarcar todos los lotes presentes y dejar vacíos los campos de cultivo nuevo retira las asignaciones actuales mostradas en el selector; las asociaciones históricas de lotes finalizados se conservan.

### Crear un lote sencillo en el punto

1. Selecciona el punto y abre el mismo formulario de cultivos del gotero.
2. Busca **Añadir un cultivo nuevo a este punto** e introduce el nombre en **Cultivo nuevo** y, si la conoces, su **Variedad**. Si el lote ya aparece en el selector superior, márcalo allí para evitar duplicarlo.
3. Pulsa **Guardar cultivos del gotero** y comprueba que el lote nuevo queda asociado a ese punto de la fila.

Las cantidades y fechas no informadas permanecen **sin confirmar**. La fecha de creación del registro no se utiliza como fecha de siembra o trasplante, y no se deduce una cantidad de una planta por gotero.

## 5. Eliminar un gotero

**Permiso necesario: administrador.**

1. Selecciona el punto que quieres eliminar y revisa sus cultivos asociados.
2. Pulsa **Eliminar este gotero**.
3. Lee el resumen, marca **Confirmo que quiero eliminar este gotero** y pulsa **Eliminar gotero** únicamente si ese es el punto que quieres retirar del plano.

Se elimina **el punto y sus asociaciones**. **Los lotes de cultivo permanecen en la fila**, con sus notas y sus demás asociaciones a otros puntos. Si un lote solo estaba asociado al punto eliminado, seguirá existiendo sin esa ubicación registrada.

El resultado correcto muestra **«Punto eliminado. Los cultivos y sus notas se conservan.»**

La numeración de los puntos restantes puede cambiar. Comprueba el punto seleccionado por su posición y sus asociaciones, no únicamente por un número recordado de una edición anterior.

## 6. Actualización manual y conflictos

Pulsa **Actualizar** para recuperar cambios guardados desde otra sesión. No se espera actualización automática en tiempo real.

La versión del plano se comprueba **por fila**. Si se modifican puntos o asociaciones de una fila mientras tienes abierto un formulario de esa fila, el guardado antiguo debe avisar del conflicto, incluso si la otra edición afecta a otro punto. Conserva cualquier borrador que quieras mantener y pulsa **Cerrar y actualizar**; después vuelve a abrir el formulario para revisar la versión actual antes de guardar.

La edición de notas mantiene también su protección mediante `actualizado_en`. Actualizar una página con un formulario abierto no debe reinterpretarse como autorización para sobrescribir cambios ajenos.

## 7. Prueba breve con dos sesiones

Utiliza el **mismo administrador existente** en dos sesiones independientes: por ejemplo, Safari y Chrome, o una ventana normal y una privada. Esta prueba no requiere crear un usuario nuevo.

La prueba añade un punto temporal y lo elimina al terminar. **Utiliza lotes existentes; no crees lotes de prueba que después quedarían en el inventario.**

### A. Añadir un punto temporal y asociar un lote

1. Inicia sesión en las ventanas **A** y **B** y confirma que ambas muestran el mismo huerto.
2. Selecciona una fila que tenga varios lotes existentes, por ejemplo F1. Anota cuántos puntos tiene y cuántos lotes aparecen.
3. En A, añade un punto temporal en el **extremo este: a la izquierda**.
4. Selecciona ese punto y asocia un lote existente de la misma fila.
5. En B, pulsa **Actualizar** y comprueba que aparecen el punto y su asociación.

**Resultado esperado:** hay un punto más, el lote existente está asociado a él y el número de lotes no ha aumentado.

### B. Comprobar persistencia y conflicto

1. En B, cierra sesión, vuelve a entrar y comprueba que el punto y la asociación siguen guardados.
2. Actualiza ambas ventanas y abre en las dos la edición de los cultivos del mismo punto temporal.
3. En A, selecciona otro lote existente de la misma fila y guarda el cambio.
4. Sin cerrar ni actualizar el formulario que ya estaba abierto en B, intenta guardar desde B.
5. Comprueba que B recibe un aviso de conflicto y que no desaparece el cambio guardado por A.
6. Cierra el formulario de B, pulsa **Actualizar** y vuelve a abrirlo para consultar el estado actual.

**Resultado esperado:** los datos sobreviven a un nuevo inicio de sesión y el segundo formulario no sobrescribe una versión que ya ha cambiado. Las dos sesiones de administrador actúan aquí como dos editores; los límites entre roles diferentes se comprobarán con otro usuario en una subetapa posterior.

### C. Eliminar solo el punto temporal

1. En A, cierra los formularios abiertos, pulsa **Actualizar** y selecciona el punto temporal del extremo este.
2. Solicita su eliminación y confirma que se retirarán el punto y sus asociaciones.
3. En B, cierra el formulario anterior y pulsa **Actualizar**.
4. Comprueba que el punto temporal ya no aparece.
5. Comprueba que los lotes que utilizaste siguen en la fila y que sus asociaciones anteriores a otros puntos se conservan.

**Resultado esperado:** se recupera el número de puntos inicial de la prueba, permanecen los lotes originales y únicamente desaparecen las asociaciones al punto temporal.

### Registrar el resultado

| Comprobación | Resultado |
| --- | --- |
| Vista este/izquierda, oeste/derecha, F6 arriba, F1 abajo | [pendiente] |
| Punto 1 en el extremo derecho | [pendiente] |
| Alta del punto temporal al este | [pendiente] |
| Asociación a lote existente de la misma fila | [pendiente] |
| Lectura desde la segunda sesión tras Actualizar | [pendiente] |
| Persistencia después de volver a iniciar sesión | [pendiente] |
| Conflicto detectado con dos formularios abiertos | [pendiente] |
| Eliminación del punto sin eliminar los lotes | [pendiente] |

Si un paso falla, conserva el mensaje y el paso concreto. No repitas la instalación de la base ni recrees el administrador para intentar corregirlo.

## Estado de validación

La versión 0.3.0 ha superado **38/38 pruebas de aplicación**, **TypeScript, lint y compilación sin errores**, y **26/26 grupos de pruebas SQL en PGlite**. Las 13 comprobaciones del SQL 05 han dado OK en escenarios de prueba con **109, 110 y 108 puntos**. También se ha comprobado la lectura paginada con una API limitada a 100 registros por respuesta.

Estos resultados corresponden al entorno de preparación. **La migración en tu proyecto real, la prueba interactiva con dos sesiones y la revisión visual en navegador siguen pendientes en el Mac.** El acceso a la versión anterior está confirmado. La validación con usuarios de roles diferentes se realizará en una subetapa posterior.
