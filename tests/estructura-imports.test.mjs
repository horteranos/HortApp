import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync, statSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// Prueba de integridad para detectar parches copiados en rutas equivocadas.
const base=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const src=join(base,'src');
const exts=['.ts','.tsx','.js','.mjs','.json'];
const contents=(relative)=>readFileSync(join(base,relative),'utf8');
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>
 e.isDirectory()?files(join(dir,e.name)):e.isFile()?[join(dir,e.name)]:[]);
}
function resolveImport(issuer,spec){
 const p=spec.startsWith('@/')?join(src,spec.slice(2)):resolve(dirname(issuer),spec);
 const candidates=[p,...exts.map(e=>p+e),...exts.map(e=>join(p,'index'+e))];
 return candidates.find(c=>existsSync(c)&&statSync(c).isFile());
}
const localModules=files(src).filter(f=>/\.(tsx?|mjs|jsx?)$/.test(f));

test('solo existe una ficha PanelHuerto.tsx en la ruta correcta',()=>{
 const expected=join(src,'components','huerto','PanelHuerto.tsx');
 assert.ok(existsSync(expected),'falta src/components/huerto/PanelHuerto.tsx');
 assert.deepEqual(files(src).filter(f=>f.endsWith('/PanelHuerto.tsx')),[expected]);
 assert.ok(!existsSync(join(base,'PanelHuerto.tsx')),'PanelHuerto.tsx se ha copiado en la raíz');
});
test('las importaciones relativas y los alias @/ apuntan a archivos reales',()=>{
 const unresolved=[];
 // Se comprueban imports/reexports estáticos y dinámicos con cadenas literales.
 const importRE=/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(?:'([^']+)'|"([^"]+)")/g;
 for(const source of localModules){
   for(const m of readFileSync(source,'utf8').matchAll(importRE)){
     const spec=m[1]??m[2];
     if((spec.startsWith('./')||spec.startsWith('../')||spec.startsWith('@/'))&&!resolveImport(source,spec))
       unresolved.push(`${source.slice(base.length+1)} -> ${spec}`);
   }
 }
 assert.deepEqual(unresolved,[],`Importaciones sin resolver:\n${unresolved.join('\n')}`);
});
test('la navegación de iPhone no depende de tener activo el cuaderno',()=>{
 const panel=contents('src/components/huerto/PanelHuerto.tsx');
 for(const id of ['plano','calendario','tareas','meteo','diario'])
   assert.match(panel,new RegExp(`id:'${id}'`));
 for(const name of ['pwa-bottom-navigation','mobile-notebook-tabs','menu']){
   const start=panel.indexOf(`className="${name}"`);
   assert.ok(start>0,`Falta ${name}`);
   const end=panel.indexOf('</nav>',start);
   const block=panel.slice(start,end);
   assert.doesNotMatch(block,/\bdisabled\s*=/);
   assert.match(block,/setVista\(v.id\)/);
 }
 assert.match(panel,/vista==='calendario'&&listo/);
 assert.match(panel,/vista==='tareas'&&<Tareas/);
 assert.match(panel,/Datos del cuaderno no disponibles/);
});
test('el menú inferior es accesible en pantallas estrechas',()=>{
 const css=contents('src/app/pwa.css');
 assert.match(css,/@media\s*\(max-width:650px\)/);
 assert.match(css,/\.pwa-bottom-navigation\s*\{\s*display:grid/);
 assert.match(css,/position:fixed/);
});
test('el manifest PWA utiliza la ruta y el modo adecuados',()=>{
 const m=contents('src/app/manifest.ts');
 assert.match(m,/start_url:\s*"\/aplicacion"/);
 assert.match(m,/display:\s*"standalone"/);
});
test('package-lock coincide con las dependencias del proyecto',()=>{
 const p=JSON.parse(contents('package.json'));
 const lock=JSON.parse(contents('package-lock.json'));
 assert.equal(lock.name,p.name);assert.equal(lock.version,p.version);
 assert.deepEqual(lock.packages[''].dependencies,p.dependencies);
 assert.deepEqual(lock.packages[''].devDependencies,p.devDependencies);
});
