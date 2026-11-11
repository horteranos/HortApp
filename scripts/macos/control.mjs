#!/usr/bin/env node
import {readFile,rm,unlink} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const label='org.sistema-monitorizacion.meteo';
async function main(){
 if(process.platform!=='darwin')throw new Error('Este comando solo se utiliza en el Mac.');
 const action=process.argv[2],base=join(homedir(),'Library','Application Support','SistemaMonitorizacion'),ruta=join(base,'config.json'),target=`gui/${process.getuid()}/${label}`;
 if(action==='sincronizar'){execFileSync(process.execPath,[join(base,'agente.mjs'),ruta],{stdio:'inherit',timeout:10*60*1000});return;}
 if(action==='comprobar'){
  try{const out=execFileSync('/bin/launchctl',['print',target],{encoding:'utf8',stdio:['ignore','pipe','pipe']});console.log('Agente instalado.');console.log(out.split('\n').filter(l=>/state =|runs =|last exit code =|run interval/.test(l)).join('\n'));}catch{console.log('El agente no esta cargado. Ejecuta npm run mac:instalar.');}
  for(const f of ['meteo.log','meteo-error.log']){const t=await readFile(join(homedir(),'Library','Logs','SistemaMonitorizacion',f),'utf8').catch(()=>'Sin registro.');console.log('\n'+f+'\n'+t.split('\n').slice(-18).join('\n'));}
  console.log('\nComprueba tambien Meteorologia > Ultimo intento y dias pendientes.');return;
 }
 if(action==='desinstalar'){
  try{execFileSync('/bin/launchctl',['bootout',target],{stdio:'pipe'});}catch{/* May already be stopped. */}
  const c=await readFile(ruta,'utf8').then(JSON.parse).catch(()=>null);
  if(c){try{execFileSync('/usr/bin/security',['delete-generic-password','-a',c.dispositivo_id,'-s',c.servicio_llavero],{stdio:'pipe'});}catch{/* Already absent. */}}
  await unlink(join(homedir(),'Library','LaunchAgents',label+'.plist')).catch(()=>{});await rm(base,{recursive:true,force:true});
  console.log('Recuperador local desinstalado. La base de datos no se ha modificado. Revoca tambien esta autorizacion desde Meteorologia.');return;
 }
 throw new Error('Comando no reconocido.');
}
main().catch(e=>{console.error(e.message||'No se ha completado el comando.');process.exitCode=1;});
