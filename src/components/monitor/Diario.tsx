'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {operacionMonitor} from '@/app/aplicacion/monitor-actions';
import {descargar} from '@/lib/monitor/descargar';
import {Dictado} from './Dictado';
import {Adjuntos} from './Adjuntos';
import {subirMedios} from '@/lib/gestion/medios';
import {generarUUID} from '@/lib/seguridad/uuid.mjs';
import {TIPOS,exportarTXT,exportarHTML,nombreExportacion,ubicacionEntrada} from '@/lib/monitor/diario-export.mjs';
import type {HuertoSnapshot} from '@/types/aplicacion';
import type {DiarioEntrada,PaginaDiario,FiltroDiario} from '@/types/monitor';
type Borrador={id:string;revision:number;fecha:string;titulo:string;texto:string;tipo:string;fila_id:string;plantacion_id:string;puntos:string[];ubicacion_original?:string};
const inicial=(hoy:string):Borrador=>({id:'',revision:-1,fecha:hoy,titulo:'',texto:'',tipo:'observacion',fila_id:'',plantacion_id:'',puntos:[]});
export function Diario({datos}:{datos:HuertoSnapshot}){
 const clave=`sm:diario:borrador:${datos.huerto.id}:${datos.usuarioId}`;
 const [b,setB]=useState<Borrador>(()=>inicial(datos.hoy)),[restaurado,setRestaurado]=useState(false);
 const [f,setF]=useState<FiltroDiario>({pagina:0}),[pagina,setPagina]=useState<PaginaDiario|null>(null),[version,setVersion]=useState(0),[mensaje,setMensaje]=useState(''),[ocupado,setOcupado]=useState(false),[cargando,setCargando]=useState(true);
 const puede=datos.rol!=='lector',editando=b.revision>=0;
 const [archivos,setArchivos]=useState<File[]>([]),[archivoKey,setArchivoKey]=useState(0);
 const consulta=useRef(0);
 useEffect(()=>{
  let activo=true;
  Promise.resolve().then(()=>{try{const raw=localStorage.getItem(clave);if(raw){const v=JSON.parse(raw);if(typeof v.texto==='string'&&typeof v.fecha==='string'&&typeof v.titulo==='string'&&typeof v.id==='string'&&typeof v.revision==='number'&&typeof v.tipo==='string'&&typeof v.fila_id==='string'&&typeof v.plantacion_id==='string'&&Array.isArray(v.puntos)&&v.puntos.every((x:unknown)=>typeof x==='string')&&activo){setB(v);setMensaje('Borrador recuperado de este navegador; todavia no esta guardado en Supabase.');}}}catch{/* Invalid drafts never block the diary. */}if(activo)setRestaurado(true);});
  return()=>{activo=false;};
 },[clave]);
 useEffect(()=>{
  if(!restaurado||!puede)return;
  const t=setTimeout(()=>{try{if(b.texto.trim()||b.titulo.trim())localStorage.setItem(clave,JSON.stringify(b));else localStorage.removeItem(clave);}catch{/* Saving to Supabase is still available. */}},350);
  return()=>clearTimeout(t);
 },[b,clave,puede,restaurado]);
 const cargar=useCallback(async()=>{const solicitud=++consulta.current;setCargando(true);try{const r=await operacionMonitor<PaginaDiario>(datos.huerto.id,'diario_listar',f);if(solicitud!==consulta.current)return;if(r.ok)setPagina(r.datos);else setMensaje(r.error);}catch{if(solicitud===consulta.current)setMensaje('No se pudo consultar el diario. Conserva el borrador e intenta de nuevo.');}finally{if(solicitud===consulta.current)setCargando(false);}},[datos.huerto.id,f]);
 useEffect(()=>{const t=setTimeout(()=>void cargar(),200);return()=>clearTimeout(t);},[cargar,version]);
 function nuevo(){if((b.texto||b.titulo)&&!window.confirm('Descartar el borrador actual y abrir una nota nueva?'))return;setB(inicial(datos.hoy));setArchivos([]);setArchivoKey(v=>v+1);setMensaje('Nueva entrada.');}
 function editar(e:DiarioEntrada){if((b.texto||b.titulo)&&!window.confirm('Sustituir el borrador abierto por esta entrada?'))return;setArchivos([]);setArchivoKey(v=>v+1);setB({id:e.id,revision:e.revision,fecha:e.fecha,titulo:e.titulo??'',texto:e.texto,tipo:e.tipo,fila_id:e.fila_id??'',plantacion_id:e.plantacion_id??'',puntos:e.puntos_snapshot.map(p=>p.id),ubicacion_original:ubicacionEntrada(e)});setMensaje('Editando entrada. La localizacion historica se conserva; solo cambian la fecha, tipo, titulo y texto.');document.getElementById('nota-texto')?.focus();}
 async function guardar(){
  if(!b.texto.trim()||ocupado)return;setOcupado(true);
  try{
   const id=b.id||generarUUID();
   setB({...b,id});
   const r=await operacionMonitor<DiarioEntrada>(datos.huerto.id,'diario_guardar',{...b,id});if(r.ok){
    let resultadoAdjuntos='';if(archivos.length){try{const n=await subirMedios(datos.huerto.id,r.datos.id,archivos);resultadoAdjuntos=` ${n} archivo(s) adjuntados.`;}
      catch(e){setArchivos([]);setArchivoKey(v=>v+1);setB({...b,id:r.datos.id,revision:r.datos.revision});setMensaje(`La NOTA sí se guardó, pero algunos adjuntos fallaron: ${e instanceof Error?e.message:'error de subida'}. Comprueba los adjuntos existentes antes de reintentar.`);setVersion(v=>v+1);return;}}
    try{localStorage.removeItem(clave);}catch{/* no-op */}setArchivos([]);setArchivoKey(v=>v+1);setB(inicial(datos.hoy));setMensaje('Nota guardada en Supabase.'+resultadoAdjuntos);setVersion(v=>v+1);
   }else setMensaje(r.error);}catch(e){setMensaje(e instanceof Error && e.message.startsWith('El navegador no permite crear identificadores seguros')?e.message:'No se ha confirmado el guardado. El borrador se conserva: consulta el diario antes de repetir.');}finally{setOcupado(false);}
 }
 async function anular(e:DiarioEntrada){if(!window.confirm('Anular esta entrada? Se conserva en el historial de notas y podras verla con Mostrar anuladas.'))return;setOcupado(true);try{const r=await operacionMonitor(datos.huerto.id,'diario_anular',{id:e.id,revision:e.revision});setMensaje(r.ok?'Entrada anulada, no borrada.':r.error);if(r.ok)setVersion(v=>v+1);}catch{setMensaje('No se pudo confirmar la anulacion. Actualiza antes de repetir.');}finally{setOcupado(false);}}
 async function exportar(tipo:'pdf'|'txt'){
  const ventana=tipo==='pdf'?window.open('','_blank'):null;
  if(tipo==='pdf'&&!ventana){setMensaje('Permite abrir la ventana de exportacion en el navegador y pulsa PDF de nuevo.');return;}
  if(ventana){ventana.opener=null;ventana.document.write('<p>Preparando el diario completo para los filtros seleccionados...</p>');}
  setOcupado(true);
  try{const r=await operacionMonitor<PaginaDiario>(datos.huerto.id,'diario_exportar',f);if(!r.ok){ventana?.close();setMensaje(r.error);return;}
   if(tipo==='txt')descargar('\uFEFF'+exportarTXT(r.datos.entradas,f),nombreExportacion(f,'txt'));
   else if(ventana){ventana.document.open();ventana.document.write(exportarHTML(r.datos.entradas,f));ventana.document.close();setTimeout(()=>{if(!ventana.closed){ventana.focus();ventana.print();}},500);}
   setMensaje(tipo==='pdf'?'En la ventana de impresion, selecciona Guardar como PDF. Si no se abre el dialogo, pulsa Comando + P en esa ventana.':'Diario TXT exportado con todas las entradas de los filtros, no solo esta pagina.');
  }catch{ventana?.close();setMensaje('No se pudo obtener la exportacion completa. No se ha entregado un archivo parcial.');}finally{setOcupado(false);}
 }
 const cambiar=(k:keyof FiltroDiario,v:string|boolean)=>setF({...f,[k]:v,pagina:0});
 return <section className="surface monitor-view"><div className="monitor-section-head"><div><p className="eyebrow">TRABAJO COTIDIANO</p><h2>Diario de actividad</h2><p>Notas r&aacute;pidas, incidencias y tareas realizadas.</p></div><div className="action-row"><button className="secondary-button" disabled={ocupado} onClick={()=>void exportar('txt')}>Exportar TXT</button><button className="primary-button" disabled={ocupado} onClick={()=>void exportar('pdf')}>Exportar PDF</button></div></div>
 {mensaje&&<p className="monitor-status" role="status">{mensaje}</p>}
 <div className="monitor-diary-grid">{puede&&<form className="monitor-note-form" onSubmit={e=>{e.preventDefault();void guardar();}}><fieldset className="monitor-note-fields" disabled={ocupado}><div className="monitor-section-head"><h3>{editando?'Editar nota':'Nueva nota'}</h3><button type="button" className="text-button" disabled={ocupado} onClick={nuevo}>Nueva entrada</button></div>
 <div className="monitor-fields"><label>Fecha<input type="date" required min="1900-01-01" value={b.fecha} onChange={e=>setB({...b,fecha:e.target.value})}/></label><label>Tipo<select value={b.tipo} onChange={e=>setB({...b,tipo:e.target.value})}>{Object.entries(TIPOS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>
 <label>T&iacute;tulo opcional<input maxLength={120} value={b.titulo} onChange={e=>setB({...b,titulo:e.target.value})} placeholder="Revision del riego, tareas, observaciones..."/></label>
 <label htmlFor="nota-texto">Nota<textarea id="nota-texto" rows={7} maxLength={8000} required value={b.texto} onChange={e=>setB({...b,texto:e.target.value})} placeholder="¿Qué has hecho hoy? ¿Qué necesitas revisar?"/></label>
 <Dictado deshabilitado={ocupado} insertar={fragmento=>setB(actual=>({...actual,texto:((actual.texto.trim()?actual.texto.trim()+' ':'')+fragmento).slice(0,8000)}))}/>
 <label>Imágenes o vídeos (opcional)<input key={archivoKey} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" multiple onChange={e=>setArchivos(Array.from(e.target.files??[]))}/></label>
 {archivos.length>0&&<p className="monitor-caption">{archivos.length} archivo(s) seleccionados. Se adjuntarán después de guardar la nota; máximo 5 archivos por operación y 50 MB cada uno.</p>}
 <p className="monitor-caption">{b.texto.length}/8000 caracteres. El borrador de texto se conserva en este navegador; los archivos no se conservan si cierras la página antes de guardarlos.</p>
 {editando?<p className="monitor-caption">Ubicaci&oacute;n conservada: {b.ubicacion_original}</p>:<details><summary>Vincular a fila, cultivo o goteros (opcional)</summary><div className="monitor-fields"><label>Fila<select value={b.fila_id} onChange={e=>setB({...b,fila_id:e.target.value,plantacion_id:'',puntos:[]})}><option value="">Todo el sistema / sin fila</option>{datos.filas.map(fila=><option key={fila.id} value={fila.id}>{fila.codigo}</option>)}</select></label><label>Cultivo<select value={b.plantacion_id} onChange={e=>setB({...b,plantacion_id:e.target.value})}><option value="">Sin cultivo concreto</option>{datos.plantaciones.filter(c=>!b.fila_id||c.fila_id===b.fila_id||c.fila_prevista_id===b.fila_id).map(c=><option key={c.id} value={c.id}>{c.cultivo}{c.variedad?' - '+c.variedad:''}</option>)}</select></label></div>
 {b.fila_id&&<fieldset className="monitor-point-picks"><legend>Goteros de la fila (n&uacute;meros actuales desde el oeste)</legend>{datos.puntos.filter(p=>p.fila_id===b.fila_id).map(p=><label key={p.id}><input type="checkbox" checked={b.puntos.includes(p.id)} onChange={e=>setB({...b,puntos:e.target.checked?[...b.puntos,p.id]:b.puntos.filter(id=>id!==p.id)})}/>{p.numero_desde_oeste}</label>)}</fieldset>}</details>}
 <button type="submit" className="primary-button" disabled={ocupado||!restaurado||!b.texto.trim()}>{ocupado?'Guardando...':'Guardar nota'}</button><p className="monitor-caption">Una nota no crea autom&aacute;ticamente una siembra o cosecha en el calendario. Para eso utiliza el registro de fechas del cultivo.</p></fieldset></form>}
 <div className="monitor-diary-entries"><h3>Entradas guardadas</h3><div className="monitor-fields monitor-filters"><label>Desde<input type="date" value={f.desde??''} onChange={e=>cambiar('desde',e.target.value)}/></label><label>Hasta<input type="date" value={f.hasta??''} onChange={e=>cambiar('hasta',e.target.value)}/></label><label>Fila<select value={f.fila??''} onChange={e=>cambiar('fila',e.target.value)}><option value="">Todas</option>{datos.filas.map(fila=><option key={fila.id} value={fila.id}>{fila.codigo}</option>)}</select></label><label>Tipo<select value={f.tipo??''} onChange={e=>cambiar('tipo',e.target.value)}><option value="">Todos</option>{Object.entries(TIPOS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Buscar texto<input value={f.texto??''} onChange={e=>cambiar('texto',e.target.value)} maxLength={200}/></label></div><label className="monitor-check"><input type="checkbox" checked={!!f.incluir_anulados} onChange={e=>cambiar('incluir_anulados',e.target.checked)}/> Mostrar anuladas</label>
 <p className="monitor-caption" aria-live="polite">{cargando?'Actualizando...':`${pagina?.total??0} entradas con estos filtros`}</p>
 {pagina?.entradas.map(e=><article key={e.id} className={`monitor-note ${e.anulado_en?'note-void':''}`}><div className="monitor-note-heading"><span>{e.fecha}</span><span>{TIPOS[e.tipo as keyof typeof TIPOS]??e.tipo}{e.anulado_en?' - ANULADA':''}</span></div><h4>{e.titulo||'Nota del dia'}</h4><p className="monitor-caption">{ubicacionEntrada(e)}</p><p className="monitor-note-text">{e.texto}</p><div className="monitor-note-footer"><small>Autor: {e.creado_por===datos.usuarioId?'tu cuenta':'otro usuario'} &middot; Revisi&oacute;n {e.revision}</small>{!e.anulado_en&&puede&&(datos.rol==='administrador'||e.creado_por===datos.usuarioId)&&<div><button className="text-button" disabled={ocupado} onClick={()=>editar(e)}>Editar</button><button className="text-button" disabled={ocupado} onClick={()=>void anular(e)}>Anular</button></div>}</div><Adjuntos huerto={datos.huerto.id} entrada={e.id} puedeEditar={!e.anulado_en&&puede&&(datos.rol==='administrador'||e.creado_por===datos.usuarioId)}/></article>)}
 {pagina&&!pagina.entradas.length&&!cargando&&<p className="monitor-empty">No hay entradas con esos filtros.</p>}
 <div className="action-row"><button className="secondary-button" disabled={cargando||!(f.pagina??0)} onClick={()=>setF({...f,pagina:(f.pagina??0)-1})}>Anterior</button><span>P&aacute;gina {(f.pagina??0)+1}</span><button className="secondary-button" disabled={cargando||!pagina||((f.pagina??0)+1)*100>=pagina.total} onClick={()=>setF({...f,pagina:(f.pagina??0)+1})}>Siguiente</button></div></div></div>
 <p className="monitor-caption">El PDF usa la impresi&oacute;n del navegador: elige Guardar como PDF. Las exportaciones incluyen todas las entradas filtradas, hasta 2000 por archivo; si se supera, se pedir&aacute; reducir el periodo. Las notas personales no deben incluir contrase&ntilde;as ni claves.</p></section>;
}
