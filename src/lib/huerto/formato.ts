import type {
  EstadoPlantacion,
  FilaHuerto,
  Plantacion,
  PrecisionFecha,
  RolHuerto,
  UnidadCantidad,
} from "../../types/aplicacion";

/** Las fechas de cultivo son días del calendario, no instantes ni horas UTC. */
export function formatearFecha(
  fecha: string | null,
  precision: PrecisionFecha = "exacta",
): string {
  if (!fecha || precision === "desconocida") return "Fecha no confirmada";

  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!partes) return "Fecha no válida";
  const [, anio, mes, dia] = partes;
  const calendario = new Date(`${fecha}T12:00:00.000Z`);
  if (
    Number.isNaN(calendario.getTime()) ||
    calendario.getUTCFullYear() !== Number(anio) ||
    calendario.getUTCMonth() + 1 !== Number(mes) ||
    calendario.getUTCDate() !== Number(dia)
  ) {
    return "Fecha no válida";
  }

  const texto = `${dia}/${mes}/${anio}`;
  return precision === "aproximada" ? `Aprox. ${texto}` : texto;
}

const UNIDADES: Record<UnidadCantidad, readonly [string, string]> = {
  plantas: ["planta", "plantas"],
  planteles: ["plantel", "planteles"],
  arboles: ["árbol", "árboles"],
  no_precisada: ["unidad (sin precisar)", "unidades (sin precisar)"],
};

/** Una cantidad desconocida no equivale a cero, ni al número de goteros. */
export function formatearCantidad(
  plantacion: Pick<Plantacion, "cantidad_declarada" | "unidad_cantidad">,
): string {
  const cantidad = plantacion.cantidad_declarada;
  if (cantidad === null) return "Cantidad sin confirmar";
  const unidad = UNIDADES[plantacion.unidad_cantidad][cantidad === 1 ? 0 : 1];
  return `${new Intl.NumberFormat("es-ES").format(cantidad)} ${unidad}`;
}

export function nombrePlantacion(
  plantacion: Pick<Plantacion, "cultivo" | "variedad">,
): string {
  return plantacion.variedad?.trim()
    ? `${plantacion.cultivo} · ${plantacion.variedad}`
    : plantacion.cultivo;
}

export function puedeEditar(rol: RolHuerto): boolean {
  return rol === "administrador" || rol === "editor";
}

export function etiquetaEstado(estado: EstadoPlantacion): string {
  const etiquetas: Record<EstadoPlantacion, string> = {
    presente: "Presente",
    pendiente_trasplante: "Pendiente de trasplante",
    finalizada: "Finalizada",
  };
  return etiquetas[estado];
}

/** Conserva la ubicación declarada; una fila prevista no es una fila ocupada. */
export function describirUbicacion(
  plantacion: Pick<
    Plantacion,
    "fila_id" | "fila_prevista_id" | "ubicacion_texto" | "estado"
  >,
  filas: readonly FilaHuerto[],
): string {
  if (plantacion.ubicacion_texto?.trim()) return plantacion.ubicacion_texto;

  if (plantacion.fila_id) {
    const fila = filas.find((item) => item.id === plantacion.fila_id);
    return fila ? `${fila.codigo}; puntos concretos sin confirmar.` : "Fila sin identificar";
  }
  if (plantacion.fila_prevista_id) {
    const fila = filas.find((item) => item.id === plantacion.fila_prevista_id);
    return fila
      ? `Destino previsto: ${fila.codigo}. Ubicación actual sin confirmar.`
      : "Destino previsto sin identificar. Ubicación actual sin confirmar.";
  }
  return "Ubicación sin confirmar";
}

/** Orden de presentación, sin asignar posiciones a los lotes. */
export function ordenarPlantaciones(
  plantaciones: readonly Plantacion[],
  filas: readonly FilaHuerto[],
): Plantacion[] {
  const ordenFilas = new Map(filas.map((fila) => [fila.id, fila.numero]));
  const orden = (plantacion: Plantacion): number =>
    ordenFilas.get(plantacion.fila_id ?? plantacion.fila_prevista_id ?? "") ??
    Number.MAX_SAFE_INTEGER;

  return [...plantaciones].sort(
    (a, b) =>
      orden(a) - orden(b) ||
      a.cultivo.localeCompare(b.cultivo, "es") ||
      (a.variedad ?? "").localeCompare(b.variedad ?? "", "es") ||
      (a.fecha_inicio ?? "").localeCompare(b.fecha_inicio ?? "") ||
      (a.codigo_origen ?? "").localeCompare(b.codigo_origen ?? "", "es") ||
      a.id.localeCompare(b.id),
  );
}
