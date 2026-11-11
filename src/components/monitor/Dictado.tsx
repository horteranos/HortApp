'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';

type ResultadoSpeech={resultIndex:number;results:ArrayLike<{isFinal:boolean;[index:number]:{transcript:string}}>};
type Speech={lang:string;continuous:boolean;interimResults:boolean;start:()=>void;stop:()=>void;onresult:((e:ResultadoSpeech)=>void)|null;onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null};
type VoiceWindow=Window&{SpeechRecognition?:new()=>Speech;webkitSpeechRecognition?:new()=>Speech};

const sinSuscripcion=()=>()=>{};
function detectarCapacidades(){
 if(typeof window==='undefined')return {seguro:false,reconocimiento:false};
 const w=window as VoiceWindow;
 return {seguro:window.isSecureContext===true,reconocimiento:typeof(w.SpeechRecognition??w.webkitSpeechRecognition)==='function'};
}
function mensajeErrorDictado(codigo:string){
 switch(codigo){
  case 'not-allowed':case 'service-not-allowed':return 'El micrófono o el reconocimiento de voz no tienen permiso. Comprueba los ajustes de Safari y del iPhone.';
  case 'audio-capture':return 'No se detectó un micrófono disponible. Puedes dictar con el teclado del iPhone.';
  case 'network':return 'El servicio de reconocimiento no está disponible. Comprueba Internet o usa el micrófono del teclado.';
  case 'no-speech':return 'No se detectó voz. Inténtalo de nuevo acercándote al micrófono.';
  case 'aborted':return 'El dictado se ha interrumpido.';
  default:return `No se pudo completar el dictado (${codigo}). Puedes utilizar el micrófono del teclado.`;
 }
}
export function Dictado({insertar,deshabilitado}:{insertar:(fragmento:string)=>void;deshabilitado:boolean}){
 const [escuchando,setEscuchando]=useState(false),[mensaje,setMensaje]=useState('');
 const ref=useRef<Speech|null>(null);
 // useSyncExternalStore evita diferencias de renderizado entre HTML del servidor y Safari.
 const seguro=useSyncExternalStore(sinSuscripcion,()=>detectarCapacidades().seguro,()=>false);
 const soportado=useSyncExternalStore(sinSuscripcion,()=>detectarCapacidades().reconocimiento,()=>false);
 const navegadorListo=seguro&&soportado;
 useEffect(()=>()=>{ref.current?.stop();ref.current=null;},[]);
 function enfocarNota(){
  document.getElementById('nota-texto')?.focus();
  setMensaje('En el iPhone, toca el campo Nota y luego el micrófono del teclado para dictar. El texto aparecerá en el borrador.');
 }
 function alternar(){
  if(escuchando){ref.current?.stop();return;}
  if(!window.isSecureContext){enfocarNota();return;}
  const w=window as VoiceWindow;const Constructor=w.SpeechRecognition??w.webkitSpeechRecognition;
  if(!Constructor){enfocarNota();return;}
  try{
   const rec=new Constructor();rec.lang='es-ES';rec.continuous=false;rec.interimResults=false;
   rec.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];if(r.isFinal){const t=r[0]?.transcript?.trim();if(t)insertar(t);}}};
   rec.onerror=e=>{setMensaje(mensajeErrorDictado(e.error));setEscuchando(false);};
   rec.onend=()=>{setEscuchando(false);ref.current=null;};
   ref.current=rec;rec.start();setEscuchando(true);setMensaje('');
  }catch{setEscuchando(false);setMensaje('No se pudo activar el reconocimiento de voz. Comprueba el permiso de micrófono de Safari.');}
 }
 return <div className="dictado">
  <button type="button" className={escuchando?'primary-button compact-button':'secondary-button compact-button'} onClick={alternar} disabled={deshabilitado||!navegadorListo}>{escuchando?'■ Detener dictado':'🎙 Dictar nota (web)'}</button>
  <button type="button" className="secondary-button compact-button" onClick={enfocarNota} disabled={deshabilitado}>🎤 Dictado del teclado</button>
  <small>{escuchando?'Escuchando. Revisa el texto antes de guardarlo.':!seguro?'El dictado web necesita HTTPS. Mientras pruebas con HTTP local, utiliza el micrófono del teclado del iPhone.':!soportado?'Este navegador no ofrece reconocimiento web. Utiliza el micrófono del teclado.':'Puedes dictar mediante el navegador o con el teclado del dispositivo. Revisa el texto antes de guardar.'}</small>
  {mensaje&&<p role="status">{mensaje}</p>}
 </div>;
}
