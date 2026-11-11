'use client';
import {useState} from 'react';
import {guardarRecuento} from '@/app/aplicacion/gestion-actions';
import {formatearCantidad} from '@/lib/huerto/formato';
import type {Plantacion,HuertoSnapshot} from '@/types/aplicacion';
import type {GestionControl} from './useGestion';

/** One source of truth in the header: latest sm_recuentos entry, not cantidad_declarada. */
export function RecuentoPlantas({plantacion,datos,gestion}:{plantacion:Plantacion;datos:HuertoSnapshot;gestion:GestionControl}){
 const actual=gestion.datos?.recuentos.find(r=>r.plantacion_id===plantacion.id);
 const [editando,setEditando]=useState(false),[valor,setValor]=useState(''),[fecha,setFecha]=useState(datos.hoy),[notas,setNotas]=useState(''),[mensaje,setMensaje]=useState(''),[ocupado,setOcupado]=useState(false);
 function abrir(){setValor(actual?String(actual.plantas_actuales):'');setFecha(actual?.fecha??datos.hoy);setNotas(actual?.observaciones??'');setEditando(true);setMensaje('');}
 async function guardar(){
  if(!/^(0|[1-9][0-9]*)$/.test(valor)||Number(valor)>100000){setMensaje('Introduce un numero entero entre 0 y 100000. Cero significa que no quedan plantas.');return;}
  setOcupado(true);
  try{
   const r=await guardarRecuento(datos.huerto.id,{plantacion_id:plantacion.id,plantas_actuales:Number(valor),fecha,observaciones:notas,revision:actual?.revision??-1});
   if(r.ok){setMensaje('Recuento actualizado.');setEditando(false);await gestion.cargar();}
   else setMensaje(r.error);
  }catch{setMensaje('No se pudo confirmar el recuento.');}
  finally{setOcupado(false);}
 }
 const etiqueta=actual
  ? `${actual.plantas_actuales.toLocaleString('es-ES')} ${actual.plantas_actuales===1?'planta':'plantas'}`
  : !gestion.datos&&!gestion.error ? 'Cargando recuento'
  : plantacion.cantidad_declarada!==null ? `${formatearCantidad(plantacion)} (inicial)` : 'Sin recuento';
 const aclaracion=actual?`Recuento real a fecha ${actual.fecha}`:
   plantacion.cantidad_declarada!==null?'Cantidad inicial declarada; no equivale necesariamente a plantas vivas actualmente':'Cantidad de plantas reales pendiente de confirmar';
 return <div className={`plant-count plant-count-inline ${editando?'count-editing':''}`}>
  <div className="plant-count-header">
   <span className={`count-pill ${actual?'count-pill-verified':'count-pill-unverified'}`} title={aclaracion} aria-label={`${etiqueta}. ${aclaracion}`}>{etiqueta}</span>
   {datos.rol!=='lector'&&<button type="button" className="text-button" onClick={abrir}>{actual?'Modificar':'Contar plantas'}</button>}
  </div>
  {editando&&<form className="plant-count-form" onSubmit={e=>{e.preventDefault();void guardar();}}>
   <p className="monitor-caption">Recuento actual de plantas, independiente de los goteros. La cifra inicial solo es una referencia.</p>
   <div className="monitor-fields"><label>N&uacute;mero de plantas<input type="number" min={0} max={100000} step={1} required value={valor} onChange={e=>setValor(e.target.value)}/></label><label>Fecha de recuento<input type="date" required value={fecha} onChange={e=>setFecha(e.target.value)}/></label></div>
   <label>Observaciones<input maxLength={1000} value={notas} onChange={e=>setNotas(e.target.value)}/></label>
   <div className="action-row"><button type="submit" className="primary-button compact-button" disabled={ocupado}>{ocupado?'Guardando...':'Guardar recuento'}</button><button type="button" className="secondary-button compact-button" disabled={ocupado} onClick={()=>setEditando(false)}>Cancelar</button></div>
  </form>}
  {mensaje&&<p role="status" className="plant-count-message">{mensaje}</p>}
 </div>;
}
