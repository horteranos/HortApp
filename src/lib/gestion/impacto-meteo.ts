import type {Aviso} from '@/types/monitor';
import type {Plantacion} from '@/types/aplicacion';

/** Plain-language weather effects, NOT pathogen/pest detection or plant health diagnosis. */
export type ImpactoMeteo={cultivos:string;impacto:string;recomendacion:string};
type CultivoActivo=Pick<Plantacion,'cultivo'|'variedad'|'estado'>;
const limpiar=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function nombres(cultivos:readonly CultivoActivo[],patrones:readonly string[]){
 const elegidos=cultivos.filter(p=>p.estado==='presente'&&patrones.some(x=>limpiar(p.cultivo).includes(x)));
 return elegidos.map(p=>p.variedad?`${p.cultivo} (${p.variedad})`:p.cultivo);
}
function etiquetar(lista:string[]){
 const unicos=[...new Set(lista)];return unicos.length===0?'Sin cultivos presentes identificados':
 unicos.slice(0,4).join(', ')+(unicos.length>4?` y ${unicos.length-4} m\u00e1s`:'');
}
export function impactoMeteo(aviso:Pick<Aviso,'tipo'>,cultivos:readonly CultivoActivo[]):ImpactoMeteo{
 const actuales=cultivos.filter(p=>p.estado==='presente');
 const todos=actuales.map(p=>p.variedad?`${p.cultivo} (${p.variedad})`:p.cultivo);
 const hojas=['lechug','espinac','rucul','coliflor','brocol','repollo','pak choi','kale','acelg'];
 const tiernos=['tomat','pimient','berenjen','calabacin','pepino','judia','albahac'];
 const altos=['guisant','haba','tomat','pimient','maiz','alcachof'];
 let impacto='',recomendacion='',relacionados=todos;
 switch(aviso.tipo){
  case 'frio':case 'nieve':
   relacionados=nombres(actuales,tiernos);
   impacto='Las bajas temperaturas pueden ralentizar el crecimiento y, si hay helada real, dañar tejido vegetal sensible. La temperatura del aire no equivale a la de las hojas.';
   recomendacion='Comprobar la temperatura local; proteger planteles sensibles si procede y revisar daños después del episodio.';
   break;
  case 'calor':
   relacionados=nombres(actuales,hojas);
   impacto='El calor puede elevar la demanda de agua y acelerar el espigado de cultivos de hoja; no demuestra daño en las plantas.';
   recomendacion='Comprobar humedad del suelo, riego por goteo y necesidad de sombra, evitando encharcar.';
   break;
  case 'humedad_alta':
   relacionados=nombres(actuales,hojas);
   impacto='La humedad ambiental elevada puede reducir el secado del follaje y modificar la transpiración. No confirma hojas mojadas ni una enfermedad.';
   recomendacion='Comprobar ventilacion, secado de hojas y estado real del suelo antes de modificar el riego.';
   break;
  case 'humedad_baja':
   relacionados=nombres(actuales,hojas);
   impacto='El aire seco puede aumentar la transpiración de hojas y el consumo de agua, especialmente con viento.';
   recomendacion='Observar turgencia y humedad del suelo; ajustar el riego solo si resulta necesario.';
   break;
  case 'lluvia':
   impacto='La lluvia prevista puede aumentar la humedad del suelo y, si el drenaje es insuficiente, provocar encharcamiento.';
   recomendacion='Revisar drenaje y humedad del suelo; valorar pausar riegos si llueve realmente.';
   break;
  case 'tormenta':
   impacto='Una tormenta puede combinar lluvia intensa, viento y daños mecánicos localizados.';
   recomendacion='Revisar soportes, drenaje y estado de los cultivos después del episodio.';
   break;
  case 'viento':
   relacionados=nombres(actuales,altos);
   impacto='Las rachas pueden causar desecación y daños mecánicos en tallos o plantas altas.';
   recomendacion='Comprobar tutores y sujeciones, especialmente en guisantes y habas.';
   break;
  default:
   impacto='Las condiciones previstas pueden afectar al desarrollo de los cultivos.';
   recomendacion='Contrastar con observaciones en la parcela antes de actuar.';
 }
 return {cultivos:etiquetar(relacionados.length?relacionados:todos),impacto,recomendacion};
}
