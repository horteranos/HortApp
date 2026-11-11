'use client';
import {useState} from 'react';
import {guardarPlantel,liberarPlaza} from '@/app/aplicacion/gestion-actions';
import type {HuertoSnapshot} from '@/types/aplicacion';
import type {GestionControl} from './useGestion';
import type {Plantel} from '@/types/gestion';
type Form=Pick<Plantel,'plaza'|'cultivo'|'variedad'|'fecha_siembra'|'fecha_prevista'|'estado'|'observaciones'|'revision'>;
const libre=(plaza:number):Form=>({plaza,cultivo:'',variedad:'',fecha_siembra:null,fecha_prevista:null,estado:'sembrado',observaciones:'',revision:-1});
export function Semillero({datos,gestion}:{datos:HuertoSnapshot;gestion:GestionControl}){
 const [form,setForm]=useState<Form|null>(null),[ocupado,setOcupado]=useState(false),[mensaje,setMensaje]=useState('');
 const valores=gestion.datos?.semillero??[];
 const seleccionar=(plaza:number)=>{const existente=valores.find(p=>p.plaza===plaza);setForm(existente?{...existente}:libre(plaza));setMensaje('');};
 async function guardar(){if(!form)return;setOcupado(true);try{const r=await guardarPlantel(datos.huerto.id,form);if(r.ok){setMensaje('Plantel guardado.');setForm(null);await gestion.cargar();}else setMensaje(r.error);}catch{setMensaje('No se ha confirmado el guardado.');}finally{setOcupado(false);}}
 async function vaciar(){if(!form||form.revision<0||!window.confirm('¿Vaciar esta plaza? Su ficha actual se eliminará.'))return;setOcupado(true);try{const r=await liberarPlaza(datos.huerto.id,form.plaza,form.revision);if(r.ok){setMensaje('Plaza libre.');setForm(null);await gestion.cargar();}else setMensaje(r.error);}catch{setMensaje('No se ha podido confirmar la operación.');}finally{setOcupado(false);}}
 return <section className="surface monitor-view new-view"><div className="monitor-section-head"><div><p className="eyebrow">PROPAGACIÓN</p><h2>Semillero · 20 plazas</h2><p>Cada posición representa un plantel individual. No se presupone que los antiguos planteles sigan en el semillero.</p></div><span className="light-pill">{valores.length}/20 OCUPADAS</span></div>
 {mensaje&&<p className="monitor-status" role="status">{mensaje}</p>}{gestion.error&&<p className="feedback-error">{gestion.error}</p>}
 <div className="plantel-grid">{Array.from({length:20},(_,i)=>{const plaza=i+1,p=valores.find(x=>x.plaza===plaza);return <button type="button" key={plaza} aria-label={`Plaza ${plaza}: ${p?p.cultivo:'libre'}`} className={`plantel-plaza ${p?'plaza-ocupada':''} ${form?.plaza===plaza?'plaza-seleccionada':''}`} onClick={()=>seleccionar(plaza)}><span className="plaza-num">{String(plaza).padStart(2,'0')}</span><span className="plaza-icono">{p?'🌱':'+'}</span><strong>{p?.cultivo??'Libre'}</strong><small>{p?.estado??'Seleccionar'}</small></button>;})}</div>
 {form&&<form className="gestion-form plantel-editor" onSubmit={e=>{e.preventDefault();void guardar();}}><div className="monitor-section-head"><h3>Plaza {form.plaza}</h3><button type="button" className="text-button" onClick={()=>setForm(null)}>Cerrar</button></div>
 <fieldset disabled={ocupado||datos.rol==='lector'} className="gestion-fieldset"><div className="monitor-fields"><label>Cultivo<input required maxLength={100} value={form.cultivo} onChange={e=>setForm({...form,cultivo:e.target.value})}/></label><label>Variedad<input maxLength={100} value={form.variedad} onChange={e=>setForm({...form,variedad:e.target.value})}/></label></div>
 <div className="monitor-fields"><label>Fecha de siembra<input type="date" value={form.fecha_siembra??''} onChange={e=>setForm({...form,fecha_siembra:e.target.value||null})}/></label><label>Trasplante previsto<input type="date" value={form.fecha_prevista??''} onChange={e=>setForm({...form,fecha_prevista:e.target.value||null})}/></label></div>
 <label>Estado<select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value as Plantel['estado']})}><option value="sembrado">Sembrado</option><option value="germinando">Germinando</option><option value="listo">Listo para trasplantar</option><option value="trasplantado">Trasplantado</option><option value="descartado">Descartado</option></select></label>
 <label>Observaciones<textarea rows={3} maxLength={1500} value={form.observaciones} onChange={e=>setForm({...form,observaciones:e.target.value})}/></label><div className="action-row"><button type="submit" className="primary-button" disabled={!form.cultivo.trim()}>Guardar plantel</button>{form.revision>=0&&<button type="button" className="secondary-button" onClick={()=>void vaciar()}>Liberar plaza</button>}</div></fieldset></form>}
 </section>;
}
