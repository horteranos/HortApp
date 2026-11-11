'use client';
import { emojiCultivo } from '@/lib/huerto/cuaderno';
import { nombrePlantacion } from '@/lib/huerto/formato';
import type { HuertoSnapshot } from '@/types/aplicacion';

export function PlanoVivo({datos,filaId,seleccion,multiple,ocupado,elegirFila,elegirPunto,cambiarMultiple,seleccionarFila,limpiar}: {
  datos:HuertoSnapshot;filaId:string;seleccion:string[];multiple:boolean;ocupado:boolean;
  elegirFila:(id:string)=>void;elegirPunto:(fila:string,id:string,rango:boolean,modificador:boolean)=>void;
  cambiarMultiple:(v:boolean)=>void;seleccionarFila:()=>void;limpiar:()=>void;
}) {
  const filas=[...datos.filas].sort((a,b)=>b.numero-a.numero);
  const lotes=new Map(datos.plantaciones.map(c=>[c.id,c]));
  const limonero=datos.plantaciones.find(c=>c.codigo_origen==='exterior-limonero');
  const maximo=Math.max(1,...filas.map(f=>datos.puntos.filter(p=>p.fila_id===f.id).length));
  return <section className="surface map-card" aria-labelledby="map-title">
    <div className="surface-header"><div><p className="eyebrow">PARCELA · ESQUEMA</p><h2 id="map-title">Plano del huerto</h2></div><span className="light-pill">{datos.puntos.length} GOTEROS</span></div>
    <div className="selection-toolbar"><label><input type="checkbox" checked={multiple} disabled={ocupado} onChange={e=>cambiarMultiple(e.target.checked)}/> Seleccionar varios</label>
      <button type="button" className="text-button" onClick={seleccionarFila} disabled={ocupado}>Toda la fila</button>
      <button type="button" className="text-button" onClick={limpiar} disabled={ocupado||!seleccion.length}>Limpiar selección</button>
      <span className="selection-count" aria-live="polite">{seleccion.length} seleccionados</span></div>
    <div className="compass"><span>← ESTE</span><span>OESTE →</span></div>
    <p className="map-scroll-hint">Activa «Seleccionar varios» y pulsa los goteros; Mayúsculas permite seleccionar un tramo. Se trabaja por fila. <a href="#detalle-fila">Ir al detalle</a></p>
    <div className="map-scroll soil-scroll" tabIndex={0} role="region" aria-label="Plano desplazable: este a la izquierda, oeste a la derecha; F6 arriba y F1 abajo.">
      <div className="map-inner point-layout-map soil-map" style={{minWidth:Math.max(760,maximo*44+210)}}>
        {filas.map(f=>{const puntos=datos.puntos.filter(p=>p.fila_id===f.id).sort((a,b)=>b.numero_desde_oeste-a.numero_desde_oeste);
          return <div className={`plot-row ${filaId===f.id?'plot-row-selected':''}`} key={f.id}>
            <div className="row-heading"><button type="button" className="row-button" aria-pressed={filaId===f.id} disabled={ocupado} onClick={()=>elegirFila(f.id)}>{f.codigo}</button><span className="row-count">{puntos.length} p.</span></div>
            <div className={`drip-line ${puntos.length?'':'drip-line-empty'}`} style={{gridTemplateColumns:`repeat(${Math.max(1,puntos.length)},minmax(44px,1fr))`}}>
              {puntos.map(p=>{const cs=datos.asignaciones.filter(a=>a.punto_id===p.id).map(a=>lotes.get(a.plantacion_id)).filter(c=>c?.estado==='presente');
                const nombres=cs.map(c=>nombrePlantacion(c!)).join(', '), iconos=cs.map(c=>emojiCultivo(c!.cultivo));
                const titulo=`${f.codigo}, gotero ${p.numero_desde_oeste} desde el oeste: ${nombres||'sin cultivo asignado; ocupacion real sin confirmar'}`;
                return <button type="button" key={p.id} className={`drip-point ${cs.length?'drip-zone':''} ${seleccion.includes(p.id)?'drip-selected':''}`}
                  aria-pressed={seleccion.includes(p.id)} aria-label={titulo} title={titulo} disabled={ocupado}
                  onClick={e=>elegirPunto(f.id,p.id,e.shiftKey,e.ctrlKey||e.metaKey)}>
                  <span className="point-crop-icon" aria-hidden="true">{iconos.slice(0,2).join('')}{cs.length>2&&<small>+{cs.length-2}</small>}</span>
                  <span className="point-emitter" aria-hidden="true"/><span className="point-number" aria-hidden="true">{p.numero_desde_oeste}</span>
                </button>;})}
              {!puntos.length&&<span className="row-empty-label">Sin goteros</span>}
            </div>
            <div className="row-exterior-slot">{f.numero===6&&limonero&&<div className="row-exterior-marker"><span aria-hidden="true">🍋</span><span>Limonero<small>Fuera de F6 · oeste</small></span></div>}</div>
          </div>;})}
      </div>
    </div>
    <div className="map-legend"><span><i className="legend-point"/> Gotero</span><span>🌱 Cultivo asignado</span><span><i className="legend-outline"/> Selección</span></div>
    <p className="map-caveat">Representación esquemática, no a escala. Numeración desde el oeste (derecha). Los emojis son orientativos; consulta el nombre exacto al seleccionar el gotero. Un punto sin icono no significa que esté vacío.</p>
  </section>;
}
