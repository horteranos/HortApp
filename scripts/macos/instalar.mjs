#!/usr/bin/env node
import {readFile,writeFile,mkdir,copyFile,chmod,unlink} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createInterface} from 'node:readline/promises';
const label='org.sistema-monitorizacion.meteo',service='SistemaMonitorizacion.Meteo';
const xml=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
async function main(){
 if(process.platform!=='darwin')throw new Error('Este instalador solo se ejecuta en macOS. No se ha instalado nada.');
 const src=resolve(process.argv[2]||join(homedir(),'Downloads','Sistema_Monitorizacion_Mac.json'));
 let c;try{c=JSON.parse(await readFile(src,'utf8'));}catch{throw new Error('No se encuentra el archivo de autorizacion. Descargalo desde Meteorologia e indica su ruta al comando.');}
 if(c.version!=='1'||!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(c.supabase_url)||!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(c.publishable_key)||!(/^[a-f0-9]{64}$/).test(c.token)||!(/^[a-f0-9-]{36}$/i).test(c.huerto_id)||!(/^[a-f0-9-]{36}$/i).test(c.dispositivo_id))throw new Error('El archivo de autorizacion no tiene el formato esperado. No uses claves secretas ni service_role.');
 const home=homedir(),base=join(home,'Library','Application Support','SistemaMonitorizacion'),logs=join(home,'Library','Logs','SistemaMonitorizacion'),agents=join(home,'Library','LaunchAgents');
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
 await mkdir(base,{recursive:true,mode:0o700});await chmod(base,0o700);await mkdir(logs,{recursive:true,mode:0o700});await chmod(logs,0o700);await mkdir(agents,{recursive:true});
 const serviceTarget=`gui/${process.getuid()}/${label}`;const plist=join(agents,label+'.plist');
 try{execFileSync('/bin/launchctl',['bootout',serviceTarget],{stdio:'pipe'});}catch{/* First install. */}
 const old=await readFile(join(base,'config.json'),'utf8').then(JSON.parse).catch(()=>null);
 try{execFileSync('/usr/bin/security',['add-generic-password','-U','-a',c.dispositivo_id,'-s',service,'-w',c.token],{stdio:'pipe'});}catch{throw new Error('No se pudo guardar la autorizacion en el Llavero. Acepta el permiso de macOS y repite.');}
 // Token is never written to config.json, a plist or a log.
 const publicConfig={version:'1',supabase_url:c.supabase_url,publishable_key:c.publishable_key,huerto_id:c.huerto_id,dispositivo_id:c.dispositivo_id,servicio_llavero:service};
 await writeFile(join(base,'config.json'),JSON.stringify(publicConfig,null,2),{mode:0o600});await chmod(join(base,'config.json'),0o600);
 for(const [a,b] of [['scripts/macos/agente.mjs','agente.mjs'],['src/lib/monitor/meteo-core.mjs','meteo-core.mjs'],['src/lib/monitor/sync.mjs','sync.mjs']]){await copyFile(join(root,a),join(base,b));await chmod(join(base,b),0o600);}
 for(const f of ['meteo.log','meteo-error.log']){await writeFile(join(logs,f),'',{flag:'a',mode:0o600});await chmod(join(logs,f),0o600);}
 const text=`<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array><string>${xml(process.execPath)}</string><string>${xml(join(base,'agente.mjs'))}</string><string>${xml(join(base,'config.json'))}</string></array><key>RunAtLoad</key><true/><key>StartInterval</key><integer>3600</integer><key>ProcessType</key><string>Background</string><key>StandardOutPath</key><string>${xml(join(logs,'meteo.log'))}</string><key>StandardErrorPath</key><string>${xml(join(logs,'meteo-error.log'))}</string><key>ThrottleInterval</key><integer>60</integer></dict></plist>\n`;
 await writeFile(plist,text,{mode:0o600});await chmod(plist,0o600);
 try{execFileSync('/usr/bin/plutil',['-lint',plist],{stdio:'pipe'});execFileSync('/bin/launchctl',['bootstrap',`gui/${process.getuid()}`,plist],{stdio:'pipe'});}catch{throw new Error('Los archivos estan preparados, pero macOS no ha cargado el agente. Comprueba Ajustes del Sistema > General > Items de inicio / actividad en segundo plano, y vuelve a ejecutar el instalador.');}
 if(old?.dispositivo_id&&old.dispositivo_id!==c.dispositivo_id){try{execFileSync('/usr/bin/security',['delete-generic-password','-a',old.dispositivo_id,'-s',service],{stdio:'pipe'});}catch{/* Not found. */}console.log('Revoca tambien la autorizacion anterior desde Meteorologia si ya no la necesitas.');}
 console.log('Instalado: al iniciar sesion en macOS y cada hora mientras el Mac esta despierto.');
 console.log('El recuperador no necesita abrir la aplicacion. No funciona con el equipo apagado ni antes de iniciar sesion.');
 console.log('La primera sincronizacion se ha solicitado a macOS. Para verificar: npm run mac:comprobar');
 console.log('Las notificaciones pueden requerir permiso de macOS para osascript/Script Editor. Los avisos tambien se muestran dentro de la aplicacion.');
 if(process.stdin.isTTY){const rl=createInterface({input:process.stdin,output:process.stdout});const answer=await rl.question('Eliminar el JSON descargado que contiene la autorizacion privada? [s/N] ');rl.close();if(answer.trim().toLowerCase()==='s'){await unlink(src);console.log('JSON descargado eliminado. La autorizacion queda en el Llavero.');}}
 else console.log('Elimina el JSON descargado cuando hayas comprobado la instalacion; no lo compartas.');
}
main().catch(e=>{console.error(e.message||'Instalacion no completada.');process.exitCode=1;});
