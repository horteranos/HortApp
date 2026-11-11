'use client';
import {useState} from 'react';
import {operacionMonitor} from '@/app/aplicacion/monitor-actions';
import type {PaginaDiario} from '@/types/monitor';
export function DiarioVinculado({huerto,fila,punto}:{huerto:string;fila:string;punto?:string}){
 const [datos,setDatos]=useState<PaginaDiario|null>(null),[mensaje,setMensaje]=useState(''),[ocupado,setOcupado]=useState(false),[pagina,setPagina]=useState(0);
 async function cargar(p=0){setOcupado(true);try{const r=await operacionMonitor<PaginaDiario>(huerto,'diario_listar',{fila,punto,pagina:p});if(r.ok){setDatos(r.datos);setPagina(p);}else setMensaje(r.error);}catch{setMensaje('No se pudieron consultar las notas.');}finally{setOcupado(false);}}
 return <section className="monitor-linked"><button className="text-button" disabled={ocupado} onClick={()=>void cargar(0)}>{ocupado?'Consultando...':punto?'Ver notas del diario de este gotero':'Ver notas del diario de esta fila'}</button>{mensaje&&<p>{mensaje}</p>}{datos&&<><p className="monitor-caption">{datos.total} notas vinculadas. Son los mismos registros del Diario, sin copias.</p>{datos.entradas.map(e=><article key={e.id}><strong>{e.fecha} &middot; {e.titulo||e.tipo}</strong><p className="monitor-note-text">{e.texto}</p></article>)}{datos.total>100&&<div className="action-row"><button disabled={ocupado||pagina===0} onClick={()=>void cargar(pagina-1)}>Anterior</button><button disabled={ocupado||(pagina+1)*100>=datos.total} onClick={()=>void cargar(pagina+1)}>Siguiente</button></div>}</>}</section>;
}
