import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const datos = JSON.parse(readFileSync(new URL("../src/data/huerto-inicial.json", import.meta.url), "utf8"));
const filas = datos.filas;
const todosLosCultivos = filas.flatMap((f) => f.cultivos);

test("El huerto tiene seis filas y 109 goteros", () => {
  assert.deepEqual(filas.map((f) => f.id), ["F1", "F2", "F3", "F4", "F5", "F6"]);
  assert.deepEqual(filas.map((f) => f.puntosRiego), [19, 18, 18, 18, 18, 18]);
  assert.equal(filas.reduce((n, f) => n + f.puntosRiego, 0), 109);
  assert.equal(datos.distanciaGoterosCentimetros, 25);
});

test("La zona de guisantes se basa en nueve goteros, no en nueve plantas", () => {
  assert.deepEqual(datos.zonasConocidas.map((z) => [z.filaId, z.desdePunto, z.hastaPunto, z.lado]), [["F6", 1, 9, "oeste"]]);
  const guisantes = todosLosCultivos.find((c) => c.id === "f6-guisantes");
  assert.equal(guisantes.cantidad, null);
});

test("El limonero esta fuera de F6, en el lado oeste", () => {
  assert.deepEqual(datos.arbolesExterior.map((a) => [a.nombre,a.cercaDeFila,a.lado,a.fueraDeFila]), [["Limonero","F6","oeste",true]]);
});

test("La copia histórica de la Etapa 1 conserva las cebollas pendientes de entonces", () => {
  const cebollas = todosLosCultivos.find((c) => c.id === "f5-cebollas-babosa");
  assert.equal(cebollas.cantidad, 15);
  assert.equal(cebollas.unidadCantidad, "planteles");
  assert.equal(cebollas.estado, "pendiente");
});

test("No se asignan goteros concretos a cultivos sin ubicacion confirmada", () => {
  for (const cultivo of todosLosCultivos) {
    assert.equal(Object.hasOwn(cultivo, "punto"), false);
    assert.equal(Object.hasOwn(cultivo, "numeroGotero"), false);
  }
  const ids = todosLosCultivos.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("Las fechas desconocidas son null, y las aproximadas estan marcadas", () => {
  for (const cultivo of todosLosCultivos) {
    if (cultivo.fecha === null) {
      assert.equal(cultivo.precisionFecha, null);
    } else {
      assert.match(cultivo.fecha, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(["exacta", "aproximada"].includes(cultivo.precisionFecha));
    }
    assert.ok(cultivo.cantidad === null || (Number.isInteger(cultivo.cantidad) && cultivo.cantidad > 0));
  }
});
