'use client';
import { useState, useTransition } from 'react';
import { EstadoInteractividad } from '@/components/pwa/EstadoInteractividad';
import {useMonitor} from '@/components/monitor/useMonitor';
import {Meteorologia} from '@/components/monitor/Meteorologia';
import {Diario} from '@/components/monitor/Diario';
import {AvisosMonitor,ResumenAvisosCultivos} from '@/components/monitor/AvisosMonitor';
import {useGestion} from '@/components/gestion/useGestion';
import {Semillero} from '@/components/gestion/Semillero';
import {Tareas} from '@/components/gestion/Tareas';
import {Rotaciones} from '@/components/gestion/Rotaciones';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cerrarSesion } from '@/app/acceso/actions';
import { GestorPuntos } from './GestorPuntos';
import { GestorSeleccion } from './GestorSeleccion';
import { FichaCultivo } from './FichaCultivo';
import { PlanoVivo } from './PlanoVivo';
import { CalendarioHuerto } from './CalendarioHuerto';
import { HistorialCultivos } from './HistorialCultivos';
import { EditorEvento } from './RegistroEvento';
import { puedeEditar, nombrePlantacion } from '@/lib/huerto/formato';
import { seleccionarPuntos, numerosEnRangos, emojiCultivo } from '@/lib/huerto/cuaderno';
import type { HuertoSnapshot, Plantacion, RolHuerto } from '@/types/aplicacion';
import type { EventoCultivo } from '@/types/cuaderno';
import type { EstadoCambioPlano } from '@/lib/huerto/validar-plano';

const roles:Record<RolHuerto,string>={administrador:'Administrador',editor:'Editor',lector:'Solo lectura'};
type Vista='plano'|'calendario'|'historial'|'meteo'|'diario'|'tareas'|'semillero'|'rotaciones';
const vistas:{id:Vista;icono:string;nombre:string}[]=[{id:'plano',icono:'▦',nombre:'Plano y cultivos'},
  {id:'calendario',icono:'□',nombre:'Calendario'}, {id:'tareas',icono:'☑',nombre:'Tareas'}, {id:'semillero',icono:'🌱',nombre:'Semillero'},
  {id:'rotaciones',icono:'↻',nombre:'Rotaciones sugeridas'},
  {id:'historial',icono:'↺',nombre:'Historial de cultivos'}, {id:'meteo',icono:'☀',nombre:'Meteorología'}, {id:'diario',icono:'✎',nombre:'Diario de actividad'}];
function BotonSalir(){const {pending}=useFormStatus();return <button type="submit" className="text-button logout-button" disabled={pending}>{pending?'Cerrando…':'Cerrar sesión'}</button>;}

export function PanelHuerto({datos,correo}:{datos:HuertoSnapshot;correo:string}) {
  const monitor=useMonitor(datos.huerto.id,datos.rol);
  const gestion=useGestion(datos.huerto.id);
  const router=useRouter(); const [actualizando,startTransition]=useTransition();
  const [vista,setVista]=useState<Vista>('plano');
  const [fechaCalendario,setFechaCalendario]=useState<string|null>(null);
  const [filaId,setFilaId]=useState([...datos.filas].sort((a,b)=>b.numero-a.numero)[0]?.id??'');
  const [seleccion,setSeleccion]=useState<string[]>([]); const [multiple,setMultiple]=useState(false);
  const [ancla,setAncla]=useState<string|null>(null); const [cambioPendiente,setCambioPendiente]=useState(false);
  const [mensaje,setMensaje]=useState<string|null>(null);
  const [registro,setRegistro]=useState<{loteId:string;evento?:EventoCultivo;puntos:string[]}|null>(null);
  const fila=datos.filas.find(f=>f.id===filaId)??datos.filas[0];
  const puntosFila=datos.puntos.filter(p=>p.fila_id===fila?.id);
  const elegidos=puntosFila.filter(p=>seleccion.includes(p.id));
  const ids=elegidos.map(p=>p.id);
  const loteRegistro=datos.plantaciones.find(c=>c.id===registro?.loteId);
  const cultivosFila=datos.plantaciones.filter(c=>c.fila_id===fila?.id||c.fila_prevista_id===fila?.id);
  const otros=datos.plantaciones.filter(c=>!c.fila_id&&!c.fila_prevista_id);
  const comunes=elegidos.length?cultivosFila.filter(c=>c.estado==='presente'&&elegidos.every(p=>datos.asignaciones.some(a=>a.punto_id===p.id&&a.plantacion_id===c.id))):[];
  const ocupado=actualizando||cambioPendiente; const listo=datos.cuaderno.estado==='listo';
  function actualizar(){startTransition(()=>router.refresh());void gestion.cargar();}
  function elegirFila(id:string){setFilaId(id);setSeleccion([]);setAncla(null);}
  function elegirPunto(f:string,id:string,rango:boolean,modificador:boolean){
    const activar=multiple||rango||modificador;if(activar)setMultiple(true);
    const orden=datos.puntos.filter(p=>p.fila_id===f).sort((a,b)=>b.numero_desde_oeste-a.numero_desde_oeste).map(p=>p.id);
    setSeleccion(seleccionarPuntos(f===filaId?seleccion:[],id,orden,activar,f===filaId?ancla:null,rango));
    setFilaId(f);if(!rango||f!==filaId)setAncla(id);
  }
  function confirmarCambio(op:'anadir_punto'|'eliminar_punto'|'asignar_cultivos',r:EstadoCambioPlano){
    setMensaje(r.mensaje);if(op==='eliminar_punto')setSeleccion([]);
    if(op==='anadir_punto'&&r.puntoId)setSeleccion([r.puntoId]);actualizar();
  }
  function abrirRegistro(lote:Plantacion,puntos:string[]=[]){setRegistro({loteId:lote.id,puntos});}
  function editarEvento(evento:EventoCultivo){setRegistro({loteId:evento.plantacion_id,evento,puntos:[]});}
  function guardado(m:string){setRegistro(null);setMensaje(m);actualizar();}
  return <div className="app-shell real-app notebook-app">
    <aside className="sidebar"><div className="brand"><span className="brand-mark" aria-hidden="true">✳</span><span><strong>{datos.huerto.nombre}</strong><small>Cuaderno de cultivo</small></span></div>
      <div className="sidebar-inner"><p className="nav-section">MI SISTEMA</p><nav className="menu" aria-label="Navegación principal">
        {vistas.map(v=><button key={v.id} type="button" className={`menu-item ${vista===v.id?'menu-active':''}`} aria-current={vista===v.id?'page':undefined}
          onClick={()=>setVista(v.id)}><span aria-hidden="true">{v.icono}</span>{v.nombre}</button>)}
      </nav><div className="sidebar-notice"><span className="notice-dot" aria-hidden="true"/> SISTEMA COMPARTIDO<p>Plano, calendario e historial conectados. Las fechas aproximadas y las ubicaciones sin confirmar se conservan como tales.</p></div>
      <p className="nav-section nav-section-second">REFERENCIA</p><nav className="menu" aria-label="Versiones"><Link className="menu-item" href="/prototipo">Prototipo inicial</Link></nav></div>
      <div className="sidebar-footer">{datos.huerto.municipio}<br/>VERSIÓN 0.7.0</div></aside>
    <main className="main">
      <header className="topbar live-topbar"><span className="breadcrumb">Mi sistema <span>/</span> {vistas.find(v=>v.id===vista)?.nombre}</span>
        <div className="session-controls"><AvisosMonitor datos={monitor.datos} ahora={monitor.ahora} usuario={datos.usuarioId} cultivos={datos.plantaciones}/><span className="role-badge">{roles[datos.rol]}</span><form action={cerrarSesion}><BotonSalir/></form></div></header>
      <nav className="pwa-bottom-navigation" aria-label="Navegación principal móvil">
        {vistas.filter(v=>['plano','calendario','tareas','meteo','diario'].includes(v.id)).map(v=><button key={v.id} type="button" aria-current={vista===v.id?'page':undefined}
          className={vista===v.id?'pwa-bottom-active':''}
          onClick={()=>{setVista(v.id);window.scrollTo({top:0,behavior:'smooth'});}}><span aria-hidden="true">{v.icono}</span><small>{v.id==='plano'?'Huerto':v.id==='meteo'?'Tiempo':v.nombre.replace(' de actividad','')}</small></button>)}
      </nav>
      <nav className="mobile-notebook-tabs" aria-label="Pestañas del cuaderno">{vistas.map(v=><button key={v.id} type="button" className={vista===v.id?'active':''} aria-current={vista===v.id?'page':undefined} onClick={()=>setVista(v.id)}>{v.nombre}</button>)}</nav>
      <div className="intro"><div><p className="eyebrow">CUADERNO COMPARTIDO · 0.7.0</p><h1>{({plano:'El huerto, de un vistazo',calendario:'Un calendario para todo',historial:'La historia de cada gotero',meteo:'El tiempo, en perspectiva',diario:'El diario del huerto',tareas:'Tareas y planificación',semillero:'Un semillero ordenado',rotaciones:'Planifica el próximo cultivo'} as Record<Vista,string>)[vista]}<span className="h1-period">.</span></h1><p className="lead">{({plano:'Gestiona los goteros y registra cuántas plantas reales hay de cada cultivo.',calendario:'Consulta fechas de cultivo, notas escritas y tareas en un único lugar.',historial:'Consulta el historial de cada fila y punto de riego.',meteo:'Histórico meteorológico y avisos a 72 horas.',diario:'Notas por voz, imágenes y vídeos vinculados a cada día.',tareas:'Organiza labores y prográmalas en el calendario.',semillero:'Veinte plazas individuales para tus planteles.',rotaciones:'Opciones orientativas según lo cosechado y la época.'} as Record<Vista,string>)[vista]}</p></div>
        <button type="button" className="secondary-button refresh-button" onClick={actualizar} disabled={ocupado}>↻ {actualizando?'Actualizando…':'Actualizar'}</button></div>
      <EstadoInteractividad/>
      {mensaje&&<div className="notebook-feedback" role="status"><span>{mensaje}</span><button className="text-button" onClick={()=>setMensaje(null)} aria-label="Cerrar aviso">×</button></div>}
      {!listo&&(['plano','calendario','historial','rotaciones'] as Vista[]).includes(vista)&&<div className="plan-upgrade-notice" role="status"><strong>Datos del cuaderno no disponibles</strong><p>La navegación sigue funcionando, pero el calendario, el historial y las rotaciones requieren la migración 06. Comprueba si ya se aplicó <code>supabase/06_cuaderno_calendario.sql</code> y verifica <code>supabase/07_comprobar_cuaderno.sql</code> antes de intentar instalarla. No recrees el huerto ni repitas migraciones sin revisar su estado.</p></div>}
      {vista==='plano'&&<>
        {gestion.error&&<p className="feedback-error">Para registrar el número de plantas: {gestion.error}</p>}
        <section className="stats-grid" aria-label="Resumen del huerto">
          <div className="stat-card"><span className="stat-icon" aria-hidden="true">☰</span><span className="stat-value">{datos.filas.length}</span><span className="stat-label">Filas de cultivo</span></div>
          <div className="stat-card"><span className="stat-icon" aria-hidden="true">◉</span><span className="stat-value">{datos.puntos.length}</span><span className="stat-label">Puntos de goteo</span></div>
          <div className="stat-card"><span className="stat-icon" aria-hidden="true">☘</span><span className="stat-value">{datos.plantaciones.length}</span><span className="stat-label">Lotes y árboles</span></div>
          <div className="stat-card"><span className="stat-icon" aria-hidden="true">□</span><span className="stat-value">{listo?datos.cuaderno.eventos.filter(e=>!e.anulado_en).length:'—'}</span><span className="stat-label">Actividades registradas</span></div>
        </section>
        <ResumenAvisosCultivos datos={monitor.datos} ahora={monitor.ahora} cultivos={datos.plantaciones}/>
        <div className="workspace-grid"><div className="map-column">
          <PlanoVivo datos={datos} filaId={fila?.id??''} seleccion={ids} multiple={multiple} ocupado={ocupado} elegirFila={elegirFila} elegirPunto={elegirPunto}
            cambiarMultiple={v=>{setMultiple(v);if(!v)setSeleccion(ids.slice(-1));}}
            seleccionarFila={()=>{setMultiple(true);setSeleccion(puntosFila.map(p=>p.id));setAncla(null);}} limpiar={()=>{setSeleccion([]);setAncla(null);}}/>
          <p className="sync-note">Pulsa Actualizar para consultar los cambios de otras sesiones. El plano no supone que un gotero sin asignación esté vacío.</p>
          {otros.length>0&&<section className="surface exterior-card"><div className="surface-header"><h2>Fuera de las filas o sin fila asignada</h2></div><div className="crop-list">{otros.map(c=><div key={c.id}><FichaCultivo datos={datos} plantacion={c} registrar={abrirRegistro} gestion={gestion}/></div>)}</div></section>}
        </div>
        {fila&&<section className="surface details-card" id="detalle-fila" tabIndex={-1} aria-labelledby="details-title">
          <div className="surface-header"><div><p className="eyebrow">DETALLE DE FILA</p><h2 id="details-title">{fila.codigo}{ids.length?` · ${ids.length} ${ids.length===1?'gotero':'goteros'}`:''}</h2></div><span className="light-pill">{puntosFila.length} PUNTOS</span></div>
          {ids.length>0&&<p className="selection-description">Selección: {numerosEnRangos(elegidos.map(p=>p.numero_desde_oeste))}, contando desde el oeste.</p>}
          {puedeEditar(datos.rol)&&(ids.length>1&&listo
            ? <GestorSeleccion key={`${fila.id}:${ids.join(',')}`} datos={datos} fila={fila} puntos={elegidos} bloqueado={actualizando} alPendiente={setCambioPendiente}
                guardado={m=>{setMensaje(m);setSeleccion([]);actualizar();}}/>
            : ids.length<=1&&<GestorPuntos key={`${fila.id}:${ids[0]??'fila'}`} datos={datos} fila={fila} punto={ids.length===1?elegidos[0]:undefined}
                bloqueado={actualizando} alPendiente={setCambioPendiente} alActualizar={actualizar} alConfirmar={confirmarCambio}/>)}
          {ids.length>0&&listo&&puedeEditar(datos.rol)&&<section className="selected-events"><h3>Registrar fecha en la selección</h3>
            {comunes.length?comunes.map(c=><button type="button" className="secondary-button compact-button" disabled={ocupado} key={c.id} onClick={()=>abrirRegistro(c,ids)}>{emojiCultivo(c.cultivo)} {nombrePlantacion(c)} · Registrar fecha</button>)
              :<p className="form-explanation">Asocia primero un cultivo a todos los puntos seleccionados. Para fechas de un lote sin puntos concretos, usa su ficha de abajo.</p>}
          </section>}
          <div className="section-subtitle">Cultivos y lotes de {fila.codigo}</div><div className="crop-list live-crop-list">{cultivosFila.map(c=><div key={c.id}><FichaCultivo datos={datos} plantacion={c} registrar={abrirRegistro} gestion={gestion}/></div>)}</div>
        </section>}
        </div>
      </>}
      {vista==='calendario'&&listo&&<CalendarioHuerto key={fechaCalendario??'hoy'} datos={datos} editar={editarEvento} gestion={gestion} fechaInicial={fechaCalendario}/>}
      {vista==='historial'&&listo&&<HistorialCultivos datos={datos} editar={editarEvento}/>}
      {vista==='meteo'&&<Meteorologia monitor={monitor} rol={datos.rol}/>}
      {vista==='diario'&&<Diario datos={datos}/>}
      {vista==='tareas'&&<Tareas datos={datos} gestion={gestion} irAlCalendario={fecha=>{setFechaCalendario(fecha);setVista('calendario');}}/>}
      {vista==='semillero'&&<Semillero datos={datos} gestion={gestion}/>}
      {vista==='rotaciones'&&listo&&<Rotaciones datos={datos}/>}
      {monitor.error&&vista!=='meteo'&&<p className="monitor-warning">Meteorologia: {monitor.error}</p>}
      <footer className="main-footer live-footer"><span className="account-email">Sesión: {correo}</span><span>Sistema compartido · v0.7.0</span></footer>
    </main>
    {registro&&loteRegistro&&<EditorEvento key={registro.evento?.id??`nuevo:${registro.loteId}`} datos={datos} lote={loteRegistro} evento={registro.evento}
      puntos={datos.puntos.filter(p=>registro.puntos.includes(p.id))} cerrar={()=>setRegistro(null)} guardado={guardado}/>}
  </div>;
}
