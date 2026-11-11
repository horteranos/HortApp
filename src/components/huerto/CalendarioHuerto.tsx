'use client';
import {useEffect,useState} from 'react';
import {operacionMonitor} from '@/app/aplicacion/monitor-actions';
import {cambiarMes,diasCalendario,etiquetaMes,emojiCultivo,TIPOS_EVENTO} from '@/lib/huerto/cuaderno';
import {ListaEventos} from './RegistroEvento';
import {estimarCosechas} from '@/lib/huerto/cosechas';
import {formatearFecha} from '@/lib/huerto/formato';
import type {HuertoSnapshot} from '@/types/aplicacion';
import type {EventoCultivo} from '@/types/cuaderno';
import type {GestionControl} from '@/components/gestion/useGestion';
import type {PaginaDiario,DiarioEntrada} from '@/types/monitor';
export function CalendarioHuerto({datos,editar,gestion,fechaInicial}:{datos:HuertoSnapshot;editar:(e:EventoCultivo)=>void;gestion:GestionControl;fechaInicial?:string|null}){
 const [mes,setMes]=useState((fechaInicial??datos.hoy).slice(0,7));
 const [fila,setFila]=useState(''),[tipo,setTipo]=useState(''),[cultivo,setCultivo]=useState('');
 const [dia,setDia]=useState<string|null>(fechaInicial??null),[notas,setNotas]=useState<DiarioEntrada[]>([]),[errorNotas,setErrorNotas]=useState(''),[cargandoNotas,setCargandoNotas]=useState(false);
 const [mostrarNotas,setMostrarNotas]=useState(true),[mostrarTareas,setMostrarTareas]=useState(true),[mostrarCosechas,setMostrarCosechas]=useState(true);
 const dias=diasCalendario(mes);
 useEffect(()=>{let vivo=true;const desde=diasCalendario(mes)[0],hasta=diasCalendario(mes).at(-1)!;const cargar=async()=>{setCargandoNotas(true);try{const r=await operacionMonitor<PaginaDiario>(datos.huerto.id,'diario_exportar',{desde,hasta});if(!vivo)return;if(r.ok){setNotas(r.datos.entradas);setErrorNotas('');}else{setErrorNotas(r.error);setNotas([]);}}catch{if(vivo){setErrorNotas('No se pudieron cargar las notas fechadas.');setNotas([]);}}finally{if(vivo)setCargandoNotas(false);}};void Promise.resolve().then(()=>{if(vivo)return cargar();});return()=>{vivo=false;};},[mes,datos.huerto.id]);
 const filtrados=datos.cuaderno.eventos.filter(e=>!e.anulado_en&&(!fila||(fila==='exterior'?!e.fila_id:e.fila_id===fila))&&(!tipo||e.tipo===tipo)&&(!cultivo||e.plantacion_id===cultivo));
 const notasFiltradas=mostrarNotas?notas.filter(n=>!n.anulado_en&&(!fila||(fila==='exterior'?!n.fila_id:n.fila_id===fila))&&(!cultivo||n.plantacion_id===cultivo)):[];
 const tareas=mostrarTareas?(gestion.datos?.tareas??[]).filter(t=>t.estado!=='cancelada'&&(!fila||(fila==='exterior'?!t.fila_id:t.fila_id===fila))&&(!cultivo||t.plantacion_id===cultivo)):[];
 const todasVentanas=estimarCosechas(datos.plantaciones,datos.cuaderno.eventos);
 const ventanas=mostrarCosechas&&(!tipo||tipo==='cosecha')?todasVentanas.filter(v=>(!fila||(fila==='exterior'?!v.filaId:v.filaId===fila))&&(!cultivo||v.plantacionId===cultivo)):[];
 const finMes=new Date(Date.UTC(Number(mes.slice(0,4)),Number(mes.slice(5)),0)).toISOString().slice(0,10);
 const estimadasMes=ventanas.filter(v=>v.desde&&v.hasta&&v.desde<=finMes&&v.hasta>=`${mes}-01`);
 const estimadasDia=dia?ventanas.filter(v=>v.desde&&v.hasta&&dia>=v.desde&&dia<=v.hasta):[];
 const delMes=filtrados.filter(e=>e.fecha.startsWith(mes));
 const porDia=new Map<string,EventoCultivo[]>();for(const e of filtrados)porDia.set(e.fecha,[...(porDia.get(e.fecha)??[]),e]);
 const notasPorDia=new Map<string,DiarioEntrada[]>();for(const n of notasFiltradas)notasPorDia.set(n.fecha,[...(notasPorDia.get(n.fecha)??[]),n]);
 const tareasPorDia=new Map<string,typeof tareas>();for(const t of tareas)tareasPorDia.set(t.fecha,[...(tareasPorDia.get(t.fecha)??[]),t]);
 function mover(n:number){setMes(cambiarMes(mes,n));setDia(null);}function seleccionar(d:string){setDia(d);if(!d.startsWith(mes))setMes(d.slice(0,7));}
 const diaNotas=notasFiltradas.filter(n=>dia?n.fecha===dia:n.fecha.startsWith(mes));
 const diaTareas=tareas.filter(t=>dia?t.fecha===dia:t.fecha.startsWith(mes));
 return <section className="surface notebook-view" aria-labelledby="calendario-title">
 <div className="surface-header"><div><p className="eyebrow">CULTIVOS · DIARIO · TAREAS</p><h2 id="calendario-title">Calendario del huerto</h2></div><span className="light-pill">{delMes.length+notasFiltradas.filter(n=>n.fecha.startsWith(mes)).length+diaTareas.length} ACTIVIDADES</span></div>
 <div className="notebook-content"><p className="section-intro">Cada nota aparece en su <strong>fecha de diario</strong>, no en la fecha de creación. Las tareas programadas comparten los mismos días que siembras, trasplantes y cosechas. Las ventanas de cosecha son estimaciones separadas de las cosechas realizadas.</p>
 <div className="notebook-filters"><label>Fila<select value={fila} onChange={e=>{setFila(e.target.value);setDia(null);}}><option value="">Todas las filas</option>{[...datos.filas].sort((a,b)=>b.numero-a.numero).map(f=><option key={f.id} value={f.id}>{f.codigo}</option>)}<option value="exterior">Exterior / sin fila</option></select></label>
 <label>Actividad agrícola<select value={tipo} onChange={e=>setTipo(e.target.value)}><option value="">Todas las actividades</option>{Object.entries(TIPOS_EVENTO).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
 <label>Lote<select value={cultivo} onChange={e=>setCultivo(e.target.value)}><option value="">Todos los lotes</option>{datos.plantaciones.map(c=><option key={c.id} value={c.id}>{c.cultivo}{c.variedad?` · ${c.variedad}`:''} · {datos.filas.find(f=>f.id===c.fila_id)?.codigo??'Exterior'}</option>)}</select></label>
 <label className="filter-checkbox"><input type="checkbox" checked={mostrarNotas} onChange={e=>setMostrarNotas(e.target.checked)}/> Notas del diario</label><label className="filter-checkbox"><input type="checkbox" checked={mostrarTareas} onChange={e=>setMostrarTareas(e.target.checked)}/> Tareas programadas</label><label className="filter-checkbox"><input type="checkbox" checked={mostrarCosechas} onChange={e=>setMostrarCosechas(e.target.checked)}/> Cosechas orientativas</label></div>
 {errorNotas&&<p className="feedback-error" role="alert">Diario: {errorNotas}</p>}{gestion.error&&<p className="monitor-caption">Tareas: {gestion.error}</p>}
 {mostrarCosechas&&(!tipo||tipo==='cosecha')&&<section className="harvest-overview" aria-label="Plazos orientativos de cosecha">
 <div className="harvest-overview-head"><h3>Plazos orientativos de cosecha</h3><span>{estimadasMes.length} ventanas en {etiquetaMes(mes)}</span></div>
 <p>Estimaciones calculadas a partir de las fechas de siembra o trasplante registradas. No son cosechas confirmadas ni avisos de madurez; dependen de la variedad, el clima y el desarrollo observado.</p>
 <div className="harvest-rows">{ventanas.map(v=><div className="harvest-row" key={v.plantacionId}>
 <strong>{v.nombre}</strong><span>{v.desde&&v.hasta?`${formatearFecha(v.desde)} - ${formatearFecha(v.hasta)}`:'Sin fecha estimable'}{v.precision==='aproximada'&&v.desde?' (fecha de origen aproximada)':''}</span>
 <small>{v.detalle}</small>
 {v.desde&&<button className="text-button" type="button" onClick={()=>seleccionar(v.desde!)}>Ir al inicio</button>}
 </div>)}</div>
 {ventanas.length===0&&<p>No hay cultivos presentes con estos filtros. Las plantas del semillero solo tendr&aacute;n un plazo despu&eacute;s de registrar su establecimiento en el huerto.</p>}
 </section>}
 <div className="calendar-navigation"><div className="action-row"><button className="secondary-button compact-button" onClick={()=>mover(-1)} aria-label="Mes anterior">←</button><h3 aria-live="polite">{etiquetaMes(mes)}</h3><button className="secondary-button compact-button" onClick={()=>mover(1)} aria-label="Mes siguiente">→</button></div><div className="action-row"><label className="month-picker">Ir al mes<input type="month" value={mes} min="2000-01" max="2100-12" onChange={e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)){setMes(e.target.value);setDia(null);}}}/></label><button className="secondary-button compact-button" onClick={()=>{setMes(datos.hoy.slice(0,7));setDia(datos.hoy);}}>Hoy</button></div></div>
 <div className="calendar-scroll" role="region" tabIndex={0} aria-label="Calendario mensual desplazable"><div className="calendar-grid" aria-label={etiquetaMes(mes)}>{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=><div className="weekday" key={d}>{d}</div>)}
 {dias.map(d=>{const esMes=d.startsWith(mes),esHoy=d===datos.hoy,eventos=porDia.get(d)??[],n=notasPorDia.get(d)??[],t=tareasPorDia.get(d)??[],cosechas=ventanas.filter(v=>v.desde&&v.hasta&&d>=v.desde&&d<=v.hasta);
 return <div key={d} className={`calendar-day ${esMes?'':'other-month'} ${esHoy?'calendar-today':''} ${dia===d?'calendar-selected':''}`}>
 <button className="day-number" aria-label={`${d}: ${eventos.length} actividades, ${n.length} notas, ${t.length} tareas, ${cosechas.length} ventanas de cosecha orientativa`} aria-pressed={dia===d} onClick={()=>seleccionar(d)}>{Number(d.slice(8))}{esHoy&&<small>Hoy</small>}</button>
 {eventos.slice(0,2).map(e=><button key={e.id} className={`calendar-event event-${e.tipo}`} onClick={()=>seleccionar(d)} title={`${TIPOS_EVENTO[e.tipo]}: ${e.cultivo}`}><span>{emojiCultivo(e.cultivo)}</span><span>{e.precision_fecha==='aproximada'?'Aprox. ':''}{e.cultivo}<small>{TIPOS_EVENTO[e.tipo]}</small></span></button>)}
 {n.slice(0,2).map(e=><button key={e.id} className="calendar-event calendar-note" onClick={()=>seleccionar(d)} title={e.texto}><span>✎</span><span>{e.titulo||e.texto.slice(0,36)}<small>Nota del diario</small></span></button>)}
 {t.slice(0,2).map(e=><button key={e.id} className="calendar-event calendar-task" onClick={()=>seleccionar(d)} title={e.descripcion}><span>☑</span><span>{e.titulo}<small>{e.estado==='hecha'?'Realizada':'Tarea programada'}</small></span></button>)}
 {cosechas.length>0&&<button type="button" className="calendar-harvest-estimate" onClick={()=>seleccionar(d)} title={`Cosecha orientativa, sin confirmar: ${cosechas.map(v=>v.nombre).join(", ")}`}>&#127806; {cosechas.length===1?cosechas[0].nombre:`${cosechas.length} cultivos posibles`}<small>Ventana orientativa</small></button>}
 {eventos.length+n.length+t.length>6&&<button className="more-events" onClick={()=>seleccionar(d)}>+{eventos.length+n.length+t.length-6} más</button>}</div>;})}</div></div>
 <div className="agenda-heading"><h3>{dia?`Registros del ${dia.split('-').reverse().join('/')}`:'Agenda del mes'}</h3>{dia&&<button className="text-button" onClick={()=>setDia(null)}>Ver todo el mes</button>}</div>
 <ListaEventos eventos={dia?filtrados.filter(e=>e.fecha===dia):delMes} datos={datos} editar={editar}/>
 {dia&&estimadasDia.length>0&&<div className="harvest-day-agenda"><h4>Posibles cosechas para este d&iacute;a (no registradas)</h4>{estimadasDia.map(v=><p key={v.plantacionId}><strong>{v.nombre}</strong> &middot; ventana {formatearFecha(v.desde)} - {formatearFecha(v.hasta)}. Comprobar madurez antes de recolectar.</p>)}</div>}
 <div className="agenda-extras">{cargandoNotas&&<p className="monitor-caption">Buscando notas fechadas...</p>}{diaNotas.map(n=><article key={n.id} className="agenda-note"><small>✎ DIARIO · {n.fecha} {n.fila_codigo??''}</small><h4>{n.titulo||'Nota del diario'}</h4><p>{n.texto}</p></article>)}{diaTareas.map(t=><article key={t.id} className="agenda-note agenda-task"><small>☑ TAREA · {t.fecha} {t.hora?.slice(0,5)??''}</small><h4>{t.titulo} · {t.estado}</h4>{t.descripcion&&<p>{t.descripcion}</p>}</article>)}</div>
 {!delMes.length&&!diaNotas.length&&!diaTareas.length&&!cargandoNotas&&<p className="form-explanation">No hay actividades confirmadas en esta selección. Las cosechas orientativas se muestran por separado.</p>}
 </div></section>;
}
