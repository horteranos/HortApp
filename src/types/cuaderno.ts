/** Fechas ISO de calendario, sin conversion a horas UTC en la interfaz. */
export type TipoEvento = 'siembra' | 'resiembra' | 'plantacion' | 'cosecha' | 'incorporacion' | 'inicio_no_precisado';
export type PuntoHistorico = { id: string; numero: number };
export type EventoCultivo = {
  id: string; huerto_id: string; plantacion_id: string; fila_id: string | null; fila_codigo: string | null;
  cultivo: string; variedad: string | null; tipo: TipoEvento; fecha: string;
  precision_fecha: 'exacta' | 'aproximada'; puntos_snapshot: PuntoHistorico[]; notas: string | null;
  origen: 'manual' | 'migracion_06'; clave_importacion: string | null; revision: number;
  creado_por: string | null; creado_en: string; actualizado_en: string;
  anulado_en: string | null; motivo_anulacion: string | null;
};
export type OcupacionCultivo = {
  id: string; huerto_id: string; plantacion_id: string; punto_id: string; fila_id: string;
  fila_codigo: string; numero_al_asignar: number; numero_al_retirar: number | null;
  cultivo: string; variedad: string | null; registrado_en: string; retirado_en: string | null;
  inicio_desconocido: boolean; registrado_por: string | null;
};
export type Cuaderno = {
  estado: 'listo' | 'pendiente'; eventos: EventoCultivo[]; ocupaciones: OcupacionCultivo[];
};
export type EstadoCuaderno = {
  estado: 'inicial' | 'guardado' | 'error' | 'conflicto'; mensaje: string;
  id?: string; version?: number;
};
export type ModoLote = 'agregar' | 'retirar' | 'reemplazar' | 'eliminar_puntos';
