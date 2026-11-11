import assert from 'node:assert/strict';
import test from 'node:test';
import { fechaValida, hoyEnZona, diasCalendario, cambiarMes, emojiCultivo, numerosEnRangos, seleccionarPuntos, eventosEnPunto } from '../src/lib/huerto/cuaderno';
import { validarEvento, validarLote, validarAnulacion } from '../src/lib/huerto/validar-cuaderno';
import type { EventoCultivo } from '../src/types/cuaderno';
const h='00000000-0000-4000-8000-000000000001';
const fila='10000000-0000-4000-8000-000000000006';
const lote='20000000-0000-4000-8000-000000000001';
const p1='30000000-0000-4000-8000-000000000001',p2='30000000-0000-4000-8000-000000000002';
const ev='40000000-0000-4000-8000-000000000001';
function formulario(valores:Record<string,string|string[]>):FormData {const f=new FormData();for(const [k,v] of Object.entries(valores))for(const s of Array.isArray(v)?v:[v])f.append(k,s);return f;}
const baseEvento=()=>formulario({huerto_id:h,plantacion_id:lote,evento_id:ev,revision:'-1',tipo:'siembra',fecha:'2026-10-18',precision_fecha:'aproximada'});
const baseLote=()=>formulario({huerto_id:h,fila_id:fila,version_plano:'5',punto_ids:[p1,p2],plantacion_ids:lote,modo:'agregar',seleccion_completa:'si'});
for(const [fecha,esperado] of [['2024-02-29',true],['2026-02-29',false],['2026-02-30',false],['2026-13-01',false],['2026-10-18',true],['18/10/2026',false],['2026-1-01',false],['',false]] as const)
  test(`fecha civil: ${fecha||'vacia'}`,()=>assert.equal(fechaValida(fecha),esperado));
test('Madrid y UTC no desplazan la fecha de una siembra',()=>assert.equal(hoyEnZona('Europe/Madrid',new Date('2026-10-31T23:30:00Z')),'2026-11-01'));
test('calendario empieza en lunes, con 42 dias',()=>{const ds=diasCalendario('2026-11');assert.equal(ds.length,42);assert.equal(ds[0],'2026-10-26');assert.equal(ds[41],'2026-12-06');assert.equal(new Set(ds).size,42);});
test('meses de 28 y 29 dias no se mezclan',()=>{assert.ok(diasCalendario('2024-02').includes('2024-02-29'));assert.ok(!diasCalendario('2026-02').includes('2026-02-29'));});
test('cambio de diciembre y enero conserva el anio correcto',()=>{assert.equal(cambiarMes('2026-12',1),'2027-01');assert.equal(cambiarMes('2026-01',-1),'2025-12');});
test('mes invalido se rechaza',()=>assert.throws(()=>diasCalendario('2026-13')));
test('emojis admiten nombres acentuados y mayusculas',()=>{assert.equal(emojiCultivo('BRÓCOLI'),emojiCultivo('brocoli'));assert.notEqual(emojiCultivo('Guisantes'),emojiCultivo('Cebollas'));});
test('cultivo desconocido conserva icono generico, sin inventar especie',()=>assert.equal(emojiCultivo('especie sin identificar'),'🌱'));
test('rangos ordenan, deduplican y no alteran el array de entrada',()=>{const n=[8,1,2,2,4];assert.equal(numerosEnRangos(n),'1–2, 4, 8');assert.deepEqual(n,[8,1,2,2,4]);});
test('seleccion simple reemplaza la anterior',()=>assert.deepEqual(seleccionarPuntos(['a'],'c',['c','b','a'],false,'a',false),['c']));
test('seleccion multiple incorpora puntos no contiguos',()=>assert.deepEqual(seleccionarPuntos(['a'],'c',['c','b','a'],true,'a',false),['a','c']));
test('segunda pulsacion desmarca solo ese punto',()=>assert.deepEqual(seleccionarPuntos(['a','c'],'a',['c','b','a'],true,'c',false),['c']));
test('mayusculas selecciona rango aunque el mapa este invertido',()=>assert.deepEqual(seleccionarPuntos(['a'],'d',['d','c','b','a'],true,'a',true),['a','d','c','b']));
test('no selecciona un punto ajeno a la fila',()=>assert.deepEqual(seleccionarPuntos(['a'],'z',['c','b','a'],true,'a',true),['a']));
test('evento valido conserva precision aproximada',()=>{const r=validarEvento(baseEvento(),'2026-11-01');assert.equal(r.ok,true);if(r.ok){assert.equal(r.datos.p_precision,'aproximada');assert.deepEqual(r.datos.p_puntos,[]);}});
test('evento sin fecha no usa hoy como sustituto',()=>{const f=baseEvento();f.delete('fecha');assert.equal(validarEvento(f,'2026-11-01').ok,false);});
test('evento futuro se rechaza',()=>{const f=baseEvento();f.set('fecha','2026-11-02');assert.equal(validarEvento(f,'2026-11-01').ok,false);});
test('cosecha no cambia el estado del lote',()=>{const f=baseEvento();f.set('tipo','cosecha');const r=validarEvento(f,'2026-11-01');assert.ok(r.ok);if(r.ok)assert.equal('estado' in r.datos,false);});
test('evento por puntos exige version del plano',()=>{const f=baseEvento();f.append('punto_ids',p1);assert.equal(validarEvento(f,'2026-11-01').ok,false);f.set('version_plano','3');assert.equal(validarEvento(f,'2026-11-01').ok,true);});
test('evento de lote admite ausencia de fila',()=>assert.equal(validarEvento(baseEvento(),'2026-11-01').ok,true));
test('edicion conserva la revision enviada, no la incrementa en cliente',()=>{const f=baseEvento();f.set('revision','2');const r=validarEvento(f,'2026-11-01');assert.ok(r.ok);if(r.ok)assert.equal(r.datos.p_revision,2);});
test('rechaza notas excesivas y NUL',()=>{for(const notas of ['a'.repeat(4001),'a\u0000b']){const f=baseEvento();f.set('notas',notas);assert.equal(validarEvento(f,'2026-11-01').ok,false);}});
test('rechaza ids no validos',()=>{const f=baseEvento();f.set('plantacion_id','texto');assert.equal(validarEvento(f,'2026-11-01').ok,false);});
test('batch valido incluye todos los puntos y un unico lote',()=>{const r=validarLote(baseLote());assert.ok(r.ok);if(r.ok){assert.deepEqual(r.datos.p_puntos,[p1,p2]);assert.deepEqual(r.datos.p_plantaciones,[lote]);}});
test('batch rechaza puntos repetidos',()=>{const f=baseLote();f.append('punto_ids',p1);assert.equal(validarLote(f).ok,false);});
test('batch rechaza una seleccion incompleta',()=>{const f=baseLote();f.delete('seleccion_completa');assert.equal(validarLote(f).ok,false);});
test('sustituir requiere confirmacion explicita',()=>{const f=baseLote();f.set('modo','reemplazar');assert.equal(validarLote(f).ok,false);f.set('confirmar','si');assert.equal(validarLote(f).ok,true);});
test('vaciar cultivos solo con reemplazar confirmado',()=>{const f=baseLote();f.delete('plantacion_ids');assert.equal(validarLote(f).ok,false);f.set('modo','reemplazar');f.set('confirmar','si');assert.equal(validarLote(f).ok,true);});
test('crear lote para varios goteros no duplica el nombre por punto',()=>{const f=baseLote();f.delete('plantacion_ids');f.set('cultivo_nuevo',' Tomate ');const r=validarLote(f);assert.ok(r.ok);if(r.ok){assert.equal(r.datos.p_cultivo,'Tomate');assert.equal(r.datos.p_plantaciones.length,0);}});
test('retirar no permite crear un cultivo',()=>{const f=baseLote();f.set('modo','retirar');f.set('cultivo_nuevo','Tomate');assert.equal(validarLote(f).ok,false);});
test('variedad sin cultivo se rechaza',()=>{const f=baseLote();f.set('variedad_nueva','Rondo');assert.equal(validarLote(f).ok,false);});
test('eliminacion multiple exige confirmacion',()=>{const f=baseLote();f.set('modo','eliminar_puntos');assert.equal(validarLote(f).ok,false);f.set('confirmar','si');assert.equal(validarLote(f).ok,true);});
test('version negativa y decimal se rechazan',()=>{for(const version of ['-1','1.5','NaN','2147483648']){const f=baseLote();f.set('version_plano',version);assert.equal(validarLote(f).ok,false);}});
test('anular exige motivo y confirmacion',()=>{const f=formulario({huerto_id:h,evento_id:ev,revision:'0',motivo:'Fecha duplicada'});assert.equal(validarAnulacion(f).ok,false);f.set('confirmar','si');assert.equal(validarAnulacion(f).ok,true);f.set('motivo',' ');assert.equal(validarAnulacion(f).ok,false);});
// Los datos ficticios de las pruebas deben respetar el contrato completo de EventoCultivo.
// De este modo no se ocultan errores con conversiones forzadas de tipos.
function eventoPrueba(id: string, puntos_snapshot: EventoCultivo['puntos_snapshot']): EventoCultivo {
  return {
    id,
    huerto_id: h,
    plantacion_id: lote,
    fila_id: fila,
    fila_codigo: 'F6',
    cultivo: 'Guisantes',
    variedad: 'Rondo',
    tipo: 'siembra',
    fecha: '2026-10-18',
    precision_fecha: 'aproximada',
    puntos_snapshot,
    notas: null,
    origen: 'manual',
    clave_importacion: null,
    revision: 0,
    creado_por: null,
    creado_en: '2026-10-18T12:00:00Z',
    actualizado_en: '2026-10-18T12:00:00Z',
    anulado_en: null,
    motivo_anulacion: null,
  };
}
test('historial filtra por UUID, no por numero mutable del gotero',()=>{
  const es = [
    eventoPrueba('e1', [{id:p1,numero:1}]),
    eventoPrueba('e2', [{id:p2,numero:1}]),
    eventoPrueba('e3', []),
  ];
  assert.deepEqual(eventosEnPunto(es,p1).map(e=>e.id),['e1']);
});
test('evento sin puntos confirmados no se atribuye al punto actual',()=>{
  const es = [eventoPrueba('e', [])];
  assert.equal(eventosEnPunto(es,p1).length,0);
});
