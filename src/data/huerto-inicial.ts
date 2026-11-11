import datosJson from "./huerto-inicial.json";
import type { DatosHuerto } from "@/types/huerto";

// Solo para el prototipo. No hay persistencia en este archivo.
// La estructura se valida adicionalmente con: npm test.
export const huertoInicial = datosJson as DatosHuerto;
