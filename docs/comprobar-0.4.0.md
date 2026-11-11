# Prueba de aceptación en el Mac y Supabase

Antes de empezar: 06 ejecutado correctamente, 24 resultados OK en 07, `npm run check` finalizado sin errores. Utiliza `/aplicacion` y la cuenta habitual.

## Plano y selección

Comprueba la orientación: Este izquierda, Oeste derecha, F6 arriba y F1 abajo. Comprueba tierra, tubos e iconos donde existan asociaciones. Selecciona dos goteros de una fila, desmarca uno, selecciona un tramo con Mayúsculas y prueba Toda la fila. En móvil usa Seleccionar varios y toques. Cambiar de fila debe limpiar la selección anterior.

Para probar la asignación, utiliza un cultivo y goteros cuya ubicación conozcas. Añadir un cultivo debe conservar los otros. Retirar solo los marcados no debe retirar los demás. Sustituir y eliminar puntos deben pedir confirmación. No borres goteros reales solo para hacer una prueba.

## Fechas y calendario

Selecciona los puntos de un cultivo conocido y registra una actividad real con fecha conocida. Confirma que aparece una sola vez en el calendario, con la precisión y los puntos elegidos. Una cosecha debe mantener el cultivo en el plano y admitir otra recolección en fecha diferente.

Recarga la página y verifica la persistencia. Cambia de mes, filtra por fila y lote, abre la agenda del día y edita las notas de la actividad. Si necesitas anular un registro erróneo, indica un motivo: debe desaparecer del calendario activo y aparecer en el historial al activar Mostrar registros anulados.

## Historial

Abre fila > gotero. Comprueba que se distinguen las altas/bajas de asociaciones en la aplicación y las fechas agronómicas declaradas. Las fechas anteriores sin ubicación puntual no deben repetirse arbitrariamente en todos los goteros actuales del lote.

En un entorno de prueba, confirma que eliminar un punto no elimina sus eventos ni las ocupaciones cerradas. Su identidad interna debe mantenerse como histórica aunque otro punto reciba su antiguo número. No uses esta comprobación destructiva sobre un gotero real que quieras conservar.

## Dos sesiones y roles

Abre otra ventana privada con la misma cuenta. Las actividades guardadas deben aparecer allí al pulsar Actualizar. Abre el mismo evento para editar en ambas sesiones: guarda en una y luego intenta guardar en la otra. La segunda debe informar conflicto, no sobrescribir silenciosamente la primera.

Si dispones de cuentas de editor y lector, comprueba que el editor puede asociar cultivos y registrar fechas, pero no eliminar goteros, y que el lector no puede escribir. Las pruebas de la misma cuenta en dos ventanas no validan los permisos de roles distintos.

Al finalizar, guarda cualquier error completo junto con la operación y la versión mostrada. No compartas contraseñas ni claves privadas.
