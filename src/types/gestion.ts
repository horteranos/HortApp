export type Tarea={id:string;huerto_id:string;titulo:string;descripcion:string;fecha:string;hora:string|null;prioridad:'baja'|'normal'|'alta';estado:'pendiente'|'hecha'|'cancelada';fila_id:string|null;plantacion_id:string|null;creada_por:string|null;revision:number;creada_en:string;actualizada_en:string};
export type Plantel={huerto_id:string;plaza:number;cultivo:string;variedad:string;fecha_siembra:string|null;fecha_prevista:string|null;estado:'sembrado'|'germinando'|'listo'|'trasplantado'|'descartado';observaciones:string;revision:number;actualizado_en:string};
export type Recuento={huerto_id:string;plantacion_id:string;plantas_actuales:number;fecha:string;observaciones:string;revision:number;actualizado_en:string};
export type DiarioMedio={id:string;huerto_id:string;entrada_id:string;ruta:string;nombre:string;mime:string;tamano:number;subido_por:string|null;creado_en:string};
export type GestionDatos={tareas:Tarea[];semillero:Plantel[];recuentos:Recuento[]};
export type GestionResultado<T>={ok:true;datos:T}|{ok:false;error:string};
