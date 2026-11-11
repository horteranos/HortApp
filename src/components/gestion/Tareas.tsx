'use client';
import {useState} from 'react';
import {guardarTarea,type TareaEdicion} from '@/app/aplicacion/gestion-actions';
import type {GestionControl} from './useGestion';
import type {HuertoSnapshot} from '@/types/aplicacion';
import type {Tarea} from '@/types/gestion';
const nuevo=(hoy:string):TareaEdicion=>({titulo:'',descripcion:'',fecha:hoy,hora:'',prioridad:'normal',estado:'pendiente',fila_id:'',plantacion_id:''});
export function Tareas({datos,gestion,irAlCalendario}:{datos:HuertoSnapshot;gestion:GestionControl;irAlCalendario?:(fecha:string)=>void}){
 const [form,setForm]=useState<TareaEdicion>(()=>nuevo(datos.hoy)),[mensaje,setMensaje]=useState(''),[ocupado,setOcupado]=useState(false),[filtro,setFiltro]=useState<'todas'|'pendiente'|'hecha'>('pendiente');
 const tareas=(gestion.datos?.tareas??[]).filter(t=>filtro==='todas'||t.estado===filtro).sort((a,b)=>a.fecha.localeCompare(b.fecha)||(a.hora??'').localeCompare(b.hora??''));
 function editar(t:Tarea){setForm({id:t.id,revision:t.revision,titulo:t.titulo,descripcion:t.descripcion,fecha:t.fecha,hora:t.hora?.slice(0,5)??'',prioridad:t.prioridad,estado:t.estado,fila_id:t.fila_id??'',plantacion_id:t.plantacion_id??''});}
 async function guardar(v:TareaEdicion){setOcupado(true);try{const r=await guardarTarea(datos.huerto.id,v);if(r.ok){setForm(nuevo(datos.hoy));setMensaje('Tarea guardada y disponible en el calendario.');await gestion.cargar();}else setMensaje(r.error);}catch{setMensaje('No se pudo confirmar el guardado.');}finally{setOcupado(false);}}
 return <section className="surface monitor-view new-view"><div className="monitor-section-head"><div><p className="eyebrow">PLANIFICACIÓN</p><h2>Agenda de tareas</h2><p>Programa trabajos con fecha, hora opcional y asociación a una fila o cultivo.</p></div><span className="light-pill">{gestion.datos?.tareas.filter(t=>t.estado==='pendiente').length??'—'} PENDIENTES</span></div>
 {mensaje&&<p role="status" className="monitor-status">{mensaje}</p>}
 {gestion.error&&<p className="feedback-error" role="alert">{gestion.error}</p>}
 {gestion.cargando&&!gestion.datos&&<p className="monitor-status" role="status">Cargando tareas del huerto…</p>}
 {!gestion.datos&&!gestion.cargando&&!gestion.error&&<p className="monitor-status" role="status">Aún no hay datos de tareas disponibles. Pulsa Actualizar para volver a consultarlos.</p>}
 <div className="gestion-cols">{datos.rol!=='lector'&&!!gestion.datos&&<form className="gestion-form" onSubmit={e=>{e.preventDefault();void guardar(form);}}><h3>{form.id?'Editar tarea':'Nueva tarea'}</h3>
 <label>Título<input required maxLength={160} value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} placeholder="Ej.: revisar hojas de las coles"/></label>
 <label>Descripción<textarea rows={3} maxLength={2000} value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})}/></label>
 <div className="monitor-fields"><label>Fecha<input type="date" required value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}/></label><label>Hora (opcional)<input type="time" value={form.hora} onChange={e=>setForm({...form,hora:e.target.value})}/></label></div>
 <div className="monitor-fields"><label>Prioridad<select value={form.prioridad} onChange={e=>setForm({...form,prioridad:e.target.value as Tarea['prioridad']})}><option value="baja">Baja</option><option value="normal">Normal</option><option value="alta">Alta</option></select></label><label>Estado<select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value as Tarea['estado']})}><option value="pendiente">Pendiente</option><option value="hecha">Hecha</option><option value="cancelada">Cancelada</option></select></label></div>
 <div className="monitor-fields"><label>Fila<select value={form.fila_id} onChange={e=>setForm({...form,fila_id:e.target.value,plantacion_id:''})}><option value="">Sin fila específica</option>{datos.filas.map(f=><option key={f.id} value={f.id}>{f.codigo}</option>)}</select></label><label>Cultivo<select value={form.plantacion_id} onChange={e=>setForm({...form,plantacion_id:e.target.value})}><option value="">Sin cultivo</option>{datos.plantaciones.filter(c=>!form.fila_id||c.fila_id===form.fila_id||c.fila_prevista_id===form.fila_id).map(c=><option value={c.id} key={c.id}>{c.cultivo} {c.variedad??''}</option>)}</select></label></div>
 <div className="action-row"><button className="primary-button" type="submit" disabled={ocupado||!form.titulo.trim()}>{ocupado?'Guardando...':'Guardar tarea'}</button><button className="secondary-button" type="button" onClick={()=>setForm(nuevo(datos.hoy))}>Limpiar</button></div>
 </form>}
 <div className="gestion-items"><div className="monitor-section-head"><h3>Tareas registradas</h3><label className="gestion-filter">Mostrar <select value={filtro} onChange={e=>setFiltro(e.target.value as typeof filtro)}><option value="pendiente">Pendientes</option><option value="hecha">Terminadas</option><option value="todas">Todas</option></select></label></div>
 {gestion.datos&&tareas.length===0&&<p className="monitor-empty">No hay tareas con estos criterios.</p>}
 {tareas.map(t=><article className="gestion-entry" key={t.id}><div><small>{t.fecha} {t.hora?.slice(0,5)??''} · {t.prioridad.toUpperCase()}</small><h4>{t.titulo}</h4>{t.descripcion&&<p>{t.descripcion}</p>}<small>{t.estado} {datos.filas.find(f=>f.id===t.fila_id)?.codigo??''}</small></div><div className="gestion-entry-buttons">{datos.rol!=='lector'&&<><button type="button" className="text-button" disabled={ocupado} onClick={()=>editar(t)}>Editar</button>{t.estado==='pendiente'&&<button type="button" className="text-button" disabled={ocupado} onClick={()=>void guardar({...t,hora:t.hora?.slice(0,5)??'',fila_id:t.fila_id??'',plantacion_id:t.plantacion_id??'',estado:'hecha'})}>Completar</button>}</>}{irAlCalendario&&<button type="button" className="text-button" onClick={()=>irAlCalendario(t.fecha)}>Ver en calendario</button>}</div></article>)}
 </div></div></section>;
}
