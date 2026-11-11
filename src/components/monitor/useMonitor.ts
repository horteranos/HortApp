'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {operacionMonitor,sincronizarMonitor} from '@/app/aplicacion/monitor-actions';
import type {MonitorDatos} from '@/types/monitor';
export function useMonitor(huerto:string,rol:string){
 const [datos,setDatos]=useState<MonitorDatos|null>(null),[error,setError]=useState(''),[mensaje,setMensaje]=useState(''),[ocupado,setOcupado]=useState(false),[ahora,setAhora]=useState(0);
 const ocupadoRef=useRef(false),mounted=useRef(false);
 const cargar=useCallback(async()=>{
  const r=await operacionMonitor<MonitorDatos>(huerto,'leer');
  if(mounted.current){if(r.ok){setDatos(r.datos);setError('');setAhora(Date.now()/1000);}else setError(r.error);}
  return r;
 },[huerto]);
 const sincronizar=useCallback(async(forzar=false)=>{
  if(ocupadoRef.current||rol==='lector')return;
  ocupadoRef.current=true;if(mounted.current)setOcupado(true);
  try{const r=await sincronizarMonitor(huerto,forzar);if(mounted.current){setMensaje(r.ok?r.datos.mensaje:r.error);if(!r.ok)setError(r.error);}await cargar();}
  catch{if(mounted.current)setError('No se ha podido conectar. Los datos guardados permanecen.');}
  finally{ocupadoRef.current=false;if(mounted.current)setOcupado(false);}
 },[huerto,rol,cargar]);
 useEffect(()=>{
  mounted.current=true;
  const iniciar=async()=>{try{const r=await cargar();if(mounted.current&&r.ok&&r.datos.config.confirmada)await sincronizar(false);}catch{if(mounted.current)setError('No se pudo cargar Meteorologia. Revisa la conexion y la migracion 08.');}};
  void iniciar();
  const refresco=setInterval(()=>{if(document.visibilityState==='visible')void iniciar();},60*60*1000);
  const reloj=setInterval(()=>setAhora(Date.now()/1000),60000);
  const visible=()=>{if(document.visibilityState==='visible')void iniciar();};
  document.addEventListener('visibilitychange',visible);
  return ()=>{mounted.current=false;clearInterval(refresco);clearInterval(reloj);document.removeEventListener('visibilitychange',visible);};
 },[cargar,sincronizar]);
 return {datos,error,mensaje,ocupado,ahora,cargar,sincronizar};
}
export type MonitorControl=ReturnType<typeof useMonitor>;
