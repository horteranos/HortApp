import assert from "node:assert/strict";
import test from "node:test";
import {
  describirUbicacion,
  formatearCantidad,
  formatearFecha,
} from "../src/lib/huerto/formato";
import type { FilaHuerto } from "../src/types/aplicacion";

test("una fecha aproximada conserva su incertidumbre y el día del calendario", () => {
  assert.equal(formatearFecha("2026-10-18", "aproximada"), "Aprox. 18/10/2026");
  assert.equal(formatearFecha("2026-10-31", "exacta"), "31/10/2026");
  assert.equal(formatearFecha(null, "desconocida"), "Fecha no confirmada");
  assert.equal(formatearFecha("2026-02-30", "exacta"), "Fecha no válida");
});

test("un número de plantas desconocido no se convierte en cero ni en goteros", () => {
  assert.equal(
    formatearCantidad({ cantidad_declarada: null, unidad_cantidad: "plantas" }),
    "Cantidad sin confirmar",
  );
  assert.equal(
    formatearCantidad({ cantidad_declarada: 1, unidad_cantidad: "arboles" }),
    "1 árbol",
  );
});

test("un destino previsto no se presenta como ubicación actual", () => {
  const filas: FilaHuerto[] = [
    {
      id: "fila-5",
      huerto_id: "huerto",
      numero: 5,
      codigo: "F5",
      goteros_previstos: 18,
      orientacion: "este-oeste",
      separacion_goteros_cm: 25,
      notas: null,
    },
  ];
  assert.equal(
    describirUbicacion(
      {
        fila_id: null,
        fila_prevista_id: "fila-5",
        ubicacion_texto: null,
        estado: "pendiente_trasplante",
      },
      filas,
    ),
    "Destino previsto: F5. Ubicación actual sin confirmar.",
  );
});

test("un lote exterior conserva su descripción y no recibe una fila ficticia", () => {
  assert.equal(
    describirUbicacion(
      {
        fila_id: null,
        fila_prevista_id: null,
        ubicacion_texto: "Fuera de F6, en el extremo oeste.",
        estado: "presente",
      },
      [],
    ),
    "Fuera de F6, en el extremo oeste.",
  );
});
