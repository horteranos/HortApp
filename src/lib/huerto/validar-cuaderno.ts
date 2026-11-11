import type { Database } from '../../types/database';
import { fechaValida, hoyEnZona, TIPOS_EVENTO } from './cuaderno';
import type { ModoLote, TipoEvento } from '../../types/cuaderno';

type Res<T> = { ok: true; datos: T } | { ok: false; mensaje: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const texto = (f: FormData, k: string) => typeof f.get(k) === 'string' ? String(f.get(k)) : '';
function entero(f: FormData, k: string, minimo=0): number | null {
  const s=texto(f,k); if(!/^-?\d+$/.test(s)) return null;
  const n=Number(s); return Number.isSafeInteger(n) && n>=minimo && n<=2147483647 ? n : null;
}
function ids(f: FormData,k: string): string[] | null {
  const vs=f.getAll(k);
  if(vs.length>1000 || vs.some(v=>typeof v!=='string' || !uuid.test(v))) return null;
  const ss=(vs as string[]).map(v=>v.toLowerCase());
  return new Set(ss).size===ss.length ? ss : null;
}
const mal = (mensaje: string): {ok:false;mensaje:string} => ({ok:false,mensaje});
export function validarLote(f: FormData): Res<Database['public']['Functions']['editar_puntos_lote']['Args']> {
  const h=texto(f,'huerto_id'), fila=texto(f,'fila_id'), v=entero(f,'version_plano');
  const puntos=ids(f,'punto_ids'), cultivos=ids(f,'plantacion_ids'), modo=texto(f,'modo');
  if(!uuid.test(h)||!uuid.test(fila)||v===null||!puntos?.length||cultivos===null || texto(f,'seleccion_completa')!=='si')
    return mal('La selección no es válida. Cierra el formulario y actualiza el plano.');
  if(!['agregar','retirar','reemplazar','eliminar_puntos'].includes(modo)) return mal('Operación no válida.');
  if(['reemplazar','eliminar_puntos'].includes(modo) && texto(f,'confirmar')!=='si')
    return mal('Confirma expresamente la sustitución o eliminación.');
  const cultivo=texto(f,'cultivo_nuevo').trim() || null, variedad=texto(f,'variedad_nueva').trim() || null;
  if([cultivo,variedad].some(s=>s && (s.length>100 || /[\u0000-\u001f\u007f]/.test(s)))) return mal('Cultivo y variedad admiten 100 caracteres y una sola línea.');
  if(variedad&&!cultivo) return mal('Introduce el cultivo al indicar una variedad nueva.');
  if(['retirar','eliminar_puntos'].includes(modo)&&cultivo) return mal('No se puede crear un lote al retirar cultivos o eliminar puntos.');
  if(['agregar','retirar'].includes(modo)&&cultivos.length===0&&!cultivo) return mal('Selecciona un cultivo existente o introduce uno nuevo.');
  return {ok:true,datos:{p_huerto_id:h,p_fila_id:fila,p_version:v,p_puntos:puntos,p_modo:modo as ModoLote,
    p_plantaciones:cultivos,p_cultivo:cultivo,p_variedad:variedad}};
}
export function validarEvento(f: FormData, hoy=hoyEnZona()): Res<Database['public']['Functions']['guardar_evento_cultivo']['Args']> {
  const h=texto(f,'huerto_id'), lote=texto(f,'plantacion_id'), id=texto(f,'evento_id'), revision=entero(f,'revision',-1);
  if(!uuid.test(h)||!uuid.test(lote)||!uuid.test(id)||revision===null) return mal('El registro no es válido. Cierra el formulario y actualiza.');
  const tipo=texto(f,'tipo'), fecha=texto(f,'fecha'), precision=texto(f,'precision_fecha'), notas=texto(f,'notas').trim();
  if(!Object.hasOwn(TIPOS_EVENTO,tipo)) return mal('Selecciona un tipo de actividad válido.');
  if(!fechaValida(fecha)||fecha<'1900-01-01'||fecha>hoy) return mal('Selecciona una fecha válida, no futura. Este calendario registra actividades realizadas.');
  if(!['exacta','aproximada'].includes(precision)) return mal('Indica si la fecha es exacta o aproximada.');
  if(notas.length>4000 || notas.includes('\u0000')) return mal('Las notas admiten hasta 4000 caracteres, sin caracteres nulos.');
  const puntos=ids(f,'punto_ids'); if(puntos===null) return mal('La selección de puntos no es válida.');
  const version=entero(f,'version_plano');
  if(revision===-1 && puntos.length>0 && version===null) return mal('Actualiza el plano antes de registrar una fecha para esos goteros.');
  return {ok:true,datos:{p_huerto_id:h,p_plantacion_id:lote,p_evento_id:id,p_revision:revision,
    p_tipo:tipo as TipoEvento,p_fecha:fecha,p_precision:precision as 'exacta'|'aproximada',p_notas:notas||null,
    p_puntos:puntos,p_version_fila:version}};
}
export function validarAnulacion(f: FormData): Res<Database['public']['Functions']['anular_evento_cultivo']['Args']> {
  const h=texto(f,'huerto_id'), id=texto(f,'evento_id'), revision=entero(f,'revision'), motivo=texto(f,'motivo').trim();
  if(!uuid.test(h)||!uuid.test(id)||revision===null) return mal('Registro no válido. Actualiza antes de anularlo.');
  if(!motivo||motivo.length>500||motivo.includes('\u0000')) return mal('Indica un motivo de 1 a 500 caracteres.');
  if(texto(f,'confirmar')!=='si') return mal('Confirma que quieres anular este registro.');
  return {ok:true,datos:{p_huerto_id:h,p_evento_id:id,p_revision:revision,p_motivo:motivo}};
}
