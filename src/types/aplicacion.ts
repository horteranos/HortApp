import type {
  FilaRow,
  HuertoRow,
  PlantacionPuntoRow,
  PlantacionRow,
  PuntoRiegoRow,
  RolHuerto,
} from "./database";

export type {
  EstadoPlantacion,
  PrecisionFecha,
  RolHuerto,
  TipoInicio,
  UnidadCantidad,
} from "./database";

export type Huerto = HuertoRow;
export type FilaHuerto = FilaRow;
export type PuntoRiego = PuntoRiegoRow;
export type Plantacion = PlantacionRow;
export type AsignacionPunto = PlantacionPuntoRow;

/** Datos leídos de Supabase bajo los permisos del usuario autenticado. */
export type HuertoSnapshot = {
  cuaderno: import("./cuaderno").Cuaderno;
  hoy: string;
  huerto: Huerto;
  rol: RolHuerto;
  filas: FilaHuerto[];
  puntos: PuntoRiego[];
  plantaciones: Plantacion[];
  asignaciones: AsignacionPunto[];
  usuarioId: string;
};

export type ResultadoCargaHuerto =
  | { estado: "listo"; datos: HuertoSnapshot }
  | { estado: "sin_acceso" }
  | { estado: "error"; mensaje: string };
