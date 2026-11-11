# Parche de ESLint para Sistema Monitorizacion 0.7.0

Motivo: en el Mac del usuario `npm run check` habia aprobado 157 pruebas y TypeScript, pero ESLint notificaba tres errores `react-hooks/set-state-in-effect` y una advertencia `@next/next/no-img-element`.

Archivos modificados:
- `src/components/gestion/useGestion.ts`: inicio asincrono de la carga desde el efecto, con cancelacion de la llamada pendiente cuando el componente se desmonta.
- `src/components/huerto/CalendarioHuerto.tsx`: inicio asincrono de la carga de notas, manteniendo la comprobacion `vivo` para evitar actualizar un componente desmontado.
- `src/components/pwa/PWASetup.tsx`: lectura reactiva de la conectividad con `useSyncExternalStore` en vez de `setState` sincrono en el efecto.
- `src/components/monitor/Adjuntos.tsx`: `next/image` sin optimizacion remota para las URL privadas y temporales de medios.

No hay migraciones SQL nuevas ni cambios en Supabase. Conservar `.env.local` privado y las copias de seguridad.

## Comprobacion en macOS

1. Respaldar la carpeta actual, descomprimir el ZIP corregido en una carpeta nueva y copiar alli `.env.local` de la version que funciona.
2. Abrir la carpeta con `package.json` en VS Code.
3. Ejecutar:

```
npm ci
npm run check
npm run dev
```

4. Comprobar el calendario, las notas del diario, la vista de adjuntos y el aviso de desconexion (sin guardar datos durante la prueba offline).
5. No desplegar en Vercel hasta que `npm run check` finalice sin errores.

## Alcance de validacion

El registro aportado por el usuario demuestra 157 pruebas aprobadas y `tsc --noEmit` correcto para el paquete anterior a este parche. Este nuevo paquete NO se ha podido comprobar con el flujo completo: las dependencias locales no estaban totalmente disponibles y `npm ci --offline` no pudo completarse. Debe validarse en el Mac.
