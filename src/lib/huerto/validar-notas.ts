export type EstadoGuardado = {
  estado: "inicial" | "guardado" | "error" | "conflicto";
  mensaje: string;
  actualizadoEn?: string;
  notas?: string | null;
};

type DatosNotas = {
  plantacionId: string;
  huertoId: string;
  actualizadoEn: string;
  notas: string | null;
};

type ResultadoValidacion =
  | { ok: true; datos: DatosNotas }
  | { ok: false; mensaje: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA_CON_ZONA =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z|[+-](\d{2}):(\d{2}))$/;

function leerTextoUnico(formData: FormData, nombre: string): string | null {
  const valores = formData.getAll(nombre);
  return valores.length === 1 && typeof valores[0] === "string"
    ? valores[0]
    : null;
}

function esFechaValida(valor: string): boolean {
  const partes = FECHA_CON_ZONA.exec(valor);
  if (!partes) return false;

  const [, anioTexto, mesTexto, diaTexto, horaTexto, minutoTexto, segundoTexto] = partes;
  const anio = Number(anioTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);
  const hora = Number(horaTexto);
  const minuto = Number(minutoTexto);
  const segundo = Number(segundoTexto);
  const zonaHoras = Number(partes[7] ?? 0);
  const zonaMinutos = Number(partes[8] ?? 0);
  const bisiesto = anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0);
  const diasPorMes = [31, bisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  return (
    anio > 0 &&
    mes >= 1 && mes <= 12 &&
    dia >= 1 && dia <= diasPorMes[mes - 1] &&
    hora <= 23 && minuto <= 59 && segundo <= 59 &&
    zonaHoras <= 14 && zonaMinutos <= 59 &&
    (zonaHoras < 14 || zonaMinutos === 0)
  );
}

/** Valida el formulario sin consultar la sesión ni la base de datos. */
export function validarNotas(formData: FormData): ResultadoValidacion {
  const plantacionId = leerTextoUnico(formData, "plantacion_id");
  const huertoId = leerTextoUnico(formData, "huerto_id");
  const actualizadoEn = leerTextoUnico(formData, "actualizado_en");
  const notas = leerTextoUnico(formData, "notas");

  if (!plantacionId || !huertoId || !UUID.test(plantacionId) || !UUID.test(huertoId)) {
    return { ok: false, mensaje: "No se ha podido identificar el lote o el huerto. Recarga la página." };
  }

  if (!actualizadoEn || !esFechaValida(actualizadoEn)) {
    return { ok: false, mensaje: "Falta una versión válida del lote. Recarga la página antes de guardar." };
  }

  if (notas === null) {
    return { ok: false, mensaje: "Las notas deben enviarse como un único texto. Recarga la página e inténtalo de nuevo." };
  }

  if (notas.length > 4000) {
    return { ok: false, mensaje: "Las notas no pueden superar los 4000 caracteres." };
  }

  if (notas.includes("\u0000")) {
    return { ok: false, mensaje: "Las notas contienen un carácter no válido. Revisa el texto antes de guardar." };
  }

  return {
    ok: true,
    datos: {
      plantacionId,
      huertoId,
      // No convertir a Date: PostgreSQL conserva microsegundos y Date los pierde.
      actualizadoEn,
      notas: notas.trim() === "" ? null : notas,
    },
  };
}
