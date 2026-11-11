# Sistema Monitorizacion 0.7.0 rev4: reparacion de interactividad iPhone en LAN

## Motivo

El servidor de desarrollo Next.js 16 puede rechazar peticiones desde la IP local del Mac.
La pagina se dibuja desde el servidor, pero React no se hidrata: no funcionan
las pestanas, los goteros ni los recuentos cargados en el navegador.

Esta revision agrega `allowedDevOrigins` solo para las direcciones IPv4 privadas
que detecta el Mac. No se usa un comodin y no cambia el despliegue de produccion.

## Pasos

1. Conservar la carpeta anterior y los datos existentes. No modificar Supabase.
2. Descomprimir el proyecto completo rev4 en una carpeta nueva.
3. Copiar el `.env.local` privado desde la carpeta anterior; no compartirlo.
4. En Visual Studio Code, abrir la carpeta que contiene `package.json`.
5. En la terminal, con el servidor anterior detenido, ejecutar:

```
npm ci
npm run check
npm run dev -- -H 0.0.0.0
```

6. En una segunda terminal, identificar la IP del Mac:

```
ipconfig getifaddr en0
```

7. En Safari del iPhone, conectado a la misma Wi-Fi, abrir
   `http://IP_DEL_MAC:3000/aplicacion` (sustituir IP_DEL_MAC).
   Asegurarse de que Next utiliza el puerto 3000; en caso contrario,
   utilizar el puerto que muestre el servidor.
8. Comprobar que desaparece el aviso `Controles interactivos pendientes de activar`.
   Solo entonces probar Menu, Calendario, Tareas, Tiempo, seleccion de goteros
   y recuentos. Si persiste, revisar la terminal por mensajes
   `Blocked cross-origin request to Next.js dev resource`.
9. Si la pagina sigue sin responder, recargarla sin usar una copia guardada
   en pantalla de inicio; usar Safari directamente. En Mac Safari,
   puede inspeccionarse la consola remota del iPhone desde el menu Desarrollo.

## Seguridad y limites

- Solo se habilitan IP privadas de las interfaces de red detectadas por el Mac
  cuando el servidor se ejecuta en modo desarrollo.
- No exponer `next dev` a Internet, puertos del router ni tuneles publicos.
- No habilita el service worker ni el modo PWA completo bajo HTTP con IP local.
  Eso se verificara con HTTPS tras el despliegue.
- Si los controles funcionan pero los recuentos muestran error, revisar
  `gestion.error` y el estado de las migraciones 10/11 antes de ejecutar SQL.
- No se tocan las tablas ni las credenciales de Supabase.

## Archivos modificados sobre rev3

- `next.config.ts`: allowlist de IP privadas detectadas automaticamente.
- `src/lib/configuracion/origenes-desarrollo.ts`: funcion de deteccion acotada.
- `src/components/pwa/EstadoInteractividad.tsx`: diagnostico de hidratacion.
- `src/components/huerto/PanelHuerto.tsx`: muestra el diagnostico en desarrollo.
- `tests/origenes-lan.test.ts`: pruebas de la allowlist.
