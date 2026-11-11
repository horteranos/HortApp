import test from 'node:test';
import assert from 'node:assert/strict';
import {agregarDiasISO,estimarCosechas} from '../src/lib/huerto/cosechas';
import type {Plantacion} from '../src/types/aplicacion';
import type {EventoCultivo} from '../src/types/cuaderno';
function plantacion(id:string,cultivo:string,fecha:string|null=null):Plantacion{
 return {id,cultivo,variedad:null,fila_id:'fila6',estado:'presente',es_permanente:false,
  tipo_inicio:'plantacion',fecha_inicio:fecha,precision_fecha_inicio:'exacta',fecha_ultima_resiembra:null} as Plantacion;
}
function evento(id:string,lote:string,tipo:EventoCultivo['tipo'],fecha:string):EventoCultivo{
 return {id,plantacion_id:lote,tipo,fecha,precision_fecha:'exacta',anulado_en:null} as EventoCultivo;
}
test('la suma de dias mantiene fechas locales incluso al cambiar a horario de invierno',()=>{
 assert.equal(agregarDiasISO('2026-10-24',90),'2027-01-22');
 assert.equal(agregarDiasISO('2026-12-31',1),'2027-01-01');
});
test('una resiembra parcial no sustituye la primera siembra de guisantes',()=>{
 const p=plantacion('g','Guisantes Rondo');
 const v=estimarCosechas([p],[evento('e1','g','siembra','2026-10-18'),evento('e2','g','resiembra','2026-10-24')])[0];
 assert.equal(v.origen,'siembra');assert.equal(v.fechaBase,'2026-10-18');
 assert.equal(v.desde,'2026-12-17');assert.equal(v.hasta,'2027-01-31');
});
test('el trasplante usa una ventana distinta de la siembra en semillero',()=>{
 const p=plantacion('c','Lechuga');
 const v=estimarCosechas([p],[evento('e1','c','siembra','2026-09-10'),evento('e2','c','plantacion','2026-10-01')])[0];
 assert.equal(v.origen,'trasplante');assert.equal(v.desde,'2026-11-05');
});
test('sin fecha o sin cultivo parametrizado no inventa ventanas',()=>{
 const [a,b]=estimarCosechas([plantacion('a','Guisante'),plantacion('b','Limonero','2026-10-01')],[]);
 assert.equal(a.desde,null);assert.equal(b.desde,null);
});
test('no se inventa una cosecha de plantas permanentes ni finalizadas',()=>{
 const a={...plantacion('a','Menta','2026-10-01'),es_permanente:true};
 const b={...plantacion('b','Lechuga','2026-10-01'),estado:'finalizada' as const};
 const v=estimarCosechas([a,b],[]);assert.equal(v.length,1);assert.equal(v[0].desde,null);
});
test('una fecha de origen aproximada sigue marcada como aproximada',()=>{
 const p=plantacion('p','Puerro');
 const e={...evento('e','p','plantacion','2026-10-28'),precision_fecha:'aproximada' as const};
 assert.equal(estimarCosechas([p],[e])[0].precision,'aproximada');
});

test('el inicio historico sin tipificar precede la resiembra parcial de F6',()=>{
 const p={...plantacion('g2','Guisante Rondo','2026-10-18'),tipo_inicio:'no_precisado' as const,precision_fecha_inicio:'aproximada' as const,fecha_ultima_resiembra:'2026-10-24',precision_fecha_resiembra:'exacta' as const};
 const v=estimarCosechas([p],[evento('e1','g2','inicio_no_precisado','2026-10-18'),evento('e2','g2','resiembra','2026-10-24')])[0];
 assert.equal(v.fechaBase,'2026-10-18');assert.equal(v.desde,'2026-12-17');assert.equal(v.origen,'inicio_no_precisado');
 assert.match(v.detalle,/sin tipo/);
});
