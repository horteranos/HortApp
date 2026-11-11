import type { TipoEvento, EventoCultivo } from '../../types/cuaderno';

export const TIPOS_EVENTO: Record<TipoEvento, string> = {
  siembra: 'Siembra', resiembra: 'Resiembra', plantacion: 'Plantación / trasplante',
  cosecha: 'Cosecha', incorporacion: 'Incorporación', inicio_no_precisado: 'Inicio sin tipo confirmado',
};
export const ICONOS_EVENTO: Record<TipoEvento, string> = {
  siembra: '🌱', resiembra: '🌱', plantacion: '🪴',
  cosecha: '🧺', incorporacion: '🌿', inicio_no_precisado: '📝',
};
const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Iconos orientativos: no todos los cultivos tienen un emoji botanico propio. */
export function emojiCultivo(cultivo: string): string {
  const n = normalizar(cultivo);
  const iconos: [RegExp, string][] = [
    [/guisant|haba|judia|alubia|frijol/, '🫛'],
    [/brocoli/, '🥦'], [/zanahori/, '🥕'], [/ceboll/, '🧅'],
    [/ajo/, '🧄'], [/limon/, '🍋'], [/tomat/, '🍅'],
    [/berenjen/, '🍆'], [/pepino|calabacin/, '🥒'], [/pimiento/, '🫑'],
    [/patata/, '🥔'], [/fresa/, '🍓'], [/maiz/, '🌽'],
    [/lechug|repollo|coliflor|kale|pak choi|espinac|rucula|acelga/, '🥬'],
    [/salvia|menta|albahaca|perejil|romero|tomillo/, '🌿'],
    [/alcachof|esparrag|puerro|remolach/, '🌱'],
  ];
  return iconos.find(([patron]) => patron.test(n))?.[1] ?? '🌱';
}
export function hoyEnZona(zona = 'Europe/Madrid', ahora = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ahora);
  const p = (tipo: Intl.DateTimeFormatPartTypes) => partes.find(x => x.type === tipo)!.value;
  return `${p('year')}-${p('month')}-${p('day')}`;
}
export function fechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(`${fecha}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === fecha;
}
export function diasCalendario(mes: string): string[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new Error('Mes no valido');
  const inicio = new Date(`${mes}-01T12:00:00Z`);
  inicio.setUTCDate(1 - ((inicio.getUTCDay() + 6) % 7));
  return Array.from({length: 42}, (_,i) => {
    const dia = new Date(inicio); dia.setUTCDate(inicio.getUTCDate() + i);
    return dia.toISOString().slice(0,10);
  });
}
export function cambiarMes(mes: string, incremento: number): string {
  const fecha = new Date(`${mes}-01T12:00:00Z`);
  fecha.setUTCMonth(fecha.getUTCMonth()+incremento);
  return fecha.toISOString().slice(0,7);
}
export function etiquetaMes(mes: string): string {
  return new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${mes}-01T12:00:00Z`));
}
export function numerosEnRangos(numeros: readonly number[]): string {
  const ns=[...new Set(numeros)].sort((a,b)=>a-b); const grupos: string[]=[];
  for(let i=0;i<ns.length;i++){const a=ns[i];let b=a;while(ns[i+1]===b+1){b=ns[++i];}grupos.push(a===b?String(a):`${a}–${b}`);}
  return grupos.join(', ');
}
export function seleccionarPuntos(anteriores: readonly string[], id: string, orden: readonly string[], multiple: boolean, ancla: string | null, rango: boolean): string[] {
  if (!orden.includes(id)) return [...anteriores];
  if (!multiple) return [id];
  if (rango && ancla && orden.includes(ancla)) {
    const a=orden.indexOf(ancla), b=orden.indexOf(id);
    return [...new Set([...anteriores, ...orden.slice(Math.min(a,b),Math.max(a,b)+1)])];
  }
  return anteriores.includes(id) ? anteriores.filter(x=>x!==id) : [...anteriores,id];
}
export function eventosEnPunto(eventos: readonly EventoCultivo[], puntoId: string): EventoCultivo[] {
  // Los eventos de lote sin puntos no se atribuyen arbitrariamente a todos sus goteros.
  return eventos.filter(e=>e.puntos_snapshot.some(p=>p.id===puntoId));
}
