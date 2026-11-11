'use client';
import {useCallback,useEffect,useState} from 'react';
import {leerGestion} from '@/app/aplicacion/gestion-actions';
import type {GestionDatos} from '@/types/gestion';
export function useGestion(huerto:string){
 const [datos,setDatos]=useState<GestionDatos|null>(null),[error,setError]=useState(''),[cargando,setCargando]=useState(false);
 const cargar=useCallback(async()=>{setCargando(true);try{const r=await leerGestion(huerto);if(r.ok){setDatos(r.datos);setError('');}else setError(r.error);}catch{setError('No se pudo actualizar tareas, semillero y recuentos.');}finally{setCargando(false);}},[huerto]);
 useEffect(()=>{let activo=true;void Promise.resolve().then(()=>{if(activo)return cargar();});return ()=>{activo=false;};},[cargar]);return {datos,error,cargando,cargar};
}
export type GestionControl=ReturnType<typeof useGestion>;
