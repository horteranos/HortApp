import type {ConfigMonitor} from '../../types/monitor';
export function urlMeteo(config:Pick<ConfigMonitor,'latitud'|'longitud'>,tipo:string,desde?:string,hasta?:string):string;
export function sincronizarMeteo(rpc:(accion:string,datos:Record<string,unknown>)=>Promise<unknown>,opciones?:{fetcher?:typeof fetch;now?:()=>number;maxLotes?:number}):Promise<{mensaje:string;omitida?:boolean;guardados?:number;pendientes?:number;errores?:string[];pronostico?:boolean}>;
