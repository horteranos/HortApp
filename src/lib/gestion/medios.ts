import {navegadorSupabase} from '@/lib/supabase/browser';
import {generarUUID} from '@/lib/seguridad/uuid.mjs';
import type {DiarioMedio} from '@/types/gestion';
const mimes:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'};
export async function subirMedios(huerto:string,entrada:string,archivos:File[]):Promise<number>{
 if(archivos.length>5)throw new Error('Máximo 5 archivos por operación.');
 const c=navegadorSupabase();let guardados=0;
 for(const f of archivos){const ext=mimes[f.type];if(!ext||f.size===0||f.size>50*1024*1024)throw new Error(`Formato o tamaño no permitido: ${f.name}. Máximo 50 MB por archivo.`);
  const ruta=`${huerto}/${entrada}/${generarUUID()}.${ext}`;
  const s=await c.storage.from('sm-diario').upload(ruta,f,{contentType:f.type,cacheControl:'3600',upsert:false});
  if(s.error)throw new Error(`No se pudo subir ${f.name}: ${s.error.message}`);
  const m=await c.from('sm_diario_medios').insert({huerto_id:huerto,entrada_id:entrada,ruta,nombre:f.name.slice(0,180),mime:f.type,tamano:f.size}).select('id').single();
  if(m.error){await c.storage.from('sm-diario').remove([ruta]);throw new Error(`Se subió ${f.name}, pero no se pudo asociar al diario. Comprueba permisos y migración 10.`);}
  guardados++;
 }return guardados;
}
export async function listarMedios(huerto:string,entrada:string):Promise<{medio:DiarioMedio;url:string}[]>{
 const c=navegadorSupabase();const r=await c.from('sm_diario_medios').select('*').eq('huerto_id',huerto).eq('entrada_id',entrada).order('creado_en');
 if(r.error)throw new Error('No se pudieron consultar las imágenes y vídeos adjuntos.');
 const lista=await Promise.all((r.data??[]).map(async medio=>{const s=await c.storage.from('sm-diario').createSignedUrl(medio.ruta,15*60);return s.data?.signedUrl?{medio,url:s.data.signedUrl}:null;}));
 return lista.filter((x):x is {medio:DiarioMedio;url:string}=>x!==null);
}
