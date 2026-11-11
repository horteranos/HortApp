export type PrecisionFecha = "exacta" | "aproximada" | null;

export type EstadoCultivo =
  | "presente"
  | "existente"
  | "plantado"
  | "sembrado"
  | "resembrado"
  | "pendiente";

export interface CultivoInicial {
  id: string;
  nombre: string;
  cantidad: number | null;
  unidadCantidad: "plantas" | "planteles" | null;
  estado: EstadoCultivo;
  fecha: string | null;
  precisionFecha: PrecisionFecha;
  ubicacionConocida: string | null;
  notas: string | null;
}

export interface FilaHuerto {
  id: string;
  puntosRiego: number;
  cultivos: CultivoInicial[];
}

export interface ZonaConocida {
  filaId: string;
  cultivoId: string;
  desdePunto: number;
  hastaPunto: number;
  lado: "oeste" | "este";
  descripcion: string;
}

export interface ArbolExterior {
  nombre: string;
  cercaDeFila: string;
  lado: "oeste" | "este";
  fueraDeFila: boolean;
}

export interface DatosHuerto {
  id: string;
  nombre: string;
  localidad: string;
  dimensionAproximadaMetros: { largo: number; ancho: number };
  orientacionFilas: "este-oeste";
  separacionFilasAproximadaMetros: number;
  distanciaGoterosCentimetros: number;
  filas: FilaHuerto[];
  zonasConocidas: ZonaConocida[];
  arbolesExterior: ArbolExterior[];
}
