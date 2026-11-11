'use client';
import {useEffect,useRef} from 'react';
import {generarAvisos,firmaAvisos,estadoPrevision} from '@/lib/monitor/meteo-core.mjs';
import {impactoMeteo} from '@/lib/gestion/impacto-meteo';
import type {Aviso,MonitorDatos} from '@/types/monitor';
import type {Plantacion} from '@/types/aplicacion';
export function horaLocal(t:number){return new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(t*1000));}
export function detalleAviso(a:Aviso){
 if(a.tipo==='lluvia')return `Probabilidad maxima: ${a.probabilidad??'sin dato'} %. Precipitacion horaria maxima: ${a.lluvia??'sin dato'} mm.`;
 if(a.tipo==='viento')return `Rachas previstas de hasta ${a.racha??'sin dato'} km/h (a 10 m).`;
 if(a.tipo==='frio')return `Minima prevista: ${a.tmin??'sin dato'} \u00b0C (aire a 2 m; no es temperatura de hoja).`;
 if(a.tipo==='calor')return `Maxima prevista: ${a.tmax??'sin dato'} \u00b0C.`;
 if(a.tipo.startsWith('humedad'))return `Humedad entre ${a.hrmin??'sin dato'} y ${a.hrmax??'sin dato'} % durante ${a.horas} horas consecutivas.`;
 return 'Condicion prevista por el modelo meteorologico. Consulta los avisos oficiales cuando sea necesario.';
}
export function ListaAvisos({avisos,cultivos}:{avisos:Aviso[];cultivos:Plantacion[]}){return <div className="monitor-alert-list">{avisos.map(a=>{const impacto=impactoMeteo(a,cultivos);return <article key={a.id} className={`monitor-alert level-${a.nivel}`}><span aria-hidden="true">{a.icono}</span><div><strong>{a.titulo}</strong><p>{horaLocal(a.inicio)} a {horaLocal(a.fin)}</p><p>{detalleAviso(a)}</p><div className="crop-weather-detail"><strong>Posible impacto en cultivos</strong><p><b>Cultivos a revisar:</b> {impacto.cultivos}</p><p>{impacto.impacto}</p><p><b>Medida orientativa:</b> {impacto.recomendacion}</p></div></div></article>;})}</div>;}
export function AvisosMonitor({datos,ahora,usuario,cultivos}:{datos:MonitorDatos|null;ahora:number;usuario:string;cultivos:Plantacion[]}){
 const dialog=useRef<HTMLDialogElement>(null);
 const estado=estadoPrevision(datos?.prevision??null,ahora);
 const avisos=datos?.prevision?generarAvisos(datos.prevision.horas,datos.config.umbrales,datos.config.zona_horaria,ahora):[];
 const firma=firmaAvisos(avisos);
 const clave=`sm:avisos:${usuario}:${datos?.config.huerto_id??''}:${datos?.config.lugar_version??0}`;
 useEffect(()=>{
  if(estado!=='vigente'||avisos.length===0||!dialog.current)return;
  let vista=false;try{vista=localStorage.getItem(clave)===firma;}catch{/* Storage can be disabled. */}
  if(!vista&&!dialog.current.open){dialog.current.showModal();try{localStorage.setItem(clave,firma);}catch{/* The notification remains usable. */}}
 },[firma,estado,clave,avisos.length]);
 return <><button type="button" className="secondary-button monitor-bell" onClick={()=>dialog.current?.showModal()} aria-label="Abrir avisos meteorologicos de las proximas 72 horas">{'\ud83d\udd14'} Avisos 72 h <span>{estado==='vigente'?avisos.length:'\u2014'}</span></button>
 <dialog ref={dialog} className="monitor-dialog" aria-labelledby="avisos-titulo"><div className="monitor-dialog-head"><div><p className="eyebrow">SISTEMA MONITORIZACI&Oacute;N</p><h2 id="avisos-titulo">Alertas meteorol&oacute;gicas y cultivos</h2></div><button type="button" className="secondary-button" onClick={()=>dialog.current?.close()} autoFocus>Cerrar</button></div>
  <p className="monitor-explanation">Previsi&oacute;n para las pr&oacute;ximas 72 horas. Avisos seg&uacute;n umbrales configurables y posibles efectos agron&oacute;micos en los cultivos registrados. No son mediciones locales ni alertas oficiales. No se detectan plagas ni se diagnostican enfermedades.</p>
  {estado==='sin_datos'?<p role="status">No hay previsi&oacute;n disponible. Configura Meteorolog&iacute;a y sincroniza.</p>:<>
   {estado!=='vigente'&&<p className="monitor-warning" role="status">La previsi&oacute;n est&aacute; {estado==='caducada'?'desactualizada (mas de 6 horas)':'incompleta'}. No interpretes la ausencia de avisos como ausencia de riesgo. Actualiza Meteorolog&iacute;a.</p>}
   <p className="monitor-caption">Consulta del proveedor: {datos?.prevision?horaLocal(Date.parse(datos.prevision.consultado_en)/1000):''}. Datos Open-Meteo.</p>
   {avisos.length?<ListaAvisos avisos={avisos} cultivos={cultivos}/>:<p>{estado==='vigente'?'La previsi\u00f3n disponible no supera los umbrales meteorol\u00f3gicos configurados.':'No se pueden confirmar avisos meteorol\u00f3gicos con los datos disponibles.'}</p>}
  </>}
  <p className="monitor-caption">Mientras el Mac est&eacute; apagado no se emitir&aacute;n avisos locales. Al volver a iniciar sesi&oacute;n se actualizar&aacute; la previsi&oacute;n.</p>
 </dialog></>;
}

/** Visible summary in the plan: a notification is not limited to the bell dialog. */
export function ResumenAvisosCultivos({datos,ahora,cultivos}:{datos:MonitorDatos|null;ahora:number;cultivos:Plantacion[]}){
 const estado=estadoPrevision(datos?.prevision??null,ahora);
 const avisos=datos?.prevision?generarAvisos(datos.prevision.horas,datos.config.umbrales,datos.config.zona_horaria,ahora):[];
 return <section className="surface crop-weather-summary" aria-label="Avisos meteorologicos sobre los cultivos">
 <div className="crop-weather-summary-head"><div><h2>Tiempo y posibles efectos en tus cultivos</h2><p>Previsi&oacute;n meteorol&oacute;gica orientativa para las pr&oacute;ximas 72 horas.</p></div><span className="light-pill">{estado==='vigente'?`${avisos.length} avisos`:'Datos pendientes'}</span></div>
 {estado!=='vigente'?<p className="monitor-warning" role="status">{estado==='sin_datos'?'No hay previsión cargada.':'Previsión desactualizada o incompleta.'} Abre Meteorolog&iacute;a y pulsa Actualizar ahora. Sin datos fiables no se puede evaluar el riesgo.</p>
 : avisos.length===0?<p className="monitor-caption">No se superan los umbrales meteorol&oacute;gicos configurados en este momento. Sigue revisando el huerto y las actualizaciones del tiempo.</p>
 :<div className="crop-weather-cards">{avisos.slice(0,3).map(a=>{const x=impactoMeteo(a,cultivos);return <article key={a.id} className={`crop-weather-card level-${a.nivel}`}><h3>{a.icono} {a.titulo}</h3><small>{horaLocal(a.inicio)} - {horaLocal(a.fin)}</small><p>{x.impacto}</p><p><b>A revisar:</b> {x.cultivos}</p><p><b>Medida:</b> {x.recomendacion}</p></article>;})}</div>}
 {estado==='vigente'&&avisos.length>3&&<p className="monitor-caption">Hay {avisos.length-3} avisos adicionales. Consulta el detalle en el bot&oacute;n Avisos 72 h.</p>}
 <p className="monitor-caption">Modelo meteorol&oacute;gico externo, no sensores del huerto. No se diagnostica el estado sanitario de las plantas.</p>
 </section>;
}
