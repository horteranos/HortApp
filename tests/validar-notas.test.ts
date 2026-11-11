import assert from "node:assert/strict";
import test from "node:test";
import { validarNotas } from "../src/lib/huerto/validar-notas";

const PLANTACION_ID = "20000000-0000-4000-8000-000000000001";
const HUERTO_ID = "00000000-0000-4000-8000-000000000001";
const VERSION = "2026-11-01T11:23:45.123456+00:00";

function formulario(cambios: Record<string, string> = {}): FormData {
  const datos = new FormData();
  for (const [nombre, valor] of Object.entries({
    plantacion_id: PLANTACION_ID,
    huerto_id: HUERTO_ID,
    actualizado_en: VERSION,
    notas: "Revisar el riego al volver.",
    ...cambios,
  })) datos.set(nombre, valor);
  return datos;
}

test("conserva la versión con microsegundos para detectar ediciones simultáneas", () => {
  const resultado = validarNotas(formulario());
  assert.equal(resultado.ok, true);
  if (!resultado.ok) return;
  assert.equal(resultado.datos.actualizadoEn, VERSION);
  assert.equal(resultado.datos.plantacionId, PLANTACION_ID);
  assert.equal(resultado.datos.huertoId, HUERTO_ID);
});

test("no acepta identificadores manipulados ni campos ausentes", () => {
  for (const campo of ["plantacion_id", "huerto_id"]) {
    for (const valor of ["", "otro-huerto", `${HUERTO_ID},id.not.is.null`]) {
      assert.equal(validarNotas(formulario({ [campo]: valor })).ok, false);
    }
    const datos = formulario();
    datos.delete(campo);
    assert.equal(validarNotas(datos).ok, false);
  }
});

test("rechaza campos duplicados para evitar formularios ambiguos", () => {
  for (const campo of ["plantacion_id", "huerto_id", "actualizado_en", "notas"]) {
    const datos = formulario();
    datos.append(campo, "otro valor");
    assert.equal(validarNotas(datos).ok, false);
  }
});

test("no convierte un archivo enviado en notas en texto", () => {
  const datos = formulario();
  datos.set("notas", new Blob(["contenido"], { type: "text/plain" }), "notas.txt");
  assert.equal(validarNotas(datos).ok, false);
});

test("diferencia borrar las notas de omitir el campo accidentalmente", () => {
  for (const texto of ["", " \t\n "]) {
    const resultado = validarNotas(formulario({ notas: texto }));
    assert.equal(resultado.ok, true);
    if (resultado.ok) assert.equal(resultado.datos.notas, null);
  }
  const datos = formulario();
  datos.delete("notas");
  assert.equal(validarNotas(datos).ok, false);
});

test("conserva el texto y los saltos de línea de una nota no vacía", () => {
  const notas = "  Menta: revisar.\n\nEspárrago: sin cambios.  ";
  const resultado = validarNotas(formulario({ notas }));
  assert.equal(resultado.ok, true);
  if (resultado.ok) assert.equal(resultado.datos.notas, notas);
});

test("acepta 4000 caracteres y rechaza 4001 sin truncar silenciosamente", () => {
  assert.equal(validarNotas(formulario({ notas: "a".repeat(4000) })).ok, true);
  const resultado = validarNotas(formulario({ notas: "a".repeat(4001) }));
  assert.equal(resultado.ok, false);
  if (!resultado.ok) assert.match(resultado.mensaje, /4000/);
});

test("rechaza el carácter nulo que PostgreSQL no admite en texto", () => {
  assert.equal(validarNotas(formulario({ notas: "nota\u0000oculta" })).ok, false);
});

test("acepta versiones ISO con zona y distinta precisión sin reformatearlas", () => {
  for (const version of [
    "2026-11-01T11:23:45Z",
    "2026-11-01T11:23:45.1+01:00",
    "2026-11-01T11:23:45.123456-03:30",
    "2028-02-29T00:00:00+00:00",
  ]) {
    const resultado = validarNotas(formulario({ actualizado_en: version }));
    assert.equal(resultado.ok, true, version);
    if (resultado.ok) assert.equal(resultado.datos.actualizadoEn, version);
  }
});

test("rechaza fechas normalizadas, versiones sin zona y tokens incompletos", () => {
  for (const version of [
    "",
    "now()",
    "2026-11-01",
    "2026-11-01T11:23:45",
    "2026-02-29T11:23:45Z",
    "2026-02-30T11:23:45Z",
    "2026-13-01T11:23:45Z",
    "2026-11-00T11:23:45Z",
    "2026-11-01T24:00:00Z",
    "2026-11-01T11:60:00Z",
    "2026-11-01T11:23:60Z",
    "2026-11-01T11:23:45+15:00",
    "2026-11-01T11:23:45+01:60",
    "2026-11-01T11:23:45.1234567+00:00",
  ]) assert.equal(validarNotas(formulario({ actualizado_en: version })).ok, false, version);
});

test("ignora campos ajenos a la edición de notas", () => {
  const datos = formulario({ rol: "administrador", cultivo: "otro", usuario_id: HUERTO_ID });
  const resultado = validarNotas(datos);
  assert.equal(resultado.ok, true);
  if (resultado.ok) {
    assert.deepEqual(Object.keys(resultado.datos).sort(), ["actualizadoEn", "huertoId", "notas", "plantacionId"].sort());
  }
});
