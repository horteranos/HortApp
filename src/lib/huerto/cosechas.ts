import {nombrePlantacion} from './formato';
import type {Plantacion} from '@/types/aplicacion';
import type {EventoCultivo} from '@/types/cuaderno';

/** Approximate harvest FIRST-window ranges, in days from recorded sowing or transplanting.
 * Review the ranges locally per variety and season. They do not predict production.
 * Background: Diputacion de Valencia, Guia para huertos urbanos - cultivos horticolas
 * (2015), annex II; FAO Crop Water Needs (indicative growing periods).
 * https://www.fitoagricola.es/media/nlocal_listfiles/tmp/image/cultivos-horticolas.pdf
 * https://www.fao.org/4/S2022E/s2022e07.htm
 */
type Duracion={clave:string;siembra:[number,number];trasplante?:[number,number]};
const DURACIONES:readonly Duracion[]=[
 {clave:'guisant',siembra:[60,105]},
 {clave:'haba',siembra:[90,135]},
 {clave:'judia',siembra:[70,110],trasplante:[45,85]},
 {clave:'puerro',siembra:[140,200],trasplante:[90,165]},
 {clave:'lechug',siembra:[65,115],trasplante:[35,85]},
 {clave:'brocol',siembra:[120,175],trasplante:[70,125]},
 {clave:'coliflor',siembra:[120,190],trasplante:[75,140]},
 {clave:'repollo',siembra:[105,155],trasplante:[70,125]},
 {clave:'kale',siembra:[70,125],trasplante:[45,95]},
 {clave:'pak choi',siembra:[35,75],trasplante:[25,55]},
 {clave:'espinac',siembra:[45,95],trasplante:[30,65]},
 {clave:'rucul',siembra:[30,75],trasplante:[25,55]},
 {clave:'acelg',siembra:[75,135],trasplante:[50,105]},
 {clave:'ceboll',siembra:[155,240],trasplante:[90,200]},
 {clave:'ajo',siembra:[165,255]},
 {clave:'zanahor',siembra:[100,155]},
 {clave:'remolach',siembra:[75,125],trasplante:[55,95]},
 {clave:'rabano',siembra:[30,55]},
 {clave:'nabo',siembra:[50,100]},
 {clave:'escarol',siembra:[80,135],trasplante:[45,95]},
 {clave:'tomat',siembra:[120,185],trasplante:[65,120]},
 {clave:'pimient',siembra:[140,200],trasplante:[90,155]},
 {clave:'calabacin',siembra:[75,125],trasplante:[45,85]},
 {clave:'pepino',siembra:[75,125],trasplante:[45,90]},
 {clave:'berenjen',siembra:[120,190],trasplante:[80,140]},
 {clave:'patata',siembra:[90,160]},
 {clave:'calabaza',siembra:[105,165],trasplante:[75,120]},
];
export type VentanaCosecha={
 plantacionId:string;nombre:string;filaId:string|null;desde:string|null;hasta:string|null;
 fechaBase:string|null;origen:'siembra'|'resiembra'|'trasplante'|'inicio_no_precisado'|'sin_fecha';
 precision:'exacta'|'aproximada'|'desconocida';detalle:string;
};
function normalizar(v:string){return v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function fechaValida(fecha:string|null):fecha is string{
 if(!fecha||!/^\d{4}-\d{2}-\d{2}$/.test(fecha))return false;
 const d=new Date(`${fecha}T12:00:00Z`);return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===fecha;
}
export function agregarDiasISO(fecha:string,dias:number):string{
 if(!fechaValida(fecha))throw new Error('Fecha base incorrecta.');
 return new Date(Date.parse(`${fecha}T12:00:00Z`)+dias*86400000).toISOString().slice(0,10);
}
function referencia(p:Plantacion,eventos:readonly EventoCultivo[]){
 const v=eventos.filter(e=>e.plantacion_id===p.id&&!e.anulado_en&&fechaValida(e.fecha)).sort((a,b)=>a.fecha.localeCompare(b.fecha));
 // In transplant-grown crops, sowing was often in a separate seedbed.
 const trasplantes=v.filter(e=>e.tipo==='plantacion');
 if(trasplantes.length){const e=trasplantes.at(-1)!;return {fecha:e.fecha,origen:'trasplante' as const,precision:e.precision_fecha};}
 // A partial reseeding must not overwrite the first planting date of the lot.
 const siembras=v.filter(e=>e.tipo==='siembra');
 if(siembras.length){const e=siembras[0];return {fecha:e.fecha,origen:'siembra' as const,precision:e.precision_fecha};}
 // The migration of legacy lots records initial dates as 'inicio_no_precisado'.
 // These are older than partial reseedings and must take precedence.
 if(fechaValida(p.fecha_inicio)&&p.precision_fecha_inicio!=='desconocida')
  return {fecha:p.fecha_inicio,origen:(p.tipo_inicio==='plantacion'?'trasplante':'inicio_no_precisado') as 'trasplante'|'inicio_no_precisado',precision:p.precision_fecha_inicio};
 const inicios=v.filter(e=>e.tipo==='inicio_no_precisado');
 if(inicios.length){const e=inicios[0];return {fecha:e.fecha,origen:'inicio_no_precisado' as const,precision:e.precision_fecha};}
 const resiembras=v.filter(e=>e.tipo==='resiembra');
 if(resiembras.length){const e=resiembras[0];return {fecha:e.fecha,origen:'resiembra' as const,precision:e.precision_fecha};}
 if(p.fecha_ultima_resiembra&&fechaValida(p.fecha_ultima_resiembra)&&p.precision_fecha_resiembra!=='desconocida')
  return {fecha:p.fecha_ultima_resiembra,origen:'resiembra' as const,precision:p.precision_fecha_resiembra};
 return null;
}
/** Calculated presentation only; never write the estimate as a real harvest event. */
export function estimarCosechas(plantaciones:readonly Plantacion[],eventos:readonly EventoCultivo[]):VentanaCosecha[]{
 return plantaciones.filter(p=>p.estado==='presente').map(p=>{
  const base={plantacionId:p.id,nombre:nombrePlantacion(p),filaId:p.fila_id,desde:null,hasta:null,fechaBase:null,origen:'sin_fecha' as const,precision:'desconocida' as const};
  if(p.es_permanente)return {...base,detalle:'Cultivo permanente: precisa observación estacional o variedad para calcular cosecha.'};
  const d=DURACIONES.find(x=>normalizar(p.cultivo).includes(x.clave));
  if(!d)return {...base,detalle:'No hay intervalo parametrizado fiable para este cultivo.'};
  const r=referencia(p,eventos);
  if(!r)return {...base,detalle:'No consta una fecha verificable de siembra o trasplante.'};
  const dias=r.origen==='trasplante'?d.trasplante??d.siembra:d.siembra;
  return {plantacionId:p.id,nombre:base.nombre,filaId:p.fila_id,desde:agregarDiasISO(r.fecha,dias[0]),hasta:agregarDiasISO(r.fecha,dias[1]),fechaBase:r.fecha,origen:r.origen,precision:r.precision,
   detalle:r.origen==='resiembra'?'Calculada desde una resiembra; puede referirse solo a parte del lote.':r.origen==='inicio_no_precisado'?'Fecha inicial histórica sin tipo de establecimiento confirmado: se usa provisionalmente el intervalo de siembra. Verificar fecha y trasplante antes de planificar.':'Intervalo orientativo; ajustar según variedad, clima y desarrollo.'};
 });
}
