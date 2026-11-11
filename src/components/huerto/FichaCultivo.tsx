"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { guardarNotas } from "@/app/aplicacion/actions";
import { describirUbicacion, etiquetaEstado, formatearFecha, nombrePlantacion, puedeEditar } from "@/lib/huerto/formato";
import { emojiCultivo, numerosEnRangos, TIPOS_EVENTO } from "@/lib/huerto/cuaderno";
import type { EstadoGuardado } from "@/lib/huerto/validar-notas";
import type { HuertoSnapshot, Plantacion } from "@/types/aplicacion";
import type {GestionControl} from "@/components/gestion/useGestion";
import {RecuentoPlantas} from "@/components/gestion/RecuentoPlantas";
function EditorNotas({ plantacion, cerrar }: { plantacion: Plantacion; cerrar: () => void }) {
  // Texto y timestamp se abren juntos. Una nueva lectura no cambia el token
  // mientras hay un borrador: solo un guardado confirmado permite avanzarlo.
  // Un error posterior tampoco debe perder la última versión confirmada.
  const [version, setVersion] = useState(plantacion.actualizado_en);
  const [estado, accion, pendiente] = useActionState<EstadoGuardado, FormData>(async (anterior, formData) => {
    const resultado = await guardarNotas(anterior, formData);
    if (resultado.estado === "guardado" && resultado.actualizadoEn) setVersion(resultado.actualizadoEn);
    return resultado;
  }, { estado: "inicial", mensaje: "" });
  const [borrador, setBorrador] = useState(plantacion.notas ?? "");
  const campo = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { campo.current?.focus(); }, []);
  const sigueGuardado = estado.estado === "guardado" && (borrador.trim() === "" ? null : borrador) === estado.notas;
  const mensajeVisible = estado.estado !== "guardado" || sigueGuardado;
  return (
    <form action={accion} className="notes-editor" aria-label={`Editar notas de ${nombrePlantacion(plantacion)}`}>
      <input type="hidden" name="plantacion_id" value={plantacion.id} />
      <input type="hidden" name="huerto_id" value={plantacion.huerto_id} />
      <input type="hidden" name="actualizado_en" value={version} />
      <label htmlFor={`notas-${plantacion.id}`}>Notas del lote</label>
      <textarea ref={campo} id={`notas-${plantacion.id}`} name="notas" rows={6} maxLength={4000}
        value={borrador} onChange={(event) => setBorrador(event.target.value)} disabled={pendiente}
        aria-describedby={`ayuda-${plantacion.id}`} />
      <div className="field-help" id={`ayuda-${plantacion.id}`}><span>Los cambios se guardan al pulsar el botón.</span><span>{borrador.length}/4000</span></div>
      {estado.mensaje && mensajeVisible && <p className={estado.estado === "guardado" ? "feedback-success" : "feedback-error"}
        role={estado.estado === "guardado" ? "status" : "alert"}>{estado.mensaje}</p>}
      {estado.estado === "conflicto" && <p className="field-help conflict-help">Conserva tu borrador antes de recargar; después abre de nuevo las notas para revisar la versión actual.</p>}
      <div className="action-row">
        <button type="submit" className="primary-button compact-button" disabled={pendiente || estado.estado === "conflicto"}>{pendiente ? "Guardando…" : "Guardar notas"}</button>
        <button type="button" className="secondary-button compact-button" onClick={cerrar} disabled={pendiente}>{sigueGuardado ? "Cerrar" : "Cancelar"}</button>
      </div>
    </form>
  );
}

export function FichaCultivo({ plantacion, datos, registrar, gestion }: { plantacion: Plantacion; datos: HuertoSnapshot; registrar: (lote: Plantacion) => void; gestion: GestionControl }) {
  const [editando, setEditando] = useState(false);
  const nombre = nombrePlantacion(plantacion);
  const idsPuntos = new Set(datos.asignaciones.filter((item) => item.plantacion_id === plantacion.id).map((item) => item.punto_id));
  const puntosActuales = datos.puntos.filter((item) => idsPuntos.has(item.id));
  const ubicacionActual = datos.filas.map((fila) => {
    const numeros = puntosActuales.filter((item) => item.fila_id === fila.id).map((item) => item.numero_desde_oeste);
    return numeros.length > 0 ? `${fila.codigo} · ${numeros.length === 1 ? "gotero" : "goteros"} ${numerosEnRangos(numeros)}` : null;
  }).filter(Boolean).join("; ");
  return (
    <article className="crop-item live-crop" aria-label={nombre}>
      <div className="crop-item-header"><h3><span aria-hidden="true">{emojiCultivo(plantacion.cultivo)}</span> {nombre}</h3><RecuentoPlantas plantacion={plantacion} datos={datos} gestion={gestion}/></div>
      <div className="crop-meta"><span className={`status status-${plantacion.estado}`}>{etiquetaEstado(plantacion.estado)}</span>{plantacion.es_permanente && <span className="permanent-tag">Permanente</span>}</div>
      
      {datos.cuaderno.estado === "listo" ? <div className="crop-dates">
        <strong>Fechas del cuaderno</strong>
        {datos.cuaderno.eventos.filter(e=>e.plantacion_id===plantacion.id&&!e.anulado_en).length===0
          ? <p className="crop-uncertainty">Sin fechas registradas.</p>
          : <ul>{datos.cuaderno.eventos.filter(e=>e.plantacion_id===plantacion.id&&!e.anulado_en)
            .sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,4).map(e=><li key={e.id}>
              {TIPOS_EVENTO[e.tipo]}: {formatearFecha(e.fecha,e.precision_fecha)}{e.puntos_snapshot.length?` (G${numerosEnRangos(e.puntos_snapshot.map(p=>p.numero))} al registrar)`:''}
            </li>)}</ul>}
        {puedeEditar(datos.rol)&&<button className="text-button" type="button" onClick={()=>registrar(plantacion)}>+ Registrar siembra, plantación o cosecha</button>}
      </div> : <dl className="crop-facts"><div><dt>Fecha inicial</dt><dd>{formatearFecha(plantacion.fecha_inicio,plantacion.precision_fecha_inicio)}</dd></div></dl>}
      {puntosActuales.length > 0
        ? <><p className="crop-location"><strong>Ubicación asociada actualmente:</strong> {ubicacionActual}, contando desde el oeste.</p>
          <p className="crop-assignment">{puntosActuales.length} puntos de riego asociados · cantidad de plantas independiente</p>
          <details className="location-history"><summary>Ubicación descrita inicialmente</summary><p>{describirUbicacion(plantacion, datos.filas)}</p></details></>
        : <><p className="crop-location"><strong>{plantacion.codigo_origen ? "Ubicación descrita inicialmente:" : "Descripción de ubicación:"}</strong> {describirUbicacion(plantacion, datos.filas)}</p>
          <p className="crop-assignment">Sin goteros asociados actualmente.</p></>}
      {editando && puedeEditar(datos.rol)
        ? <EditorNotas plantacion={plantacion} cerrar={() => setEditando(false)} />
        : <><p className={`crop-note preserved-note ${plantacion.notas ? "" : "empty-note"}`}>{plantacion.notas || "Sin notas añadidas."}</p>
          {puedeEditar(datos.rol) && <button type="button" className="text-button edit-notes" onClick={() => setEditando(true)} aria-label={`Editar notas de ${nombre}`}>Editar notas <span aria-hidden="true">↗</span></button>}</>}
    </article>
  );
}

