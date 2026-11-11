import type {DiarioEntrada,FiltroDiario} from '../../types/monitor';
export const TIPOS:Record<string,string>;
export function escapar(valor:unknown):string;
export function ubicacionEntrada(entrada:DiarioEntrada):string;
export function nombreExportacion(filtro?:FiltroDiario,extension?:string):string;
export function exportarTXT(entradas:DiarioEntrada[],filtro?:FiltroDiario,fecha?:string):string;
export function exportarHTML(entradas:DiarioEntrada[],filtro?:FiltroDiario,fecha?:string):string;
