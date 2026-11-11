import {normalizarHoras,resumirDias,planificarArchivo,diaLocal,sumarDias,contarPendientes} from './meteo-core.mjs';
const COMMON=['temperature_2m','relative_humidity_2m','wind_speed_10m','wind_gusts_10m','precipitation','weather_code'];
export function urlMeteo(config,tipo,desde,hasta){
  const u=new URL(tipo==='archivo'?'https://archive-api.open-meteo.com/v1/archive':'https://api.open-meteo.com/v1/forecast');
  const q={latitude:String(config.latitud),longitude:String(config.longitud),timezone:'UTC',timeformat:'unixtime',temperature_unit:'celsius',wind_speed_unit:'kmh',precipitation_unit:'mm',cell_selection:'land',hourly:[...COMMON,...(tipo==='archivo'?[]:['precipitation_probability'])].join(',')};
  if(tipo==='archivo'){q.start_date=sumarDias(desde,-1);q.end_date=sumarDias(hasta,1);}
  else {q.past_days='10';q.forecast_days='5';}
  for(const [k,v] of Object.entries(q))u.searchParams.set(k,v);
  return u.toString();
}
async function obtener(url,fetcher){
  for(let i=0;i<2;i++){
    try {
      const r=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});
      if(!r.ok)throw new Error(`Proveedor meteorologico: HTTP ${r.status}.`);
      return await r.json();
    }catch(e){if(i===1)throw e;await new Promise(r=>setTimeout(r,1500));}
  }
}
/** rpc(action, data) must enforce membership OR a narrow, revocable device token. */
export async function sincronizarMeteo(rpc,{fetcher=fetch,now=()=>Date.now()/1000,maxLotes=4}={}){
  const inicio=await rpc('sync_inicio',{});
  if(inicio.omitir)return {mensaje:inicio.mensaje,omitida:true};
  const {config,lease,dias}=inicio; const hoy=diaLocal(now(),config.zona_horaria),ayer=sumarDias(hoy,-1);
  let guardados=0,pronostico=false;const errores=[];const disponibles=new Map(dias.map(d=>[d.fecha,d]));
  const guardar=async(filas,prevision=null)=>{
    if(!filas.length&&!prevision)return;
    await rpc('sync_guardar',{lease,lugar_version:config.lugar_version,filas,prevision});
    for(const f of filas){const old=disponibles.get(f.fecha);if(!old||((!old.completo||f.completo)&&!(old.fuente==='archivo'&&f.fuente!=='archivo')))disponibles.set(f.fecha,f);}
    guardados+=filas.length;
  };
  try{
    // A failure in history must not prevent updating the coming 72 hours.
    try{
      const raw=await obtener(urlMeteo(config,'reciente'),fetcher);const horas=normalizarHoras(raw);
      const stamp=now();
      const futuras=horas.filter(h=>h.t>=stamp-3600&&h.t<=stamp+96*3600);
      if(!futuras.length)throw new Error('El proveedor no devuelve horas futuras.');
      const filas=resumirDias(horas,config.desde,ayer,'reciente',config.zona_horaria,stamp).map(d=>({...d,latitud_solicitada:config.latitud,longitud_solicitada:config.longitud,latitud_malla:raw.latitude,longitud_malla:raw.longitude,zona_horaria:config.zona_horaria}));
      await guardar(filas,{horas:futuras,consultado_en:new Date(stamp*1000).toISOString(),proveedor:'Open-Meteo',url:'https://open-meteo.com/',latitud_malla:raw.latitude,longitud_malla:raw.longitude});pronostico=true;
    }catch{errores.push('No se pudo actualizar la prevision o los ultimos dias; se conserva lo guardado.');}
    const hastaArchivo=sumarDias(hoy,-7);
    const lotes=planificarArchivo([...disponibles.values()],config.desde,hastaArchivo,maxLotes);
    for(const lote of lotes){
      try {
        const raw=await obtener(urlMeteo(config,'archivo',lote.desde,lote.hasta),fetcher);
        const filas=resumirDias(normalizarHoras(raw),lote.desde,lote.hasta,'archivo',config.zona_horaria,now()).map(d=>({...d,latitud_solicitada:config.latitud,longitud_solicitada:config.longitud,latitud_malla:raw.latitude,longitud_malla:raw.longitude,zona_horaria:config.zona_horaria}));
        if(!filas.length)throw new Error('Archivo vacio.');
        await guardar(filas);
      }catch{errores.push(`Pendiente recuperar ${lote.desde} a ${lote.hasta}.`);}
    }
    const pendientes=contarPendientes([...disponibles.values()],config.desde,ayer);
    const revisionesPendientes=planificarArchivo([...disponibles.values()],config.desde,hastaArchivo,1).length>0;
    const mensaje=`${guardados} resumenes procesados. ${pendientes} dias incompletos o pendientes.${revisionesPendientes?' Quedan lotes para recuperar o actualizar desde el archivo.':''}${errores.length?' '+errores.join(' '):''}`;
    await rpc('sync_fin',{lease,mensaje,correcto:!errores.length&&pronostico,pendientes});
    return {mensaje,guardados,pendientes,errores,pronostico};
  }catch(e){
    try{await rpc('sync_fin',{lease,mensaje:'Sincronizacion interrumpida. Los lotes confirmados se conservan; se reintentara.',correcto:false});}catch{/* The lease expires; missing days will be retried. */}
    throw e;
  }
}
