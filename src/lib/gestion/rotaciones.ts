import type {EventoCultivo} from '@/types/cuaderno';
// Calendario orientativo para litoral mediterráneo, a confirmar localmente.
const CULTIVOS=[
 {nombre:'Habas',familia:'fabaceas',meses:[9,10,11,12,1,2]},
 {nombre:'Guisantes',familia:'fabaceas',meses:[10,11,12,1,2]},
 {nombre:'Ajos',familia:'amarilidaceas',meses:[10,11,12,1]},
 {nombre:'Cebollas',familia:'amarilidaceas',meses:[10,11,12,1,2]},
 {nombre:'Lechugas',familia:'asteraceas',meses:[9,10,11,12,1,2,3,4]},
 {nombre:'Espinacas',familia:'amarantaceas',meses:[9,10,11,12,1,2,3]},
 {nombre:'Rábanos',familia:'brassicaceas',meses:[9,10,11,12,1,2,3,4]},
 {nombre:'Zanahorias',familia:'apiaceas',meses:[9,10,11,12,1,2,3,4]},
 {nombre:'Acelgas',familia:'amarantaceas',meses:[9,10,11,12,1,2,3,4]},
 {nombre:'Brócoli',familia:'brassicaceas',meses:[8,9,10,11,12]},
 {nombre:'Tomates',familia:'solanaceas',meses:[3,4,5]},
 {nombre:'Pimientos',familia:'solanaceas',meses:[3,4,5]},
 {nombre:'Calabacín',familia:'cucurbitaceas',meses:[3,4,5,6]},
 {nombre:'Judías',familia:'fabaceas',meses:[3,4,5,6]},
];
function normalizar(s:string){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
export function familia(cultivo:string):string|null{
 const n=normalizar(cultivo);
 const familias:[RegExp,string][]=[
  [/brocol|coliflor|repollo|col( |$)|kale|pak choi|rucula|rabano|nabo/,'brassicaceas'],
  [/guisant|haba|judia|alubia|lenteja/,'fabaceas'],
  [/tomat|pimient|berenjen|patata/,'solanaceas'],
  [/pepino|calabac|calabaza|melon|sandia/,'cucurbitaceas'],
  [/lechug|alcachofa|escarola/,'asteraceas'],
  [/ceboll|puerro|ajo/,'amarilidaceas'],
  [/espinac|acelga|remolach/,'amarantaceas'],
  [/zanahoria|apio|perejil/,'apiaceas'],
  [/menta|salvia|romero|albahaca/,'lamiaceas'],
 ];return familias.find(([r])=>r.test(n))?.[1]??null;
}
export function sugerencias(cosecha:Pick<EventoCultivo,'cultivo'|'fecha'>,mes:number):{nombre:string;familia:string}[]{
 const previa=familia(cosecha.cultivo);
 return CULTIVOS.filter(c=>c.meses.includes(mes)&&c.familia!==previa).slice(0,7).map(c=>({nombre:c.nombre,familia:c.familia}));
}
