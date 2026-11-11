import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
test('PWA apunta a /aplicacion y tiene pantalla standalone',()=>{ const m=read('src/app/manifest.ts');assert.match(m,/start_url: "\/aplicacion"/);assert.match(m,/display: "standalone"/); });
test('iconos PWA y apple disponibles',()=>{ for (const f of ['icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png']) assert.ok(existsSync(new URL(`../public/icons/${f}`,import.meta.url))); });
test('SW nunca almacena datos privados ni navegaciones',()=>{ const sw=read('public/sw.js');assert.match(sw,/event.request.mode === 'navigate'/);assert.match(sw,/fetch\(event.request\).catch/);assert.doesNotMatch(sw,/cache.put\(event.request/); });
test('móvil permite acceder a cinco secciones principales',()=>{ const panel=read('src/components/huerto/PanelHuerto.tsx');assert.match(panel,/pwa-bottom-navigation/);for(const v of ['plano','calendario','tareas','meteo','diario'])assert.ok(panel.includes(v)); });
test('no se envían claves privadas con el paquete',()=>{const git=read('.gitignore');assert.match(git,/\.env\.\*/);});

// Regression: a pending cuaderno migration must not lock the entire iPhone UI.
test('las pestañas móviles no se bloquean por el estado de Supabase',()=>{
 const panel=read('src/components/huerto/PanelHuerto.tsx');
 const bottom=panel.match(/<nav className="pwa-bottom-navigation"[\s\S]*?<\/nav>/)?.[0];
 const tabs=panel.match(/<nav className="mobile-notebook-tabs"[\s\S]*?<\/nav>/)?.[0];
 const sidebar=panel.match(/<nav className="menu"[\s\S]*?<\/nav>/)?.[0];
 assert.ok(bottom&&tabs&&sidebar,'faltan controles de navegación');
 for (const markup of [bottom,tabs,sidebar]) {
   assert.doesNotMatch(markup,/disabled=/,'la navegación no puede estar deshabilitada por migraciones o cargas');
   assert.match(markup,/setVista\(v.id\)/,'cada pestaña debe cambiar la vista');
 }
 assert.match(panel,/Datos del cuaderno no disponibles/);
 assert.match(panel,/vista==='calendario'&&listo/);
});
