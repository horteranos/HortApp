#!/usr/bin/env node
// Installed alongside sync.mjs and meteo-core.mjs in Application Support.
import {readFile,writeFile,open,unlink,stat,rename} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {homedir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {sincronizarMeteo} from './sync.mjs';
import {generarAvisos,estadoPrevision} from './meteo-core.mjs';
async function main(){
 if(process.platform!=='darwin')throw new Error('El recuperador requiere macOS.');
 const ruta=process.argv[2];if(!ruta)throw new Error('Falta la configuracion. Reinstala desde el paquete.');
 const base=dirname(ruta),lock=join(base,'ejecucion.lock');
 try{const info=await stat(lock);if(Date.now()-info.mtimeMs<15*60*1000){console.log('Ya hay un recuperador en marcha.');return;}await unlink(lock);}catch(e){if(e.code!=='ENOENT')throw e;}
 let fd;try{fd=await open(lock,'wx',0o600);}catch(e){if(e.code==='EEXIST')return;throw e;}
 try{
  const logs=join(homedir(),'Library','Logs','SistemaMonitorizacion');
  for(const f of ['meteo.log','meteo-error.log']){const p=join(logs,f);try{if((await stat(p)).size>1000000){await rename(p,p+'.anterior');await writeFile(p,'',{mode:0o600});}}catch{/* Logs should not prevent data recovery. */}}
  const c=JSON.parse(await readFile(ruta,'utf8'));
  if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(c.supabase_url))throw new Error('URL de proyecto no valida.');
  let token;try{token=execFileSync('/usr/bin/security',['find-generic-password','-a',c.dispositivo_id,'-s',c.servicio_llavero,'-w'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}catch{throw new Error('Llavero no disponible. Desbloquea tu sesion; se reintentara en el siguiente ciclo.');}
  const rpc=async(accion,datos)=>{
   const r=await fetch(c.supabase_url+'/rest/v1/rpc/monitor_operacion',{method:'POST',headers:{'Content-Type':'application/json',apikey:c.publishable_key},body:JSON.stringify({p_huerto_id:c.huerto_id,p_accion:accion,p_datos:datos,p_token:token}),signal:AbortSignal.timeout(25000)});
   if(!r.ok){let code='';try{code=(await r.json()).code||'';}catch{/* No body */}throw new Error(code==='42501'?'Autorizacion revocada o sin acceso. Configura de nuevo este Mac.':`Supabase no confirma la operacion (HTTP ${r.status}). Se reintentara.`);}
   return r.json();
  };
  console.log(new Date().toISOString(),'Inicio de sincronizacion meteorologica.');
  const result=await sincronizarMeteo(rpc);console.log(result.mensaje);
  const estado=await rpc('estado_dispositivo',{});
  if(estadoPrevision(estado.prevision)!=='vigente')return;
  const now=Date.now()/1000;
  const avisos=generarAvisos(estado.prevision.horas,estado.config.umbrales,estado.config.zona_horaria,now);
  const statePath=join(base,'avisos-vistos.json');
  const seen=await readFile(statePath,'utf8').then(JSON.parse).catch(()=>({}));
  const claves=avisos.map(a=>`${a.dia}:${a.tipo}:${a.nivel}`),nuevos=avisos.filter((a,i)=>!seen[claves[i]]);
  for(const [k,v] of Object.entries(seen))if(typeof v!=='number'||now-v>4*86400)delete seen[k];
  if(nuevos.length){
   const titulos=[...new Set(nuevos.map(a=>a.titulo))].slice(0,4).join(', ');
   const mensaje=`Proximas 72 h: ${titulos}. Abre Meteorologia para ver horas y detalles. Avisos orientativos.`;
   // Arguments, never interpolated AppleScript, so names/data cannot execute code.
   const script='on run argv\ndisplay notification (item 1 of argv) with title "Sistema Monitorizacion" subtitle "Avisos meteorologicos"\nend run';
   try{execFileSync('/usr/bin/osascript',['-e',script,mensaje],{stdio:'pipe',timeout:15000});for(const k of claves)seen[k]=now;await writeFile(statePath,JSON.stringify(seen),{mode:0o600});}
   catch{console.log('No se pudo mostrar la notificacion de macOS. Consulta los avisos en la aplicacion y revisa los permisos de notificaciones.');}
  }
 }finally{await fd.close();await unlink(lock).catch(()=>{});}
}
main().catch(e=>{console.error(new Date().toISOString(),e.message||'Sincronizacion no completada. Se conserva lo guardado y se reintentara.');process.exitCode=1;});
