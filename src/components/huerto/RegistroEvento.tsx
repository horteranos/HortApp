'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import { ejecutarEvento } from '@/app/aplicacion/cuaderno-actions';
import { TIPOS_EVENTO, emojiCultivo, numerosEnRangos } from '@/lib/huerto/cuaderno';
import { generarUUID } from '@/lib/seguridad/uuid.mjs';
import { formatearFecha, nombrePlantacion, puedeEditar } from '@/lib/huerto/formato';
import type { HuertoSnapshot, Plantacion, PuntoRiego } from '@/types/aplicacion';
import type { EventoCultivo, EstadoCuaderno } from '@/types/cuaderno';

export function EditorEvento({ datos, lote, evento, puntos = [], cerrar, guardado }: {
  datos: HuertoSnapshot; lote: Plantacion; evento?: EventoCultivo; puntos?: PuntoRiego[];
  cerrar:()=>void; guardado:(mensaje:string)=>void;
}) {
  // Snapshot frozen when the form opens: refresh must never advance its revision.
  const [contexto] = useState(()=>({evento,lote,puntos:[...puntos],
    version:datos.filas.find(f=>f.id===lote.fila_id)?.version_plano,
    id:evento?.id ?? generarUUID()}));
  const [anulando,setAnulando]=useState(false);
  const [usarPuntos,setUsarPuntos]=useState(puntos.length>0);
  const dialogo=useRef<HTMLDialogElement>(null);
  const [estado,accion,pendiente]=useActionState<EstadoCuaderno,FormData>(async (a,f)=>{
    const r=await ejecutarEvento(a,f); if(r.estado==='guardado') guardado(r.mensaje); return r;
  },{estado:'inicial',mensaje:''});
  useEffect(()=>{
    const d=dialogo.current; d?.showModal(); return ()=>{if(d?.open) d.close();};
  },[]);
  const e=contexto.evento;
  const ids = e ? e.puntos_snapshot.map(p=>p.id) : usarPuntos ? contexto.puntos.map(p=>p.id) : [];
  return <dialog ref={dialogo} className="event-dialog" aria-labelledby="evento-titulo"
    onCancel={ev=>{ev.preventDefault();if(!pendiente)cerrar();}}>
    <div className="dialog-header"><div><p className="eyebrow">CUADERNO DE CULTIVO</p>
      <h2 id="evento-titulo">{anulando?'Anular registro':e?'Editar fecha registrada':'Registrar una actividad'}</h2></div>
      <button type="button" className="dialog-close" onClick={cerrar} disabled={pendiente} aria-label="Cerrar formulario">×</button></div>
    <p className="dialog-crop"><span aria-hidden="true">{emojiCultivo(lote.cultivo)}</span> {nombrePlantacion(lote)}</p>
    <form action={accion}>
      <input type="hidden" name="operacion" value={anulando?'anular':'guardar'} />
      <input type="hidden" name="huerto_id" value={contexto.lote.huerto_id} />
      <input type="hidden" name="plantacion_id" value={contexto.lote.id} />
      <input type="hidden" name="evento_id" value={contexto.id} />
      <input type="hidden" name="revision" value={e?.revision ?? -1} />
      {contexto.version!==undefined && <input type="hidden" name="version_plano" value={contexto.version} />}
      {ids.map(id=><input key={id} type="hidden" name="punto_ids" value={id} />)}
      {anulando ? <>
        <p>El registro dejará de aparecer en el calendario activo, pero se conservará en el historial como anulado.</p>
        <label className="management-field">Motivo de la anulación<textarea name="motivo" rows={3} maxLength={500} required disabled={pendiente} /></label>
        <label className="delete-confirmation"><input type="checkbox" name="confirmar" value="si" required disabled={pendiente}/> Confirmo la anulación.</label>
      </> : <>
        <div className="event-fields">
          <label className="management-field">Actividad<select name="tipo" defaultValue={e?.tipo??'siembra'} required disabled={pendiente}>
            {Object.entries(TIPOS_EVENTO).map(([valor,titulo])=><option key={valor} value={valor}>{titulo}</option>)}
          </select></label>
          <label className="management-field">Fecha<input type="date" name="fecha" min="1900-01-01" max={datos.hoy}
            defaultValue={e?.fecha??''} required disabled={pendiente} /></label>
        </div>
        <label className="management-field">Precisión de la fecha<select name="precision_fecha" defaultValue={e?.precision_fecha??'exacta'} disabled={pendiente}>
          <option value="exacta">Fecha exacta</option><option value="aproximada">Fecha aproximada</option></select></label>
        {e ? <p className="event-scope">{e.puntos_snapshot.length ? `Puntos registrados: ${e.fila_codigo} · ${numerosEnRangos(e.puntos_snapshot.map(p=>p.numero))} (numeración del registro).`:'Registro del lote: puntos en esa fecha sin confirmar.'} La ubicación histórica no cambia al editar la fecha.</p>
          : <fieldset className="event-scope"><legend>Alcance del registro</legend>
            {contexto.puntos.length>0 && <label><input type="radio" name="alcance" checked={usarPuntos} onChange={()=>setUsarPuntos(true)} disabled={pendiente}/>
              Los {contexto.puntos.length} goteros seleccionados: {numerosEnRangos(contexto.puntos.map(p=>p.numero_desde_oeste))}</label>}
            <label><input type="radio" name="alcance" checked={!usarPuntos} onChange={()=>setUsarPuntos(false)} disabled={pendiente}/>
              El lote, sin confirmar puntos concretos para esta fecha</label>
            <small>Solo vincula puntos cuando sepas que esa actividad corresponde a ellos.</small>
          </fieldset>}
        <label className="management-field">Notas <span className="optional-field">(opcional)</span>
          <textarea name="notas" rows={4} defaultValue={e?.notas??''} maxLength={4000} disabled={pendiente}/></label>
        <p className="form-explanation">Registra hechos ya realizados, no fechas previstas. Una cosecha no retira el cultivo: admite recolecciones sucesivas.</p>
      </>}
      {estado.mensaje && <p role="alert" className="feedback-error">{estado.mensaje}</p>}
      <div className="action-row dialog-actions">
        <button type="submit" className={anulando?'danger-button':'primary-button'} disabled={pendiente||estado.estado==='conflicto'}>
          {pendiente?'Guardando…':anulando?'Confirmar anulación':'Guardar registro'}</button>
        <button type="button" className="secondary-button" onClick={cerrar} disabled={pendiente}>Cerrar</button>
        {e&&!e.anulado_en&&!anulando&&<button type="button" className="text-button delete-point-trigger" disabled={pendiente} onClick={()=>setAnulando(true)}>Anular registro</button>}
        {anulando&&<button type="button" className="text-button" disabled={pendiente} onClick={()=>setAnulando(false)}>Volver a editar</button>}
      </div>
    </form>
  </dialog>;
}

export function ListaEventos({ eventos, datos, editar }: {
  eventos: EventoCultivo[]; datos: HuertoSnapshot; editar:(evento:EventoCultivo)=>void;
}) {
  if(!eventos.length) return <p className="empty-state">No hay fechas registradas en este apartado.</p>;
  return <ol className="event-list">{[...eventos].sort((a,b)=>b.fecha.localeCompare(a.fecha)||a.id.localeCompare(b.id)).map(e=><li key={e.id} className={`event-entry event-${e.tipo} ${e.anulado_en?'event-cancelled':''}`}>
    <div className="event-entry-main"><span className="crop-emoji" aria-hidden="true">{emojiCultivo(e.cultivo)}</span><div>
      <strong>{TIPOS_EVENTO[e.tipo]} · {e.cultivo}{e.variedad?` · ${e.variedad}`:''}</strong>
      <p><time dateTime={e.fecha}>{formatearFecha(e.fecha,e.precision_fecha)}</time> · {e.fila_codigo??'Exterior / sin fila'}
        {e.puntos_snapshot.length ? ` · G${numerosEnRangos(e.puntos_snapshot.map(p=>p.numero))} al registrar` : ' · Puntos sin confirmar'}</p>
      {e.anulado_en&&<p className="cancelled-label">Anulado: {e.motivo_anulacion}</p>}
      {e.notas&&<details className="event-notes"><summary>Ver notas{e.origen==='migracion_06'?' y origen':''}</summary><p>{e.notas}</p></details>}
      {e.revision>0&&<small>Registro revisado · versión {e.revision+1}</small>}
    </div></div>
    {puedeEditar(datos.rol)&&!e.anulado_en&&<button type="button" className="text-button" onClick={()=>editar(e)} aria-label={`Editar ${TIPOS_EVENTO[e.tipo]} de ${e.cultivo} del ${e.fecha}`}>Editar</button>}
  </li>)}</ol>;
}
