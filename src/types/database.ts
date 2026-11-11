export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
import type { EventoCultivo, OcupacionCultivo, TipoEvento, ModoLote } from "./cuaderno";
import type {Tarea,Plantel,Recuento,DiarioMedio} from "./gestion";

/**
 * Tipos de las tablas iniciales y de 04_gestion_plano.sql.
 * Mantenerlos sincronizados si se aplica una migración al esquema.
 * Las fechas PostgreSQL se reciben como texto ISO, sin convertirlas a Date.
 */

export type RolHuerto = "administrador" | "editor" | "lector";
export type EstadoPlantacion = "presente" | "pendiente_trasplante" | "finalizada";
export type UnidadCantidad = "plantas" | "planteles" | "arboles" | "no_precisada";
export type PrecisionFecha = "exacta" | "aproximada" | "desconocida";
export type TipoInicio = "plantacion" | "incorporacion" | "no_precisado";

export type HuertoRow = {
  id: string;
  codigo: string;
  nombre: string;
  municipio: string | null;
  ancho_aprox_m: number | null;
  largo_aprox_m: number | null;
  separacion_filas_aprox_m: number | null;
  zona_horaria: string;
  version_cuaderno?: number;
  plano_a_escala: boolean;
  notas: string | null;
  creado_en: string;
  actualizado_en: string;
};

export type MiembroHuertoRow = {
  huerto_id: string;
  usuario_id: string;
  rol: RolHuerto;
  creado_en: string;
};

export type FilaRow = {
  id: string;
  huerto_id: string;
  numero: number;
  codigo: string;
  goteros_previstos: number;
  orientacion: string;
  separacion_goteros_cm: number;
  notas: string | null;
  /** Ausente mientras el proyecto no haya aplicado 04_gestion_plano.sql. */
  version_plano?: number;
};

export type PuntoRiegoRow = {
  id: string;
  huerto_id: string;
  fila_id: string;
  numero_desde_oeste: number;
};

export type PlantacionRow = {
  id: string;
  huerto_id: string;
  codigo_origen: string | null;
  cultivo: string;
  variedad: string | null;
  estado: EstadoPlantacion;
  fila_id: string | null;
  fila_prevista_id: string | null;
  ubicacion_texto: string | null;
  cantidad_declarada: number | null;
  unidad_cantidad: UnidadCantidad;
  es_permanente: boolean | null;
  fecha_inicio: string | null;
  precision_fecha_inicio: PrecisionFecha;
  tipo_inicio: TipoInicio;
  detalle_fecha_inicio: string | null;
  fecha_ultima_resiembra: string | null;
  precision_fecha_resiembra: PrecisionFecha;
  detalle_fecha_resiembra: string | null;
  fecha_referencia: string | null;
  fuente: string | null;
  notas: string | null;
  creado_en: string;
  actualizado_en: string;
};

export type PlantacionPuntoRow = {
  huerto_id: string;
  fila_id: string;
  plantacion_id: string;
  punto_id: string;
};

/** Solo las columnas NOT NULL sin DEFAULT son obligatorias al insertar. */
type Insercion<Fila, Obligatorias extends keyof Fila> = Pick<Fila, Obligatorias> &
  Partial<Omit<Fila, Obligatorias>>;

export type Database = {
  public: {
    Tables: {
      sm_tareas:{Row:Tarea;Insert:Insercion<Tarea,"huerto_id"|"titulo"|"fecha">;Update:Partial<Tarea>;Relationships:[]};
      sm_semillero:{Row:Plantel;Insert:Insercion<Plantel,"huerto_id"|"plaza"|"cultivo">;Update:Partial<Plantel>;Relationships:[]};
      sm_recuentos:{Row:Recuento;Insert:Insercion<Recuento,"huerto_id"|"plantacion_id"|"plantas_actuales"|"fecha">;Update:Partial<Recuento>;Relationships:[]};
      sm_diario_medios:{Row:DiarioMedio;Insert:Insercion<DiarioMedio,"huerto_id"|"entrada_id"|"ruta"|"nombre"|"mime"|"tamano">;Update:Partial<DiarioMedio>;Relationships:[]};
      eventos_cultivo: { Row: EventoCultivo; Insert: never; Update: never; Relationships: [] };
      ocupaciones_cultivo: { Row: OcupacionCultivo; Insert: never; Update: never; Relationships: [] };
      huertos: {
        Row: HuertoRow;
        Insert: Insercion<HuertoRow, "codigo" | "nombre">;
        Update: Partial<HuertoRow>;
        Relationships: [];
      };
      miembros_huerto: {
        Row: MiembroHuertoRow;
        Insert: Insercion<MiembroHuertoRow, "huerto_id" | "usuario_id" | "rol">;
        Update: Partial<MiembroHuertoRow>;
        Relationships: [
          {
            foreignKeyName: "miembros_huerto_huerto_id_fkey";
            columns: ["huerto_id"];
            isOneToOne: false;
            referencedRelation: "huertos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "miembros_huerto_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      filas: {
        Row: FilaRow;
        Insert: Insercion<FilaRow, "huerto_id" | "numero" | "codigo" | "goteros_previstos">;
        Update: Partial<FilaRow>;
        Relationships: [
          {
            foreignKeyName: "filas_huerto_id_fkey";
            columns: ["huerto_id"];
            isOneToOne: false;
            referencedRelation: "huertos";
            referencedColumns: ["id"];
          },
        ];
      };
      puntos_riego: {
        Row: PuntoRiegoRow;
        Insert: Insercion<PuntoRiegoRow, "huerto_id" | "fila_id" | "numero_desde_oeste">;
        Update: Partial<PuntoRiegoRow>;
        Relationships: [
          {
            foreignKeyName: "puntos_riego_huerto_id_fila_id_fkey";
            columns: ["huerto_id", "fila_id"];
            isOneToOne: false;
            referencedRelation: "filas";
            referencedColumns: ["huerto_id", "id"];
          },
        ];
      };
      plantaciones: {
        Row: PlantacionRow;
        Insert: Insercion<PlantacionRow, "huerto_id" | "cultivo">;
        Update: Partial<PlantacionRow>;
        Relationships: [
          {
            foreignKeyName: "plantaciones_huerto_id_fkey";
            columns: ["huerto_id"];
            isOneToOne: false;
            referencedRelation: "huertos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plantaciones_huerto_id_fila_id_fkey";
            columns: ["huerto_id", "fila_id"];
            isOneToOne: false;
            referencedRelation: "filas";
            referencedColumns: ["huerto_id", "id"];
          },
          {
            foreignKeyName: "plantaciones_huerto_id_fila_prevista_id_fkey";
            columns: ["huerto_id", "fila_prevista_id"];
            isOneToOne: false;
            referencedRelation: "filas";
            referencedColumns: ["huerto_id", "id"];
          },
        ];
      };
      plantacion_puntos: {
        Row: PlantacionPuntoRow;
        Insert: PlantacionPuntoRow;
        Update: Partial<PlantacionPuntoRow>;
        Relationships: [
          {
            foreignKeyName: "plantacion_puntos_huerto_id_fila_id_plantacion_id_fkey";
            columns: ["huerto_id", "fila_id", "plantacion_id"];
            isOneToOne: false;
            referencedRelation: "plantaciones";
            referencedColumns: ["huerto_id", "fila_id", "id"];
          },
          {
            foreignKeyName: "plantacion_puntos_huerto_id_fila_id_punto_id_fkey";
            columns: ["huerto_id", "fila_id", "punto_id"];
            isOneToOne: false;
            referencedRelation: "puntos_riego";
            referencedColumns: ["huerto_id", "fila_id", "id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      monitor_operacion: { Args: {p_huerto_id:string;p_accion:string;p_datos?:Json;p_token?:string|null}; Returns: Json };
      editar_puntos_lote: {
        Args: { p_huerto_id: string; p_fila_id: string; p_version: number; p_puntos: string[];
          p_modo: ModoLote; p_plantaciones: string[]; p_cultivo: string | null; p_variedad: string | null; };
        Returns: { version_plano: number; plantacion_id: string | null; puntos: number };
      };
      guardar_evento_cultivo: {
        Args: { p_huerto_id: string; p_plantacion_id: string; p_evento_id: string; p_revision: number;
          p_tipo: TipoEvento; p_fecha: string; p_precision: 'exacta' | 'aproximada'; p_notas: string | null;
          p_puntos: string[]; p_version_fila: number | null; };
        Returns: { id: string; revision: number };
      };
      anular_evento_cultivo: {
        Args: { p_huerto_id: string; p_evento_id: string; p_revision: number; p_motivo: string };
        Returns: { id: string; revision: number };
      };
      editar_plano: {
        Args: {
          p_huerto_id: string;
          p_fila_id: string;
          p_version: number;
          p_operacion: "anadir_punto" | "eliminar_punto" | "asignar_cultivos";
          p_punto_id?: string | null;
          p_posicion?: number | null;
          p_plantacion_ids?: string[] | null;
          p_cultivo?: string | null;
          p_variedad?: string | null;
        };
        Returns: {
          version_plano: number;
          punto_id: string;
          plantacion_id?: string | null;
        };
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
