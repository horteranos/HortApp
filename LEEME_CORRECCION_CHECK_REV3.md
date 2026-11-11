# Sistema Monitorización 0.7.0 — corrección de ESLint (rev. 3)

## Error que resuelve
`npm run check` se detenía tras superar 164 pruebas y TypeScript por un único aviso convertido en error de ESLint: `extname` estaba importado, pero no se utilizaba en `tests/estructura-imports.test.mjs`, línea 4. Se ha retirado únicamente `extname` del import de `node:path`. No cambia la lógica de la aplicación.

## Opción preferida: parche mínimo
Usar el archivo `tests/estructura-imports.test.mjs` incluido en el ZIP de parche y reemplazar el de la misma ruta en la carpeta actual del proyecto, SIN copiarlo a la raíz.
No es necesario volver a ejecutar `npm ci` si ya terminó correctamente.

```bash
npm run check
```

## Alternativa: proyecto completo
Descomprimir el ZIP completo en una carpeta independiente. Copiar el `.env.local` privado desde la versión actual. `npm ci` y luego `npm run check`. No mezclar archivos de versiones distintas. No incluir `.env.local` al compartir archivos ni en GitHub.

## Validación disponible
- `node --check tests/estructura-imports.test.mjs` sin errores.
- `node --test tests/estructura-imports.test.mjs`: 6/6 superadas.
- Se ha conservado la lógica de las 164 pruebas anteriores.
- NO se ha podido ejecutar `npm run check` completo aquí: la instalación de dependencias npm no finaliza en este entorno. Debe ejecutarse en el Mac.

## Seguridad previa al despliegue en Vercel
`npm ci` avisó de 9 vulnerabilidades moderadas; sin `npm audit` detallado no se puede determinar qué paquetes son vulnerables ni si afectan a producción. Ejecutar `npm audit` y `npm audit --omit=dev` en el Mac y revisar las dependencias afectadas ANTES de publicar. No ejecutar `npm audit fix --force` sin evaluar las actualizaciones propuestas.

Supabase y SQL no se modifican con este parche.
