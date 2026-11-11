'use server';
import {randomBytes} from 'node:crypto';
import {createClient} from '@/lib/supabase/server';
import {getSupabaseConfig} from '@/lib/supabase/config';
import {sincronizarMeteo} from '@/lib/monitor/sync.mjs';
import type {Json} from '@/types/database';
import type {ResultadoMonitor} from '@/types/monitor';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function errorPublico(e:unknown){
 const x=e as {code?:string;message?:string};
 if(['PGRST202','42P01','42883'].includes(x?.code??''))return 'Ejecuta 08_meteorologia_diario.sql y 09_comprobar_monitor.sql en Supabase.';
 if(x?.code==='42501')return 'Tu cuenta no tiene permiso para esta operacion. Revisa la sesion.';
 if(['40001','22023'].includes(x?.code??''))return x.message??'Revisa los datos e intentalo de nuevo.';
 if(x?.code==='23505')return 'Este registro ya existe. Actualiza antes de repetir para no duplicarlo.';
 return 'No se pudo confirmar la operacion. Se conserva lo guardado. Revisa la conexion y vuelve a consultar.';
}
async function clienteAutorizado(huerto:string){
 if(!UUID.test(huerto))throw new Error('Identificador no valido');
 const c=await createClient();const {data:{user},error}=await c.auth.getUser();
 if(error||!user)throw {code:'42501'};
 const {data:m,error:e}=await c.from('miembros_huerto').select('rol').eq('huerto_id',huerto).eq('usuario_id',user.id).maybeSingle();
 if(e||!m)throw {code:'42501'};return {c,rol:m.rol};
}
const ACCIONES=['leer','diario_listar','diario_exportar','diario_guardar','diario_anular','config_guardar','dispositivo_revocar'];
export async function operacionMonitor<T=unknown>(huerto:string,accion:string,datos:Record<string,unknown>={}):Promise<ResultadoMonitor<T>>{
 try{
  if(!ACCIONES.includes(accion)||JSON.stringify(datos).length>100000)throw {code:'22023',message:'Solicitud no valida.'};
  const {c}=await clienteAutorizado(huerto);
  const r=await c.rpc('monitor_operacion',{p_huerto_id:huerto,p_accion:accion,p_datos:datos as Json});
  if(r.error)throw r.error;
  return {ok:true,datos:r.data as T};
 }catch(e){return {ok:false,error:errorPublico(e)};}
}
export async function sincronizarMonitor(huerto:string,forzar=false):Promise<ResultadoMonitor<{mensaje:string}>>{
 try{
  const {c,rol}=await clienteAutorizado(huerto);if(rol==='lector')throw {code:'42501'};
  const rpc=async(accion:string,datos:Record<string,unknown>)=>{
   const r=await c.rpc('monitor_operacion',{p_huerto_id:huerto,p_accion:accion,p_datos:{...datos,...(accion==='sync_inicio'?{forzar}: {})} as Json});
   if(r.error)throw r.error;return r.data;
  };
  const r=await sincronizarMeteo(rpc);
  return {ok:true,datos:{mensaje:r.mensaje}};
 }catch(e){return {ok:false,error:errorPublico(e)};}
}
export async function crearAccesoMac(huerto:string):Promise<ResultadoMonitor<Record<string,string>>>{
 try{
  const {c,rol}=await clienteAutorizado(huerto);if(rol!=='administrador')throw {code:'42501'};
  const token=randomBytes(32).toString('hex'),config=getSupabaseConfig();if(!config)throw new Error('Config');
  const r=await c.rpc('monitor_operacion',{p_huerto_id:huerto,p_accion:'dispositivo_crear',p_datos:{nombre:'Mac - meteorologia',token}});
  if(r.error)throw r.error;
  const id=(r.data as {id:string}).id;
  return {ok:true,datos:{version:'1',supabase_url:config.url,publishable_key:config.key,huerto_id:huerto,dispositivo_id:id,token}};
 }catch(e){return {ok:false,error:errorPublico(e)};}
}
