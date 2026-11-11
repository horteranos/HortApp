'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { validarLote, validarEvento, validarAnulacion } from '@/lib/huerto/validar-cuaderno';
import type { EstadoCuaderno } from '@/types/cuaderno';

function errorBD(error: {code: string; message: string}): EstadoCuaderno {
  if(['PGRST202','42P01','42703','42883'].includes(error.code)) return {estado:'error',mensaje:'Falta la migración 06_cuaderno_calendario.sql. Ejecútala y actualiza la aplicación.'};
  if(['40001','23505','23503'].includes(error.code)) return {estado:'conflicto',mensaje:'Los datos han cambiado desde que abriste este formulario. Cierra, pulsa Actualizar y revisa el resultado antes de repetir.'};
  if(error.code==='42501') return {estado:'error',mensaje:'Tu cuenta no tiene permiso para realizar esta operación.'};
  if(error.code==='22023') return {estado:'error',mensaje:error.message};
  return {estado:'error',mensaje:'No se ha podido confirmar el guardado. Actualiza y comprueba el resultado antes de repetir.'};
}
async function autorizado(huerto: string, soloAdmin=false) {
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user) return null;
  const {data:miembro,error:e}=await supabase.from('miembros_huerto').select('rol').eq('huerto_id',huerto).eq('usuario_id',user.id).maybeSingle();
  if(e||!miembro||!['administrador',...(soloAdmin?[]:['editor'])].includes(miembro.rol)) return null;
  return supabase;
}
export async function ejecutarLote(_previo: EstadoCuaderno,f: FormData): Promise<EstadoCuaderno> {
  void _previo;
  const v=validarLote(f); if(!v.ok) return {estado:'error',mensaje:v.mensaje};
  try {
    const cliente=await autorizado(v.datos.p_huerto_id,v.datos.p_modo==='eliminar_puntos');
    if(!cliente) return {estado:'error',mensaje:'Revisa tu sesión y tus permisos antes de editar el plano.'};
    const {data,error}=await cliente.rpc('editar_puntos_lote',v.datos);
    if(error) return errorBD(error);
    if(!data||!Number.isInteger(data.version_plano)||data.version_plano<=v.datos.p_version)
      return {estado:'error',mensaje:'Respuesta no confirmada. Actualiza el plano antes de reintentar.'};
    revalidatePath('/aplicacion');
    return {estado:'guardado',mensaje:v.datos.p_modo==='eliminar_puntos'
      ? 'Goteros eliminados. Se conservan los cultivos, las fechas y el historial.'
      : `Cambio guardado en ${data.puntos} goteros.`,version:data.version_plano,...(data.plantacion_id?{id:data.plantacion_id}:{})};
  } catch {return {estado:'error',mensaje:'No se ha podido confirmar el cambio. Actualiza antes de repetir para evitar duplicados.'};}
}
export async function ejecutarEvento(_previo: EstadoCuaderno,f: FormData): Promise<EstadoCuaderno> {
  void _previo;
  const anular=f.get('operacion')==='anular';
  const v=anular?validarAnulacion(f):validarEvento(f);
  if(!v.ok) return {estado:'error',mensaje:v.mensaje};
  try {
    const cliente=await autorizado(v.datos.p_huerto_id);
    if(!cliente) return {estado:'error',mensaje:'Revisa tu sesión y tus permisos antes de registrar fechas.'};
    // Separate validation narrows the RPC contract without unsafe casts.
    const resultado = await (async()=>{
      if(anular){const a=validarAnulacion(f); if(!a.ok) throw new Error(a.mensaje); return cliente.rpc('anular_evento_cultivo',a.datos);}
      const a=validarEvento(f); if(!a.ok) throw new Error(a.mensaje); return cliente.rpc('guardar_evento_cultivo',a.datos);
    })();
    if(resultado.error) return errorBD(resultado.error);
    if(!resultado.data?.id) return {estado:'error',mensaje:'Respuesta no confirmada. Revisa el calendario antes de repetir.'};
    revalidatePath('/aplicacion');
    return {estado:'guardado',mensaje:anular?'Registro anulado; permanece en el historial.':'Fecha guardada en el calendario y en el historial.',id:resultado.data.id};
  } catch {return {estado:'error',mensaje:'No se ha podido confirmar el guardado. Revisa el calendario antes de repetir la operación.'};}
}
