import test from 'node:test';
import assert from 'node:assert/strict';
import {generarUUID} from '../src/lib/seguridad/uuid.mjs';
const UUID_V4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('en HTTPS prefiere crypto.randomUUID()',()=>{
 const esperado='12345678-1234-4abc-8abc-abcdef012345';
 assert.equal(generarUUID({randomUUID:()=>esperado}),esperado);
});
test('en HTTP local genera un UUID v4 usando getRandomValues',()=>{
 const cryptoInseguro={getRandomValues:bytes=>{bytes.set(Array.from({length:16},(_,i)=>i));return bytes;}};
 assert.equal(generarUUID(cryptoInseguro),'00010203-0405-4607-8809-0a0b0c0d0e0f');
 assert.match(generarUUID(cryptoInseguro),UUID_V4);
});
test('el fallback conserva la aleatoriedad de los bytes',()=>{
 let contador=0;
 const cryptoInseguro={getRandomValues:bytes=>{bytes.fill(contador++);return bytes;}};
 const ids=Array.from({length:32},()=>generarUUID(cryptoInseguro));
 assert.equal(new Set(ids).size,32);
 for(const id of ids)assert.match(id,UUID_V4);
});
test('si no existe Web Crypto falla sin utilizar Math.random',()=>{
 assert.throws(()=>generarUUID(null),/no permite crear identificadores seguros/);
 assert.throws(()=>generarUUID({}),/no permite crear identificadores seguros/);
});
test('no depende de crypto.randomUUID en ninguno de los tres flujos de UI', async()=>{
 const fs=await import('node:fs/promises');
 for (const path of [
  'src/components/monitor/Diario.tsx',
  'src/components/huerto/RegistroEvento.tsx',
  'src/lib/gestion/medios.ts'
 ]) {
  const codigo=await fs.readFile(new URL('../'+path,import.meta.url),'utf8');
  assert.match(codigo,/generarUUID\(/,path);
  assert.doesNotMatch(codigo,/crypto\.randomUUID\(/,path);
 }
});
test('el dictado web no se habilita sin HTTPS y ofrece alternativa de teclado',async()=>{
 const fs=await import('node:fs/promises');
 const codigo=await fs.readFile(new URL('../src/components/monitor/Dictado.tsx',import.meta.url),'utf8');
 assert.match(codigo,/window\.isSecureContext/);
 assert.match(codigo,/disabled=\{deshabilitado\|\|!navegadorListo\}/);
 assert.match(codigo,/Dictado del teclado/);
 assert.match(codigo,/enfocarNota/);
});
