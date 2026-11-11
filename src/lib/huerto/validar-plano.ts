export type OperacionPlano = "anadir_punto" | "eliminar_punto" | "asignar_cultivos";

export type EstadoCambioPlano = {
  estado: "inicial" | "guardado" | "error" | "conflicto";
  mensaje: string;
  versionPlano?: number;
  puntoId?: string;
  plantacionId?: string;
};

type BaseCambio = {
  huertoId: string;
  filaId: string;
  versionPlano: number;
};

export type DatosCambioPlano = BaseCambio & (
  | { operacion: "anadir_punto"; posicion: number }
  | { operacion: "eliminar_punto"; puntoId: string }
  | { operacion: "asignar_cultivos"; puntoId: string; plantacionIds: string[]; cultivoNuevo: string | null; variedadNueva: string | null }
);

type Validacion = { ok: true; datos: DatosCambioPlano } | { ok: false; mensaje: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENTERO = /^(?:0|[1-9]\d{0,9})$/;
export const MAX_PUNTOS_POR_FILA = 1000;

function tieneControl(texto: string): boolean {
  return Array.from(texto).some((caracter) => caracter.charCodeAt(0) < 32 || caracter.charCodeAt(0) === 127);
}

function textoUnico(form: FormData, campo: string, opcional = false): string | null {
  const valores = form.getAll(campo);
  if (valores.length === 0 && opcional) return "";
  return valores.length === 1 && typeof valores[0] === "string" ? valores[0] : null;
}

/** Valida forma y límites. La sesión, la fila y los cultivos se autorizan en el servidor y la BD. */
export function validarCambioPlano(form: FormData): Validacion {
  const huertoId = textoUnico(form, "huerto_id");
  const filaId = textoUnico(form, "fila_id");
  const version = textoUnico(form, "version_plano");
  const operacion = textoUnico(form, "operacion");

  if (!huertoId || !filaId || !UUID.test(huertoId) || !UUID.test(filaId)) {
    return { ok: false, mensaje: "No se ha podido identificar el huerto o la fila. Actualiza el plano." };
  }
  if (version === null || !ENTERO.test(version) || Number(version) > 2147483646) {
    return { ok: false, mensaje: "Falta una versión válida del plano. Actualiza y vuelve a abrir el formulario." };
  }
  const base = { huertoId: huertoId.toLowerCase(), filaId: filaId.toLowerCase(), versionPlano: Number(version) };

  if (operacion === "anadir_punto") {
    const posicion = textoUnico(form, "posicion");
    if (!posicion || !ENTERO.test(posicion) || Number(posicion) < 1 || Number(posicion) > MAX_PUNTOS_POR_FILA) {
      return { ok: false, mensaje: "Indica una posición válida desde el oeste. Se admiten hasta 1000 puntos por fila." };
    }
    return { ok: true, datos: { ...base, operacion, posicion: Number(posicion) } };
  }

  if (operacion !== "eliminar_punto" && operacion !== "asignar_cultivos") {
    return { ok: false, mensaje: "La operación solicitada no es válida." };
  }
  const puntoId = textoUnico(form, "punto_id");
  if (!puntoId || !UUID.test(puntoId)) {
    return { ok: false, mensaje: "Selecciona un punto de goteo válido." };
  }
  if (operacion === "eliminar_punto") {
    return { ok: true, datos: { ...base, operacion, puntoId: puntoId.toLowerCase() } };
  }

  // El marcador diferencia una selección vacía deliberada de un formulario incompleto.
  if (textoUnico(form, "seleccion_completa") !== "si") {
    return { ok: false, mensaje: "La selección de cultivos está incompleta. Vuelve a abrir el formulario." };
  }
  const valores = form.getAll("plantacion_ids");
  if (valores.length > 1000 || valores.some((valor) => typeof valor !== "string" || !UUID.test(valor))) {
    return { ok: false, mensaje: "La selección contiene un cultivo no válido." };
  }
  const plantacionIds = (valores as string[]).map((valor) => valor.toLowerCase());
  if (new Set(plantacionIds).size !== plantacionIds.length) {
    return { ok: false, mensaje: "Un cultivo se ha enviado más de una vez. Revisa la selección." };
  }
  const cultivoTexto = textoUnico(form, "cultivo_nuevo", true);
  const variedadTexto = textoUnico(form, "variedad_nueva", true);
  if (cultivoTexto === null || variedadTexto === null) {
    return { ok: false, mensaje: "El cultivo y la variedad deben ser textos únicos." };
  }
  if (cultivoTexto.length > 100 || variedadTexto.length > 100 || tieneControl(cultivoTexto) || tieneControl(variedadTexto)) {
    return { ok: false, mensaje: "El cultivo y la variedad admiten hasta 100 caracteres, en una sola línea y sin caracteres de control." };
  }
  const cultivoNuevo = cultivoTexto.trim() || null;
  const variedadNueva = variedadTexto.trim() || null;
  if (variedadNueva && !cultivoNuevo) {
    return { ok: false, mensaje: "Escribe también el nombre del cultivo nuevo al indicar una variedad." };
  }
  return { ok: true, datos: { ...base, operacion, puntoId: puntoId.toLowerCase(), plantacionIds, cultivoNuevo, variedadNueva } };
}
