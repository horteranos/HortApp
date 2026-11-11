import test from 'node:test';
import assert from 'node:assert/strict';
import {familia,sugerencias} from '../src/lib/gestion/rotaciones';
import {impactoMeteo} from '../src/lib/gestion/impacto-meteo';
import type {Plantacion} from '../src/types/aplicacion';

const cultivo=(nombre:string):Plantacion=>({cultivo:nombre,variedad:null,estado:'presente'} as Plantacion);

test('las recomendaciones descartan la familia recien cosechada',()=>{
 assert.equal(familia('Br\u00f3coli'),'brassicaceas');
 assert.equal(familia('Coliflor'),'brassicaceas');
 const opciones=sugerencias({cultivo:'Br\u00f3coli',fecha:'2026-11-04'},11);
 assert.ok(opciones.length>0);
 assert.ok(opciones.every(o=>o.familia!=='brassicaceas'));
});

test('el mes de siembra y las familias definen las sugerencias',()=>{
 const opciones=sugerencias({cultivo:'Guisantes Rondo',fecha:'2026-11-04'},11);
 assert.ok(opciones.every(o=>o.familia!=='fabaceas'));
 assert.ok(opciones.some(o=>o.nombre==='Lechugas'));
 assert.ok(opciones.every(o=>o.nombre!=='Tomates'));
});

test('el aviso de viento identifica cultivos con tallos altos',()=>{
 const r=impactoMeteo({tipo:'viento'},[cultivo('Guisantes Rondo'),cultivo('Lechuga')]);
 assert.match(r.cultivos,/Guisantes/);
 assert.doesNotMatch(r.cultivos,/Lechuga/);
 assert.match(r.recomendacion,/tutores/);
});

test('el aviso de humedad es agronomico, no un diagnostico',()=>{
 const r=impactoMeteo({tipo:'humedad_alta'},[cultivo('Lechuga')]);
 assert.match(r.cultivos,/Lechuga/);
 assert.match(r.impacto,/No confirma/);
 assert.doesNotMatch(r.impacto,/patogeno|plaga/i);
});

test('solo los cultivos presentes se incluyen en un aviso',()=>{
 const r=impactoMeteo({tipo:'lluvia'},[{...cultivo('Tomate'),estado:'finalizada'},cultivo('Puerro')]);
 assert.equal(r.cultivos,'Puerro');
});
