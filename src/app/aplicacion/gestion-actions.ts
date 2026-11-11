'use server';
import {createClient} from '@/lib/supabase/server';
import type {GestionDatos,GestionResultado,Tarea,Plantel,Recuento} from '@/types/gestion';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fechaOk=(v:unknown)=>typeof v==='string' && /^20\d\d-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(v) && !Number.isNaN(Date.parse(`${v}T12:00:00Z`)) && new Date(`${v}T12:00:00Z`).toISOString().slice(0,10)===v;
const optionalUuid=(v:unknown)=>v===null||v===''||(typeof v==='string'&&uuid.test(v));
function texto(v:unknown,max:number){return typeof v==='string'?v.trim().slice(0,max+1):'';}
function errorSeguro(e:unknown){const x=e as {code?:string};if(['42P01','42703','PGRST202','PGRST205'].includes(x?.code||''))return 'Falta la migración 10_ampliacion_0_6_0.sql. Ejecuta SQL 10 y 11.';if(x?.code==='23505')return 'El registro ya existe. Actualiza los datos antes de intentarlo de nuevo.';if(x?.code==='42501')return 'Tu sesión no permite editar este contenido.';return 'No se ha confirmado el guardado. Vuelve a cargar los datos antes de repetir.';}
async function autorizado(huerto:string,escritura=false){
 if(!uuid.test(huerto))throw {code:'22023'};
 const c=await createClient();const {data:{user},error}=await c.auth.getUser();if(error||!user)throw {code:'42501'};
 const {data:m,error:e}=await c.from('miembros_huerto').select('rol').eq('usuario_id',user.id).eq('huerto_id',huerto).maybeSingle();
 if(e||!m||(escritura&&m.rol==='lector'))throw {code:'42501'};
 return {c,user};
}
export async function leerGestion(huerto:string):Promise<GestionResultado<GestionDatos>>{
 try{const {c}=await autorizado(huerto);
  const [a,b,d]=await Promise.all([
   c.from('sm_tareas').select('*').eq('huerto_id',huerto).order('fecha').order('id').limit(2000),
   c.from('sm_semillero').select('*').eq('huerto_id',huerto).order('plaza'),
   c.from('sm_recuentos').select('*').eq('huerto_id',huerto).order('plantacion_id')]);
  if(a.error||b.error||d.error)throw a.error||b.error||d.error;
  return {ok:true,datos:{tareas:a.data??[],semillero:b.data??[],recuentos:d.data??[]}};
 }catch(e){return {ok:false,error:errorSeguro(e)};}
}
export type TareaEdicion={id?:string;revision?:number;titulo:string;descripcion:string;fecha:string;hora:string;prioridad:Tarea['prioridad'];estado:Tarea['estado'];fila_id:string;plantacion_id:string};
export async function guardarTarea(huerto:string,valor:TareaEdicion):Promise<GestionResultado<Tarea>>{
 const titulo=texto(valor.titulo,160),descripcion=texto(valor.descripcion,2000);
 if(titulo.length<2||titulo.length>160||descripcion.length>2000||!fechaOk(valor.fecha)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(valor.hora)&&valor.hora!==''||!['baja','normal','alta'].includes(valor.prioridad)||!['pendiente','hecha','cancelada'].includes(valor.estado)||!optionalUuid(valor.fila_id)||!optionalUuid(valor.plantacion_id)||valor.id&&!uuid.test(valor.id))return {ok:false,error:'Revisa título, fecha, hora, prioridad y ubicaciones.'};
 try{const {c,user}=await autorizado(huerto,true);
  const cambio={titulo,descripcion,fecha:valor.fecha,hora:valor.hora||null,prioridad:valor.prioridad,estado:valor.estado,fila_id:valor.fila_id||null,plantacion_id:valor.plantacion_id||null,actualizada_en:new Date().toISOString()};
  let r;
  if(valor.id){if(!Number.isInteger(valor.revision)||Number(valor.revision)<0)return {ok:false,error:'Falta la versión de la tarea.'};
   r=await c.from('sm_tareas').update({...cambio,revision:valor.revision!+1}).eq('id',valor.id).eq('huerto_id',huerto).eq('revision',valor.revision!).select('*').maybeSingle();
  }else r=await c.from('sm_tareas').insert({...cambio,huerto_id:huerto,creada_por:user.id}).select('*').single();
  if(r.error)throw r.error;if(!r.data)return {ok:false,error:'La tarea ha cambiado en otra sesión. Actualiza para evitar sobrescribirla.'};return {ok:true,datos:r.data};
 }catch(e){return {ok:false,error:errorSeguro(e)};}
}
export async function guardarPlantel(huerto:string,valor:Pick<Plantel,'plaza'|'cultivo'|'variedad'|'fecha_siembra'|'fecha_prevista'|'estado'|'observaciones'> & {revision:number}):Promise<GestionResultado<Plantel>>{
 const cultivo=texto(valor.cultivo,100),variedad=texto(valor.variedad,100),observaciones=texto(valor.observaciones,1500);
 if(!Number.isInteger(valor.plaza)||valor.plaza<1||valor.plaza>20||!cultivo||cultivo.length>100||variedad.length>100||observaciones.length>1500||!['sembrado','germinando','listo','trasplantado','descartado'].includes(valor.estado)||valor.fecha_siembra&&!fechaOk(valor.fecha_siembra)||valor.fecha_prevista&&!fechaOk(valor.fecha_prevista)||valor.fecha_siembra&&valor.fecha_prevista&&valor.fecha_prevista<valor.fecha_siembra)return {ok:false,error:'Revisa datos del plantel, fechas y estado.'};
 try{const {c}=await autorizado(huerto,true);
  const cambio={cultivo,variedad,fecha_siembra:valor.fecha_siembra||null,fecha_prevista:valor.fecha_prevista||null,estado:valor.estado,observaciones,actualizado_en:new Date().toISOString()};
  let r;
  if(valor.revision<0)r=await c.from('sm_semillero').insert({...cambio,huerto_id:huerto,plaza:valor.plaza}).select('*').single();
  else r=await c.from('sm_semillero').update({...cambio,revision:valor.revision+1}).eq('huerto_id',huerto).eq('plaza',valor.plaza).eq('revision',valor.revision).select('*').maybeSingle();
  if(r.error)throw r.error;if(!r.data)return {ok:false,error:'Este plantel cambió desde otra sesión. Actualiza antes de repetir.'};return {ok:true,datos:r.data};
 }catch(e){return {ok:false,error:errorSeguro(e)};}
}
export async function liberarPlaza(huerto:string,plaza:number,revision:number):Promise<GestionResultado<{plaza:number}>>{
 if(!Number.isInteger(plaza)||plaza<1||plaza>20||!Number.isInteger(revision)||revision<0)return {ok:false,error:'Plaza no válida.'};
 try{const {c}=await autorizado(huerto,true);const r=await c.from('sm_semillero').delete().eq('huerto_id',huerto).eq('plaza',plaza).eq('revision',revision).select('plaza').maybeSingle();
  if(r.error)throw r.error;if(!r.data)return {ok:false,error:'Esta plaza ha cambiado. Actualiza antes de vaciarla.'};return {ok:true,datos:r.data};
 }catch(e){return {ok:false,error:errorSeguro(e)};}
}
export async function guardarRecuento(huerto:string,valor:{plantacion_id:string;plantas_actuales:number;fecha:string;observaciones:string;revision:number}):Promise<GestionResultado<Recuento>>{
 const observaciones=texto(valor.observaciones,1000);
 if(!uuid.test(valor.plantacion_id)||!Number.isInteger(valor.plantas_actuales)||valor.plantas_actuales<0||valor.plantas_actuales>100000||!fechaOk(valor.fecha)||observaciones.length>1000)return {ok:false,error:'El número de plantas debe ser un entero entre 0 y 100000. Fecha obligatoria.'};
 try{const {c}=await autorizado(huerto,true);const {data:lote,error:loteError}=await c.from('plantaciones').select('id').eq('id',valor.plantacion_id).eq('huerto_id',huerto).maybeSingle();if(loteError||!lote)return {ok:false,error:'No se ha encontrado el cultivo en el huerto.'};
  const cambio={plantas_actuales:valor.plantas_actuales,fecha:valor.fecha,observaciones,actualizado_en:new Date().toISOString()};let r;
  if(valor.revision<0)r=await c.from('sm_recuentos').insert({...cambio,huerto_id:huerto,plantacion_id:valor.plantacion_id}).select('*').single();
  else r=await c.from('sm_recuentos').update({...cambio,revision:valor.revision+1}).eq('huerto_id',huerto).eq('plantacion_id',valor.plantacion_id).eq('revision',valor.revision).select('*').maybeSingle();
  if(r.error)throw r.error;if(!r.data)return {ok:false,error:'Este recuento ha cambiado. Actualiza para evitar sobrescribirlo.'};return {ok:true,datos:r.data};
 }catch(e){return {ok:false,error:errorSeguro(e)};}
}
