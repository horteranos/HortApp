/** Pure, shared browser/Node weather logic. No credentials or network effects. */
export const UMBRALES = Object.freeze({lluvia_prob:50,lluvia_mm:0.2,racha:50,frio:2,calor:35,humedad_alta:90,humedad_baja:30});
const HORA=3600;
const formatters=new Map();
export function diaLocal(epoch,zona='Europe/Madrid') {
  let f=formatters.get(zona);
  if(!f){f=new Intl.DateTimeFormat('en-CA',{timeZone:zona,year:'numeric',month:'2-digit',day:'2-digit'});formatters.set(zona,f);}
  const p=f.formatToParts(new Date(epoch*1000));
  const val=k=>p.find(x=>x.type===k)?.value;
  return `${val('year')}-${val('month')}-${val('day')}`;
}
export function sumarDias(d,n){return new Date(Date.parse(d+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);}
export function fechaValida(d){return typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;}
export function horasDelDia(d,zona='Europe/Madrid') {
  const centro=Date.parse(d+'T00:00:00Z')/1000;let n=0;
  for(let t=centro-86400;t<centro+172800;t+=HORA)if(diaLocal(t,zona)===d)n++;
  return n;
}
export function normalizarHoras(json){
  if(json?.error||!Array.isArray(json?.hourly?.time))throw new Error('El proveedor no ha devuelto una serie horaria valida.');
  const h=json.hourly;
  const keys={temperatura:'temperature_2m',humedad:'relative_humidity_2m',viento:'wind_speed_10m',racha:'wind_gusts_10m',lluvia:'precipitation',probabilidad:'precipitation_probability',codigo:'weather_code'};
  const seen=new Set();
  return h.time.map((t,i)=>{
    if(!Number.isSafeInteger(t)||seen.has(t))throw new Error('Serie temporal no valida o con horas duplicadas.');
    seen.add(t);const row={t};
    for(const [k,v] of Object.entries(keys)){const x=h[v]?.[i];row[k]=typeof x==='number'&&Number.isFinite(x)?x:null;}
    if(row.humedad!==null&&(row.humedad<0||row.humedad>100))row.humedad=null;
    if(row.probabilidad!==null&&(row.probabilidad<0||row.probabilidad>100))row.probabilidad=null;
    for(const k of ['lluvia','racha','viento'])if(row[k]!==null&&row[k]<0)row[k]=null;
    if(row.temperatura!==null&&(row.temperatura< -100||row.temperatura>70))row.temperatura=null;
    return row;
  }).sort((a,b)=>a.t-b.t);
}
const round=v=>Math.round(v*100)/100;
const aggregate=(values,op)=>values.length?round(op(...values)):null;
const avg=(...v)=>v.reduce((a,b)=>a+b,0)/v.length;
export function resumirDias(horas,desde,hasta,fuente,zona='Europe/Madrid',now=Date.now()/1000){
  const groups=new Map();const hoy=diaLocal(now,zona);
  const group=d=>{if(!groups.has(d))groups.set(d,{temperatura:[],humedad:[],viento:[],racha:[],lluvia:[]});return groups.get(d);};
  // Rain and gusts describe the PRECEDING hour. A value at midnight belongs
  // to the preceding civil day. Request padded UTC boundaries, never a fixed offset.
  for(const h of horas){
    const d=diaLocal(h.t,zona),anterior=diaLocal(h.t-1,zona);
    for(const k of ['temperatura','humedad','viento'])if(h[k]!==null&&d>=desde&&d<=hasta&&d<hoy)group(d)[k].push(h[k]);
    for(const k of ['racha','lluvia'])if(h[k]!==null&&anterior>=desde&&anterior<=hasta&&anterior<hoy)group(anterior)[k].push(h[k]);
  }
  return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([fecha,v])=>{
    const esperadas=horasDelDia(fecha,zona),counts=Object.fromEntries(Object.entries(v).map(([k,a])=>[k,a.length]));
    return {fecha,fuente,completo:Object.values(counts).every(n=>n===esperadas),horas_esperadas:esperadas,cobertura:counts,
      tmin:aggregate(v.temperatura,Math.min),tmax:aggregate(v.temperatura,Math.max),hrmin:aggregate(v.humedad,Math.min),hrmax:aggregate(v.humedad,Math.max),hrmedia:aggregate(v.humedad,avg),viento:aggregate(v.viento,avg),racha:aggregate(v.racha,Math.max),
      // A partial sum is not a valid daily rainfall total.
      lluvia:v.lluvia.length===esperadas?aggregate(v.lluvia,(...a)=>a.reduce((x,y)=>x+y,0)):null};
  });
}
export function planificarArchivo(dias,desde,hasta,maxLotes=4){
  if(!fechaValida(desde)||!fechaValida(hasta)||desde>hasta)return [];
  const ok=new Set(dias.filter(d=>d.fuente==='archivo'&&d.completo).map(d=>d.fecha));
  const lotes=[];let inicio=null,fin=null,n=0;
  for(let d=desde;d<=hasta;d=sumarDias(d,1)){
    if(ok.has(d)){if(inicio){lotes.push({desde:inicio,hasta:fin});inicio=null;n=0;}}
    else {if(!inicio)inicio=d;fin=d;n++;if(n===30){lotes.push({desde:inicio,hasta:fin});inicio=null;n=0;}}
    if(lotes.length>=maxLotes)break;
  }
  if(inicio&&lotes.length<maxLotes)lotes.push({desde:inicio,hasta:fin});
  return lotes;
}
export function contarPendientes(dias,desde,hasta){
  const ok=new Set(dias.filter(d=>d.completo).map(d=>d.fecha));let n=0;
  if(!fechaValida(desde)||!fechaValida(hasta))return 0;
  for(let d=desde;d<=hasta;d=sumarDias(d,1))if(!ok.has(d))n++;
  return n;
}
export function generarAvisos(horas,umbrales=UMBRALES,zona='Europe/Madrid',now=Date.now()/1000){
  const u={...UMBRALES,...umbrales};
  const reglas=[
    ['lluvia','Posible lluvia','🌧',h=>(h.probabilidad!==null&&h.probabilidad>=u.lluvia_prob)||(h.lluvia!==null&&h.lluvia>=u.lluvia_mm),h=>h.lluvia>=10?'alta':'atencion'],
    ['tormenta','Posible tormenta','⛈',h=>[95,96,97,99].includes(h.codigo),()=> 'alta'],
    ['viento','Rachas de viento','💨',h=>h.racha!==null&&h.racha>=u.racha,h=>h.racha>=80?'alta':'atencion'],
    ['frio','Frio / posible helada','❄',h=>h.temperatura!==null&&h.temperatura<=u.frio,h=>h.temperatura<=0?'alta':'atencion'],
    ['calor','Temperatura elevada','☀',h=>h.temperatura!==null&&h.temperatura>=u.calor,h=>h.temperatura>=40?'alta':'atencion'],
    ['humedad_alta','Humedad relativa alta','💧',h=>h.humedad!==null&&h.humedad>=u.humedad_alta,()=> 'informacion'],
    ['humedad_baja','Humedad relativa baja','🍃',h=>h.humedad!==null&&h.humedad<=u.humedad_baja,()=> 'informacion'],
    ['nieve','Posible nieve o hielo','❄',h=>[56,57,66,67,71,73,75,77,85,86].includes(h.codigo),()=> 'alta'],
  ];
  const out=[];
  for(const [tipo,titulo,icono,condicion,nivel] of reglas){
    // Accumulated rain, rain probability and gusts refer to the preceding hour.
    // Display their actual overlapping interval, never move them an hour later.
    const previo=tipo==='lluvia'||tipo==='viento';
    const futuro=(previo?horas.map(h=>({...h,t:h.t-HORA})):horas)
      .filter(h=>(previo?h.t+HORA>now:h.t>=now)&&h.t<now+72*HORA);
    let bloque=[];
    const cerrar=()=>{
      if(!bloque.length)return;
      // Persistent humidity, not one isolated humid sample. Other conditions immediate.
      if(tipo.startsWith('humedad_')&&bloque.length<3){bloque=[];return;}
      const max=k=>aggregate(bloque.map(h=>h[k]).filter(x=>x!==null),Math.max);
      const min=k=>aggregate(bloque.map(h=>h[k]).filter(x=>x!==null),Math.min);
      const severidad=bloque.some(h=>nivel(h)==='alta')?'alta':nivel(bloque[0]);
      const dia=diaLocal(bloque[0].t,zona);
      out.push({id:`${tipo}:${bloque[0].t}`,tipo,titulo,icono,nivel:severidad,inicio:Math.max(now,bloque[0].t),fin:Math.min(bloque.at(-1).t+HORA,now+72*HORA),dia,horas:bloque.length,probabilidad:max('probabilidad'),lluvia:max('lluvia'),racha:max('racha'),tmin:min('temperatura'),tmax:max('temperatura'),hrmin:min('humedad'),hrmax:max('humedad')});bloque=[];
    };
    for(const h of futuro){if(condicion(h)){if(bloque.length&&(h.t-bloque.at(-1).t!==HORA||(!tipo.startsWith('humedad_')&&diaLocal(h.t,zona)!==diaLocal(bloque[0].t,zona))))cerrar();bloque.push(h);}else cerrar();}cerrar();
  }
  return out.sort((a,b)=>a.inicio-b.inicio||a.tipo.localeCompare(b.tipo));
}
export function firmaAvisos(avisos){return [...new Set(avisos.map(a=>`${a.dia}:${a.tipo}:${a.nivel}`))].sort().join('|');}
export function estadoPrevision(p,now=Date.now()/1000){
  if(!p||!Array.isArray(p.horas)||!p.horas.length)return 'sin_datos';
  const stamp=Date.parse(p.consultado_en)/1000;
  if(!Number.isFinite(stamp)||now-stamp>6*HORA||stamp>now+300)return 'caducada';
  const futuro=p.horas.filter(h=>h.t>=now&&h.t<now+72*HORA);
  if(futuro.length!==72||futuro.some((h,i)=>h.t!==Math.ceil(now/HORA)*HORA+i*HORA)||futuro.some(h=>['temperatura','humedad','racha','lluvia','codigo'].some(k=>h[k]===null)))return 'incompleta';
  return 'vigente';
}
