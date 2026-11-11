'use client';
import {useState} from 'react';
import Image from 'next/image';
import {listarMedios,subirMedios} from '@/lib/gestion/medios';
import type {DiarioMedio} from '@/types/gestion';
export function Adjuntos({huerto,entrada,puedeEditar}:{huerto:string;entrada:string;puedeEditar:boolean}){
 const [abierto,setAbierto]=useState(false),[lista,setLista]=useState<{medio:DiarioMedio;url:string}[]>([]),[mensaje,setMensaje]=useState(''),[ocupado,setOcupado]=useState(false),[archivos,setArchivos]=useState<File[]>([]),[clave,setClave]=useState(0);
 async function consultar(){setOcupado(true);try{setLista(await listarMedios(huerto,entrada));setMensaje('');}catch(e){setMensaje(e instanceof Error?e.message:'No se pudo consultar los medios.');}finally{setOcupado(false);}}
 async function subir(){setOcupado(true);try{const n=await subirMedios(huerto,entrada,archivos);setMensaje(`${n} archivo(s) asociados a esta nota.`);setArchivos([]);setClave(x=>x+1);await consultar();}catch(e){setMensaje(e instanceof Error?e.message:'No se pudo completar la subida. Comprueba qué archivos se guardaron.');}finally{setOcupado(false);}}
 return <div className="adjuntos"><button type="button" className="text-button" onClick={()=>{setAbierto(!abierto);if(!abierto)void consultar();}}>{abierto?'Ocultar adjuntos':'📷 Ver / añadir fotos y vídeos'}</button>
 {abierto&&<div className="adjuntos-panel">{ocupado&&<small>Cargando archivos...</small>}{lista.length===0&&!ocupado&&<small>No hay adjuntos guardados en esta nota.</small>}
 <div className="adjuntos-grid">{lista.map(({medio,url})=><figure key={medio.id}>{medio.mime.startsWith('image/')?<a target="_blank" rel="noopener noreferrer" href={url}><Image src={url} alt={medio.nombre} loading="lazy" width={320} height={240} unoptimized/></a>:<video controls preload="metadata" src={url}/>}<figcaption>{medio.nombre}</figcaption></figure>)}</div>
 {puedeEditar&&<div className="adjuntos-subir"><label>Adjuntar imágenes o vídeos<input key={clave} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" multiple onChange={e=>setArchivos(Array.from(e.target.files??[]))}/></label><button type="button" className="secondary-button compact-button" disabled={ocupado||!archivos.length} onClick={()=>void subir()}>Guardar archivos</button></div>}
 {mensaje&&<p className="monitor-caption" role="status">{mensaje}</p>}</div>}</div>;
}
