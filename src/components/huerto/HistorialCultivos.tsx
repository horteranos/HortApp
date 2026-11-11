'use client';
import { useState } from 'react';
import {DiarioVinculado} from '@/components/monitor/DiarioVinculado';
import { emojiCultivo, eventosEnPunto } from '@/lib/huerto/cuaderno';
import { ListaEventos } from './RegistroEvento';
import type { HuertoSnapshot } from '@/types/aplicacion';
import type { EventoCultivo } from '@/types/cuaderno';

function instante(fecha:string,zona:string){return new Intl.DateTimeFormat('es-ES',{timeZone:zona,dateStyle:'short',timeStyle:'short'}).format(new Date(fecha));}
export function HistorialCultivos({datos,editar}:{datos:HuertoSnapshot;editar:(e:EventoCultivo)=>void}) {
  const [filaFiltro,setFila]=useState(''); const [cultivo,setCultivo]=useState(''); const [anulados,setAnulados]=useState(false);
  const eventos=datos.cuaderno.eventos.filter(e=>(anulados||!e.anulado_en)&&(!cultivo||e.plantacion_id===cultivo));
  const ocupaciones=datos.cuaderno.ocupaciones.filter(o=>!cultivo||o.plantacion_id===cultivo);
  const filas=[...datos.filas].sort((a,b)=>b.numero-a.numero).filter(f=>!filaFiltro||f.id===filaFiltro);
  return <section className="surface notebook-view" aria-labelledby="historial-title">
    <div className="surface-header"><div><p className="eyebrow">FILAS → GOTEROS → CULTIVOS</p><h2 id="historial-title">Historial del huerto</h2></div><span className="light-pill">TRAZABILIDAD</span></div>
    <div className="notebook-content">
      <p className="section-intro">Consulta qué cultivos han estado asociados a cada gotero y sus actividades registradas. Las altas y retiradas indican cambios en la aplicación, no fechas de siembra.</p>
      <div className="notebook-filters"><label>Fila<select value={filaFiltro} onChange={e=>setFila(e.target.value)}><option value="">Todas las filas</option>{[...datos.filas].sort((a,b)=>b.numero-a.numero).map(f=><option key={f.id} value={f.id}>{f.codigo}</option>)}<option value="exterior">Exterior / sin fila</option></select></label>
        <label>Lote<select value={cultivo} onChange={e=>setCultivo(e.target.value)}><option value="">Todos los lotes</option>{datos.plantaciones.map(c=><option key={c.id} value={c.id}>{c.cultivo}{c.variedad?` · ${c.variedad}`:''} · {datos.filas.find(f=>f.id===c.fila_id)?.codigo??'Exterior'}</option>)}</select></label>
        <label className="filter-checkbox"><input type="checkbox" checked={anulados} onChange={e=>setAnulados(e.target.checked)}/> Mostrar registros anulados</label></div>
      {filas.map(f=>{
        const os=ocupaciones.filter(o=>o.fila_id===f.id), es=eventos.filter(e=>e.fila_id===f.id);
        const puntoIds=[...new Set([...os.map(o=>o.punto_id),...es.flatMap(e=>e.puntos_snapshot.map(p=>p.id))])];
        const numero=(id:string)=>datos.puntos.find(p=>p.id===id)?.numero_desde_oeste ?? os.find(o=>o.punto_id===id)?.numero_al_retirar ?? os.find(o=>o.punto_id===id)?.numero_al_asignar ?? es.flatMap(e=>e.puntos_snapshot).find(p=>p.id===id)?.numero ?? 0;
        const lotes=datos.plantaciones.filter(c=>(c.fila_id===f.id||c.fila_prevista_id===f.id)&&(!cultivo||c.id===cultivo));
        return <details className="history-row" key={f.id} open={!!filaFiltro||f.numero===6}>
          <summary><strong>{f.codigo}</strong><span>{puntoIds.length} goteros con historial · {lotes.length} lotes</span></summary>
          <div className="history-row-body"><DiarioVinculado huerto={datos.huerto.id} fila={f.id}/>
            {puntoIds.sort((a,b)=>numero(b)-numero(a)||a.localeCompare(b)).map(id=>{
              const actual=datos.puntos.find(p=>p.id===id), ocup=os.filter(o=>o.punto_id===id).sort((a,b)=>a.registrado_en.localeCompare(b.registrado_en));
              const ep=eventosEnPunto(es,id);
              return <details className="history-point" key={id}>
                <summary><strong>{actual?`Gotero ${actual.numero_desde_oeste}`:`Gotero eliminado · n.º ${numero(id)} al registrarlo`}</strong>
                  <span>{new Set(ocup.map(o=>o.plantacion_id)).size} cultivos · {ep.length} actividades</span></summary>
                <div className="history-point-body"><p className="point-identity">Identidad estable: {id.slice(0,8)}… · Los números pueden cambiar al insertar o eliminar goteros.</p>
                  <ol className="occupation-list">{ocup.map(o=><li key={o.id}><strong>{emojiCultivo(o.cultivo)} {o.cultivo}{o.variedad?` · ${o.variedad}`:''}</strong>
                    <p>{o.inicio_desconocido?'Asociación ya existente al activar el historial; fecha inicial desconocida.':`Asociado en la aplicación: ${instante(o.registrado_en,datos.huerto.zona_horaria)}.`}</p>
                    <p>{o.retirado_en?`Asociación retirada: ${instante(o.retirado_en,datos.huerto.zona_horaria)}.`:'Asociación vigente.'} Registrado originalmente como gotero {o.numero_al_asignar}.</p></li>)}</ol>
                  <DiarioVinculado huerto={datos.huerto.id} fila={f.id} punto={id}/><h4>Actividades con este punto confirmado</h4><ListaEventos eventos={ep} datos={datos} editar={editar}/>
                </div>
              </details>;
            })}
            {!puntoIds.length&&<p className="empty-state">Todavía no hay asociaciones registradas para esta fila.</p>}
            <details className="history-lots"><summary>Registros de lote sin desglose por gotero y lotes sin ubicación puntual</summary>
              <p className="form-explanation">Estas fechas no se atribuyen a goteros actuales: no consta qué puntos correspondían al evento.</p>
              {lotes.filter(c=>es.some(e=>e.plantacion_id===c.id&&e.puntos_snapshot.length===0)||!os.some(o=>o.plantacion_id===c.id)).map(c=><div key={c.id} className="history-lot">
                <h4>{emojiCultivo(c.cultivo)} {c.cultivo}{c.variedad?` · ${c.variedad}`:''}</h4>
                <ListaEventos eventos={es.filter(e=>e.plantacion_id===c.id&&!e.puntos_snapshot.length)} datos={datos} editar={editar}/>
                {!datos.asignaciones.some(a=>a.plantacion_id===c.id)&&<p className="form-explanation">Sin goteros asociados actualmente. {c.ubicacion_texto??'Puntos sin confirmar.'}</p>}
              </div>)}
            </details>
          </div>
        </details>;
      })}
      {(!filaFiltro||filaFiltro==='exterior')&&<details className="history-row" open={filaFiltro==='exterior'}><summary><strong>Exterior / sin fila asignada</strong></summary>
        <div className="history-row-body">{datos.plantaciones.filter(c=>!c.fila_id&&!c.fila_prevista_id&&(!cultivo||c.id===cultivo)).map(c=><div key={c.id} className="history-lot">
          <h4>{emojiCultivo(c.cultivo)} {c.cultivo}</h4><p>{c.ubicacion_texto}</p><ListaEventos eventos={eventos.filter(e=>e.plantacion_id===c.id)} datos={datos} editar={editar}/></div>)}</div></details>}
      <p className="history-limit">El historial de ocupación comienza con este parche. No reconstruye cambios anteriores que nunca se guardaron. Conserva las fechas previas disponibles y marca las ubicaciones históricas desconocidas.</p>
    </div>
  </section>;
}
