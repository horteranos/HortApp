/* Sistema Monitorización v0.7.0 — SW mínimo. No almacena páginas, respuestas API ni datos de Supabase. */
const CACHE = 'sm-pwa-assets-v0.7.0';
const ASSETS = ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;
  if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));
    return;
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#1c3d2f"><title>Sin conexión · Mi Huerto</title><style>body{font-family:system-ui;background:#f5f7f0;color:#1c3d2f;margin:0;padding:10vh 24px}main{max-width:440px;margin:auto;background:white;padding:30px;border-radius:18px;box-shadow:0 5px 30px #1232}h1{font-size:25px}p{line-height:1.6}button{background:#24523c;color:white;border:0;border-radius:8px;padding:13px 20px;font-size:16px}</style></head><body><main><h1>Sin conexión a Internet</h1><p>Por seguridad, los datos privados de tu huerto no se guardan como páginas sin conexión. Vuelve a conectarte para consultar o modificar cultivos.</p><button onclick="location.reload()">Reintentar conexión</button></main></body></html>`, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control':'no-store' } })));
  }
});
