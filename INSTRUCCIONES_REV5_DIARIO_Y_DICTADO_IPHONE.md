# Revisión 5 — Guardado del Diario y dictado desde Safari del iPhone

## Problema identificado

En Safari del iPhone, al abrir `http://IP_LOCAL_DEL_MAC:3000/aplicacion`, `crypto.randomUUID()` puede no estar disponible, porque solo funciona en un contexto seguro (HTTPS o localhost). El error en `Diario.tsx` línea 35 se produce al generar el ID de la nota antes de llamar a Supabase. Esta misma función existía en el registro de eventos y en la subida de adjuntos.

## Correcciones

- Función `generarUUID()` en `src/lib/seguridad/uuid.mjs`, que mantiene `randomUUID()` en HTTPS y usa `getRandomValues()` de forma criptográficamente segura en HTTP local. Sin `Math.random`.
- Diario: el guardado genera el ID dentro del bloque `try/catch`, conserva el borrador si falla y evita errores no capturados.
- Registro de actividades y adjuntos: usan el mismo generador de UUID, para evitar nuevos fallos de iPhone.
- Dictado: el botón web solo se habilita cuando hay contexto seguro y el navegador expone reconocimiento de voz. En HTTP local, se muestra una alternativa para usar el micrófono del teclado del iPhone, que no requiere acceder al Web Speech API desde nuestra aplicación.
- NO incorpora almacenamiento de audios: el objetivo es transcribir voz a texto.

## Instalación recomendada (ZIP completo)

1. Detener el servidor anterior con Control+C. Conservar copia del proyecto anterior.
2. Descomprimir el ZIP nuevo en una carpeta diferente.
3. Abrir la carpeta `sistema-monitorizacion-0.7.0-rev5` que contiene `package.json`.
4. Copiar el `.env.local` privado de la versión anterior a esta carpeta. NO enviarlo ni subirlo a GitHub.
5. En terminal, ejecutar:

```
npm ci
npm run check
npm run dev -- -H 0.0.0.0
```

6. En Safari del iPhone, abrir `http://IP_DEL_MAC:3000/aplicacion`, reemplazando IP_DEL_MAC por la IP real del Mac; utilizar el puerto indicado por Next.js.
7. Entrar en Diario, escribir una entrada de prueba etiquetada y guardarla. Comprobar que aparece tras recargar. Si se borra la nota de prueba, utilizar el mecanismo de anulación del Diario.
8. Para dictar por ahora: tocar el campo Nota, tocar el icono de micrófono en el teclado del iPhone y hablar; revisar el texto antes de guardar. Si no aparece el micrófono, ir a Ajustes > General > Teclado > Activar dictado.
9. Comprobar el registro de actividades y la selección de imágenes o vídeos como pruebas separadas; NO incluir adjuntos personales durante la comprobación inicial.

## Para usar el botón web de dictado

Publicar bajo HTTPS (por ejemplo Vercel en plan gratuito personal) y comprobar que Safari permite SpeechRecognition / webkitSpeechRecognition y el permiso de micrófono. HTTPS es necesario para estas APIs, pero NO garantiza por sí solo que el reconocimiento web esté disponible o funcione en todas las versiones de iOS. El dictado del teclado sigue siendo una alternativa independiente.

## Limitaciones y seguridad

- No ejecutar ninguna migración SQL por este cambio: no toca tablas ni permisos.
- NO publicar el servidor local `next dev` en Internet ni abrir puertos del router.
- Si `npm run check` falla, no publicar la versión.
- Esta corrección no arregla por sí sola problemas de lectura de recuentos ni permisos Supabase.
