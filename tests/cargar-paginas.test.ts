import test from "node:test";
import assert from "node:assert/strict";
import { cargarPaginas } from "../src/lib/huerto/cargar-paginas";

test("carga todas las páginas sin truncar el plano al límite de una petición", async () => {
  const registros = ["p1", "p2", "p3", "p4", "p5"];
  const rangos: number[][] = [];
  const resultado = await cargarPaginas(async (desde, hasta) => {
    rangos.push([desde, hasta]);
    return { data: registros.slice(desde, hasta + 1), error: null };
  }, 2);
  assert.deepEqual(resultado.data, registros);
  assert.deepEqual(rangos, [[0, 1], [2, 3], [4, 5], [5, 6]]);
  assert.equal(resultado.error, null);
});

test("respeta un límite del servidor inferior al tamaño de página pedido", async () => {
  const registros = Array.from({ length: 750 }, (_, numero) => numero);
  const resultado = await cargarPaginas(async (desde, hasta) => ({
    data: registros.slice(desde, Math.min(hasta + 1, desde + 100)),
    error: null,
  }));
  assert.deepEqual(resultado.data, registros);
  assert.equal(resultado.error, null);
});

test("un error en una página no se presenta como un plano parcial válido", async () => {
  const error = new Error("conexión interrumpida");
  const resultado = await cargarPaginas(async (desde) => desde === 0
    ? { data: [1, 2], error: null }
    : { data: null, error }, 2);
  assert.deepEqual(resultado.data, []);
  assert.equal(resultado.error, error);
});

test("una fila vacía puede consultarse después de eliminar su último punto", async () => {
  const resultado = await cargarPaginas(async () => ({ data: [], error: null }), 2);
  assert.deepEqual(resultado, { data: [], error: null });
});
