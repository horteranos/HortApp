'use client';
import {useState} from 'react';
import {familia,sugerencias} from '@/lib/gestion/rotaciones';
import type {HuertoSnapshot} from '@/types/aplicacion';
export function Rotaciones({datos}:{datos:HuertoSnapshot}){
 const [fila,setFila]=useState('');
 const cosechas=datos.cuaderno.eventos.filter(e=>e.tipo==='cosecha'&&!e.anulado_en&&(!fila||e.fila_id===fila)).sort((a,b)=>b.fecha.localeCompare(a.fecha));
 const mes=Number(datos.hoy.slice(5,7));
 return <section className="surface monitor-view new-view"><div className="monitor-section-head"><div><p className="eyebrow">ROTACIONES</p><h2>Qué cultivar después de cosechar</h2><p>Alternativas según las cosechas realmente anotadas y la época del año.</p></div></div>
 <div className="monitor-fields"><label>Fila<select value={fila} onChange={e=>setFila(e.target.value)}><option value="">Todas las filas</option>{datos.filas.map(f=><option key={f.id} value={f.id}>{f.codigo}</option>)}</select></label></div>
 <p className="section-intro">Las propuestas evitan repetir la misma familia botánica de la última cosecha y priorizan una ventana estacional aproximada del litoral valenciano. No sustituyen la evaluación de suelo, enfermedades, riego o rotaciones de varios años.</p>
 {cosechas.length===0&&<p className="monitor-empty">Todavía no hay cosechas registradas para esta selección. Registra una cosecha con fecha desde la ficha del cultivo para activar recomendaciones fundamentadas.</p>}
 {cosechas.slice(0,20).map(e=><article className="gestion-entry" key={e.id}><div><small>{e.fecha} · {e.fila_codigo??'Sin fila confirmada'}</small><h4>Cosechado: {e.cultivo}</h4><p>Familia anterior: {familia(e.cultivo)??'no identificada'}</p><p><strong>Alternativas orientativas para el mes actual:</strong> {sugerencias(e,mes).map(s=>s.nombre).join(', ')||'Sin propuesta para este mes'}.</p><small>Una cosecha no confirma que el cultivo haya terminado ni que la parcela esté libre.</small></div></article>)}
 </section>;
}
