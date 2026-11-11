# Instalacion controlada de Sistema Monitorizacion 0.6.1

## 1. Preparacion y seguridad

1. Antes de nada, conserva una copia de la carpeta anterior que FUNCIONA en tu Mac, una copia de seguridad de Supabase y tu archivo `.env.local` privado.
2. Deten el servidor anterior con Control + C en su terminal.
3. Descomprime este ZIP en una carpeta NUEVA: `sistema-monitorizacion-0.6.1`. Abre esa carpeta en Visual Studio Code.
4. Copia desde la instalacion anterior el archivo `.env.local` a la raiz de esta nueva carpeta. Nunca lo adjuntes a un chat ni lo incluyas en un ZIP compartido.
5. No crees un proyecto nuevo Supabase y no vuelvas a importar el inventario inicial. Mantener los permisos de administrador, editor y lector.

## 2. Comprobar el estado de la base de datos

Esta version NO necesita scripts SQL adicionales. Usa las mismas tablas y datos de 0.6.0.

El respaldo del 04/11/2026 no confirma que SQL 10 corregido se ejecutara ni que SQL 11 diera 14 comprobaciones OK. Tampoco confirma el estado real de las migraciones 08/09 (24 OK). Si esos pasos estan pendientes, hay que confirmarlos en el Supabase existente y seguir `INSTRUCCIONES_0.6.0.md` SOLO para las migraciones faltantes. No repitas un script SQL que ya este aplicado.

Para que el contador actual funcione, tiene que existir `sm_recuentos` con sus politicas de acceso. Si esta tabla no esta disponible, veras un mensaje de error en el panel.

## 3. Ejecutar en macOS

En la carpeta que contiene `package.json`, abre Terminal y ejecuta uno por uno:

```bash
node --version
npm ci
npm run check
npm run dev
```

Abre `http://localhost:3000/aplicacion` e inicia sesion con la cuenta existente. Node.js 22.13 o superior. Si `npm run check` falla, NO sustituyas tu version anterior funcional; conserva el mensaje completo.

## 4. Comprobaciones recomendadas

- En Plano y cultivos selecciona F6. Comprueba que el numero registrado del guisante se muestra A LA DERECHA del nombre. Pulsa Modificar, guarda otro numero de prueba y verifica que el distintivo cambia; deja luego el valor real. No debe cambiar el numero de goteros.
- Los cultivos sin recuento nuevo mostraran un valor inicial IDENTIFICADO como historico o Sin recuento; no se hace pasar por un recuento real.
- Comprueba que no existe la pestana Plagas y enfermedades ni el boton de analisis fotografico. Las fotografias antiguas del Diario no se eliminan.
- En Plano y cultivos, consulta el resumen de avisos meteorologicos; en Avisos 72 h verifica que se describen posibles efectos y cultivos a revisar cuando se superen umbrales. Si no hay prevision vigente, debe mostrar una advertencia; no inventar alertas.
- En Calendario marca Cosechas orientativas. Abre los meses siguientes y verifica las ventanas de cultivo; pulsa un dia del intervalo y comprueba que la previson se separa de las cosechas realmente registradas. Una resiembra parcial NO tiene que alterar la fecha del lote entero. Los inicios heredados sin etiqueta de siembra/trasplante deben mostrarse como base provisional, con advertencia.
- Verifica de nuevo semillero, diario, tareas, rotaciones, historial y el acceso segun roles.

## 5. Limitaciones explicitas

Los plazos de cosecha son aproximaciones y dependen de la variedad, epoca, estado real y condiciones locales. La aplicacion no confirma madurez ni recoge cantidad de produccion. Si no se conoce bien la fecha de siembra/trasplante, no se asigna una fecha ficticia. El catalogo de intervalos esta en `src/lib/huerto/cosechas.ts` y puede calibrarse con los datos de cosecha reales posteriores.

La meteorologia procede de un modelo externo (Open-Meteo); no equivale a sensores de temperatura, humedad o lluvia en el huerto. Los efectos sobre el cultivo son orientativos y no constituyen diagnostico. Los avisos locales solo se generan mientras la aplicacion y/o el agente correspondiente tengan disponibilidad. No hay notificaciones push garantizadas con el Mac apagado.

## 6. Estado de las pruebas

Validacion en este entorno: 65 archivos TS/TSX analizados sin errores de sintaxis, comprobacion estricta de tipos de las dos librerias nuevas y 12 tests focalizados aprobados. No se pudo completar `npm ci`, `npm run check`, ni comprobar la integracion real con Supabase por falta de acceso a todas las dependencias npm y a las credenciales privadas. Es necesario ejecutar la comprobacion completa en tu Mac antes de sustituir la version anterior.
