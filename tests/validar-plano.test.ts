import test from "node:test";
import assert from "node:assert/strict";
import { validarCambioPlano } from "../src/lib/huerto/validar-plano";

const huerto = "00000000-0000-4000-8000-000000000001";
const fila = "10000000-0000-4000-8000-000000000006";
const punto = "30000000-0000-4000-8000-000000000001";
const cultivo = "20000000-0000-4000-8000-000000000001";
function formulario(operacion: string) {
  const form = new FormData();
  Object.entries({ huerto_id: huerto, fila_id: fila, version_plano: "0", operacion }).forEach(([clave, valor]) => form.set(clave, valor));
  return form;
}
function asignacion() {
  const form = formulario("asignar_cultivos");
  form.set("punto_id", punto);
  form.set("seleccion_completa", "si");
  return form;
}

test("acepta insertar un punto al oeste sin convertir la versión cero en ausencia", () => {
  const form = formulario("anadir_punto");
  form.set("posicion", "1");
  const result = validarCambioPlano(form);
  assert.ok(result.ok);
  assert.equal(result.datos.versionPlano, 0);
  assert.equal(result.datos.operacion, "anadir_punto");
});

test("no acepta índices negativos, decimales, científicos ni fuera del límite", () => {
  for (const posicion of ["-1", "0", "1.5", "1e2", "1001", "", " 1"]) {
    const form = formulario("anadir_punto");
    form.set("posicion", posicion);
    assert.equal(validarCambioPlano(form).ok, false, posicion);
  }
});

test("rechaza versiones ausentes, duplicadas o no enteras antes de enviar una escritura", () => {
  for (const version of ["", "-1", "1.1", "2147483647", "0 OR 1=1"]) {
    const form = formulario("eliminar_punto");
    form.set("punto_id", punto);
    form.set("version_plano", version);
    assert.equal(validarCambioPlano(form).ok, false);
  }
  const form = formulario("eliminar_punto");
  form.set("punto_id", punto);
  form.append("version_plano", "1");
  assert.equal(validarCambioPlano(form).ok, false);
});

test("eliminar identifica el punto por UUID y no admite huertos o puntos manipulados", () => {
  const form = formulario("eliminar_punto");
  form.set("punto_id", punto);
  assert.ok(validarCambioPlano(form).ok);
  form.set("punto_id", "1");
  assert.equal(validarCambioPlano(form).ok, false);
  form.set("punto_id", punto);
  form.append("huerto_id", huerto);
  assert.equal(validarCambioPlano(form).ok, false);
});

test("distingue retirar todas las asignaciones de omitir accidentalmente la selección", () => {
  const form = asignacion();
  const result = validarCambioPlano(form);
  assert.ok(result.ok && result.datos.operacion === "asignar_cultivos");
  assert.deepEqual(result.datos.plantacionIds, []);
  form.delete("seleccion_completa");
  assert.equal(validarCambioPlano(form).ok, false);
});

test("admite varios cultivos pero rechaza duplicados e identificadores inválidos", () => {
  const form = asignacion();
  form.append("plantacion_ids", cultivo);
  form.append("plantacion_ids", "20000000-0000-4000-8000-000000000002");
  const result = validarCambioPlano(form);
  assert.ok(result.ok && result.datos.operacion === "asignar_cultivos");
  assert.equal(result.datos.plantacionIds.length, 2);
  form.append("plantacion_ids", cultivo);
  assert.equal(validarCambioPlano(form).ok, false);
  form.set("plantacion_ids", "cultivo-inexistente");
  assert.equal(validarCambioPlano(form).ok, false);
});

test("el nombre nuevo se normaliza sin inventar fecha, cantidad ni otros datos del lote", () => {
  const form = asignacion();
  form.set("cultivo_nuevo", "  Cebolla  ");
  form.set("variedad_nueva", " Babosa ");
  form.set("fecha_inicio", "2026-11-01");
  form.set("cantidad_declarada", "15");
  form.set("rol", "administrador");
  const result = validarCambioPlano(form);
  assert.ok(result.ok && result.datos.operacion === "asignar_cultivos");
  assert.equal(result.datos.cultivoNuevo, "Cebolla");
  assert.equal(result.datos.variedadNueva, "Babosa");
  assert.equal("fecha_inicio" in result.datos, false);
  assert.equal("cantidad_declarada" in result.datos, false);
  assert.equal("rol" in result.datos, false);
});

test("rechaza variedad sin cultivo, campos duplicados, archivos y texto nulo o excesivo", () => {
  const form = asignacion();
  form.set("variedad_nueva", "Rondo");
  assert.equal(validarCambioPlano(form).ok, false);
  form.set("cultivo_nuevo", "Guisante");
  form.append("cultivo_nuevo", "Cebolla");
  assert.equal(validarCambioPlano(form).ok, false);
  for (const text of ["x".repeat(101), "Guisante\u0000Rondo", "Guisante\nRondo"]) {
    form.set("cultivo_nuevo", text);
    assert.equal(validarCambioPlano(form).ok, false);
  }
  form.set("cultivo_nuevo", new File(["Guisante"], "cultivo.txt"));
  assert.equal(validarCambioPlano(form).ok, false);
});

test("solo admite las operaciones implementadas", () => {
  assert.equal(validarCambioPlano(formulario("cambiar_rol")).ok, false);
});
