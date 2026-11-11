'use client';
import { useActionState, useState } from 'react';
import { ejecutarLote } from '@/app/aplicacion/cuaderno-actions';
import { emojiCultivo, numerosEnRangos } from '@/lib/huerto/cuaderno';
import { nombrePlantacion } from '@/lib/huerto/formato';
import type { HuertoSnapshot, FilaHuerto, PuntoRiego } from '@/types/aplicacion';
import type { EstadoCuaderno, ModoLote } from '@/types/cuaderno';

export function GestorSeleccion({ datos, fila, puntos, bloqueado, alPendiente, guardado }: {
  datos: HuertoSnapshot; fila: FilaHuerto; puntos: PuntoRiego[]; bloqueado: boolean;
  alPendiente:(v:boolean)=>void; guardado:(mensaje:string,eliminados:boolean)=>void;
}) {
  const [contexto]=useState(()=>({fila,puntos:[...puntos],lotes:datos.plantaciones.filter(p=>p.fila_id===fila.id&&p.estado==='presente')}));
  const [modo,setModo]=useState<ModoLote>('agregar');
  const [estado,accion,pendiente]=useActionState<EstadoCuaderno,FormData>(async(a,f)=>{
    alPendiente(true);try {const r=await ejecutarLote(a,f);if(r.estado==='guardado')guardado(r.mensaje,f.get('modo')==='eliminar_puntos');return r;}
    finally{alPendiente(false);}
  },{estado:'inicial',mensaje:''});
  const ocupado=pendiente||bloqueado;
  const obsoleto=fila.version_plano!==contexto.fila.version_plano;
  return <form action={accion} className="point-management-form batch-form" aria-label="Gestionar varios goteros">
    <h3>{puntos.length} goteros seleccionados</h3>
    <p className="selection-summary">{contexto.fila.codigo} · {numerosEnRangos(contexto.puntos.map(p=>p.numero_desde_oeste))}, desde el oeste.</p>
    <input type="hidden" name="huerto_id" value={fila.huerto_id}/><input type="hidden" name="fila_id" value={fila.id}/>
    <input type="hidden" name="version_plano" value={contexto.fila.version_plano}/><input type="hidden" name="seleccion_completa" value="si"/>
    {contexto.puntos.map(p=><input key={p.id} type="hidden" name="punto_ids" value={p.id}/>)}
    <label className="management-field">Acción sobre todos los seleccionados<select name="modo" value={modo} disabled={ocupado} onChange={e=>setModo(e.target.value as ModoLote)}>
      <option value="agregar">Añadir cultivos, conservando los demás</option>
      <option value="retirar">Retirar solo los cultivos marcados</option>
      <option value="reemplazar">Sustituir los cultivos presentes por los marcados</option>
      {datos.rol==='administrador'&&<option value="eliminar_puntos">Eliminar los goteros seleccionados</option>}
    </select></label>
    {modo!=='eliminar_puntos'&&<>
      <fieldset className="crop-choice-fieldset" disabled={ocupado}><legend>Lotes de {fila.codigo}</legend>
        <div className="crop-choices">{contexto.lotes.map(l=><label className="crop-choice" key={l.id}>
          <input type="checkbox" name="plantacion_ids" value={l.id}/><span>{emojiCultivo(l.cultivo)} {nombrePlantacion(l)}</span></label>)}</div>
        {!contexto.lotes.length&&<p className="form-explanation">No hay lotes presentes en esta fila.</p>}
      </fieldset>
      {['agregar','reemplazar'].includes(modo)&&<fieldset className="new-crop-fieldset" disabled={ocupado}>
        <legend>O crear un lote nuevo para todos estos puntos</legend>
        <label className="management-field">Cultivo nuevo<input name="cultivo_nuevo" maxLength={100} placeholder="Solo si no existe en la lista"/></label>
        <label className="management-field">Variedad (opcional)<input name="variedad_nueva" maxLength={100}/></label>
        <p className="form-explanation">Se crea un único lote compartido por los puntos seleccionados, no un lote por gotero.</p>
      </fieldset>}
    </>}
    {['reemplazar','eliminar_puntos'].includes(modo)&&<label className="delete-confirmation" key={modo}>
      <input type="checkbox" name="confirmar" value="si" required disabled={ocupado}/>
      <span>{modo==='eliminar_puntos'?'Confirmo la eliminación de estos goteros y la renumeración. El historial se conserva.':'Confirmo la sustitución de las asociaciones presentes. Sin cultivos marcados, se retirarán todas las asociaciones presentes de estos puntos.'}</span></label>}
    <p className="form-explanation">Retirar un cultivo del plano no borra el lote ni sus notas y fechas.</p>
    {obsoleto&&<p className="feedback-error">La fila ha cambiado. Vuelve a seleccionar los puntos antes de guardar.</p>}
    {estado.mensaje&&<p role={estado.estado==='guardado'?'status':'alert'} className={estado.estado==='guardado'?'feedback-success':'feedback-error'}>{estado.mensaje}</p>}
    <button type="submit" className={modo==='eliminar_puntos'?'danger-button':'primary-button'} disabled={ocupado||obsoleto||estado.estado==='conflicto'}>
      {pendiente?'Guardando…':modo==='eliminar_puntos'?'Eliminar goteros seleccionados':'Aplicar a los goteros seleccionados'}</button>
  </form>;
}
