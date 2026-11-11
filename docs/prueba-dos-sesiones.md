# Prueba inicial con dos sesiones

## Objetivo

Comprobar en el Mac que las notas se guardan en Supabase, que otra sesión puede recuperarlas mediante **Actualizar** y que una edición antigua no sobrescribe un cambio más reciente.

Esta primera prueba utiliza **el mismo administrador existente en dos sesiones independientes**. No hace falta crear otra cuenta ni volver a ejecutar el SQL. La prueba con un segundo usuario real y roles diferentes se realizará en la siguiente subetapa.

Las operaciones de prueba guardan notas reales. Elige un lote, conserva el texto original y restáuralo al terminar.

## 1. Preparar las dos sesiones

1. Arranca la aplicación con `npm run dev` desde la carpeta de la Etapa 2.
2. Abre `http://localhost:3000/aplicacion`, o la dirección y puerto que indique la terminal.
3. Utiliza dos contextos separados. Por ejemplo, una ventana normal de Safari y otra de Chrome. También sirve una ventana normal y una privada del mismo navegador.
4. Identifícalas para esta prueba como **ventana A** y **ventana B**.
5. Inicia sesión en ambas con el correo y la contraseña del mismo administrador existente.
6. Comprueba en ambas que aparece el rol **Administrador**.

Dos pestañas normales del mismo navegador suelen compartir sesión. Para este protocolo utiliza los dos contextos separados indicados.

## 2. Comprobar los datos de partida

En ambas ventanas, revisa que se muestran:

- Seis filas: F1 a F6.
- 109 puntos de goteo: 19 en F1 y 18 en cada una de F2 a F6.
- 21 lotes o árboles registrados en la carga inicial.
- Cebollas Babosa plantadas el 31/10/2026 en la parte este de F5, con cantidad declarada de 15.
- Guisantes Rondo asociados a nueve puntos consecutivos del oeste de F6, junto al limonero.
- Fecha aproximada de siembra de los guisantes del 18/10/2026 y resiembra del 24/10/2026.
- La observación «salieron 2» conservada en las notas, sin convertirla en un recuento actual de plantas vivas.
- Cantidades desconocidas expresadas como **sin confirmar**.

Si los datos no coinciden, anota la diferencia antes de continuar. No repitas la instalación de la base para intentar corregirla.

## 3. Elegir un lote y conservar sus notas

1. Selecciona la misma fila y el mismo lote en A y B. Puedes usar, por ejemplo, la salvia de F1.
2. Pulsa **Editar notas** en A.
3. Copia las notas originales en un archivo de texto temporal. Si el campo está vacío, anota que estaba vacío.
4. Conserva el nombre del lote elegido para usar siempre el mismo durante la prueba.

Los textos que se añaden a continuación son marcadores de prueba, no observaciones agronómicas.

## 4. Probar guardado y actualización manual

1. En A, añade al final de las notas una línea que diga `PRUEBA A: guardado desde la primera sesión`.
2. Pulsa **Guardar notas** y espera a que termine.
3. Cierra el editor de A.
4. En B, deja cerrado cualquier editor de notas y pulsa **Actualizar**.
5. Selecciona el mismo lote si fuera necesario y comprueba que aparece el marcador añadido desde A.

**Resultado esperado:** B recupera la nota guardada por A. La actualización requiere pulsar el botón; no se espera que ocurra automáticamente.

## 5. Probar que los datos persisten

1. Cierra la sesión de B mediante **Cerrar sesión**.
2. Vuelve a entrar en B con el mismo administrador y consulta el lote.
3. Comprueba que la nota de prueba sigue presente.
4. Detén el servidor en la terminal con **Control + C**.
5. Arráncalo de nuevo con `npm run dev` y utiliza el puerto que indique.
6. Recarga la aplicación, inicia sesión si se solicita y vuelve a consultar el mismo lote.

**Resultado esperado:** la nota sigue disponible después de volver a iniciar sesión y de reiniciar el servidor local. Su conservación no depende de que la ventana de A permanezca abierta.

## 6. Probar el conflicto de dos ediciones

Esta secuencia utiliza dos editores abiertos sobre la misma versión del lote. Mantén el orden de los pasos.

1. En A y B, cierra los editores de notas que queden abiertos y pulsa **Actualizar**.
2. En ambas ventanas, abre **Editar notas** del mismo lote. Las dos deben mostrar el mismo texto inicial.
3. En A, añade la línea `PRUEBA CONFLICTO A: este cambio se guarda primero`.
4. En B, añade una línea distinta: `PRUEBA CONFLICTO B: borrador abierto antes del cambio de A`.
5. Guarda en A y espera a que termine correctamente.
6. Sin recargar B ni cerrar su editor, pulsa **Guardar notas** en B.

**Resultado esperado:** B recibe un aviso de conflicto y su segundo guardado se rechaza. El cambio guardado en A permanece en la base. El botón de guardar de B queda bloqueado hasta que se cierre y se vuelva a abrir el editor con la versión actual.

### Resolver el conflicto sin perder el borrador

1. Copia el texto que quieras conservar de B en un archivo de texto temporal.
2. En B, pulsa **Cancelar** para cerrar el editor.
3. Pulsa **Actualizar**.
4. Comprueba que aparece `PRUEBA CONFLICTO A: este cambio se guarda primero`.
5. Abre **Editar notas** y revisa las notas actuales.
6. Añade, si quieres, una línea de prueba combinada: `PRUEBA COMBINADA: versión revisada después del conflicto`.
7. Guarda de nuevo y comprueba desde A, pulsando **Actualizar**, que aparece la versión revisada.

**Resultado esperado:** el guardado funciona después de revisar la versión actual. No se reintenta automáticamente una escritura con un borrador antiguo.

El botón **Actualizar**, usado con un editor abierto, conserva la versión de ese borrador. Para resolver el conflicto hay que cerrar el editor y abrirlo de nuevo después de consultar los datos actuales.

## 7. Restaurar las notas originales

1. Cierra los editores abiertos en ambas ventanas.
2. Pulsa **Actualizar** en A y abre **Editar notas**.
3. Sustituye todo el contenido por las notas originales conservadas en el apartado 3. Si estaban vacías, deja el campo vacío.
4. Guarda y cierra el editor.
5. En B, pulsa **Actualizar** y comprueba que se han retirado todos los marcadores de prueba.

Así se conserva la información original del lote y se evitan registros de prueba confundidos con observaciones del huerto.

## 8. Registrar el resultado

Marca el resultado de cada comprobación:

| Comprobación | Resultado esperado | Resultado obtenido |
| --- | --- | --- |
| Acceso en A y B | Ambas sesiones acceden como administrador | [pendiente] |
| Datos del huerto | Seis filas, 109 puntos y 21 lotes o árboles de la carga instalada | [pendiente] |
| Guardado desde A | La nota queda guardada | [pendiente] |
| Actualización desde B | La nota de A aparece al pulsar Actualizar | [pendiente] |
| Nuevo inicio de sesión | La nota persiste | [pendiente] |
| Reinicio del servidor local | La nota persiste | [pendiente] |
| Segunda edición antigua | B recibe conflicto y no sobrescribe A | [pendiente] |
| Revisión del conflicto | Se puede guardar tras cerrar, actualizar y reabrir | [pendiente] |
| Restauración | Las notas originales vuelven a estar en ambas sesiones | [pendiente] |

Si una comprobación falla, conserva el paso concreto, el texto del mensaje y qué lote estabas usando. No compartas contraseñas ni el contenido de `.env.local`.

## Qué valida esta prueba y qué queda pendiente

Este protocolo comprueba la conexión real, persistencia, actualización manual y protección frente a ediciones simultáneas de un mismo lote.

Al utilizar el mismo administrador, **no valida los límites entre usuarios con roles diferentes**. Queda pendiente la siguiente subetapa con un segundo usuario real: lectura sin escritura para un lector, escritura para un editor y denegación de acceso a una cuenta sin membresía. Ese procedimiento se preparará después, sin repetir la instalación actual.

Las 25 pruebas automatizadas, la compilación de producción y el lint han superado sus comprobaciones durante la preparación. No sustituyen este protocolo: no se ha accedido desde ese entorno al proyecto real de Supabase ni se ha realizado una revisión visual en navegador.
