import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database";
import type { ResultadoCargaHuerto } from "../../types/aplicacion";
import { ordenarPlantaciones } from "./formato";
import { cargarPaginas } from "./cargar-paginas";
import { hoyEnZona } from "./cuaderno";
import type { Cuaderno } from "../../types/cuaderno";

/**
 * Lee exclusivamente la base de datos con la sesión del usuario.
 * El cliente debe proceder de la integración SSR; nunca de una service_role.
 * No hay datos locales de respaldo: una avería se muestra como avería.
 */
export async function cargarHuerto(
  cliente: SupabaseClient<Database>,
  usuarioId: string,
): Promise<ResultadoCargaHuerto> {
  if (!usuarioId.trim()) return { estado: "sin_acceso" };

  try {
    const huertoRespuesta = await cliente
      .from("huertos")
      .select("*")
      .eq("codigo", "huerto-alboraya")
      .maybeSingle();

    if (huertoRespuesta.error) {
      return {
        estado: "error",
        mensaje:
          "No se ha podido consultar el huerto en Supabase. Comprueba la conexión y la instalación del esquema de la Etapa 2.2.",
      };
    }
    const huertoInicial = huertoRespuesta.data;
    // RLS no revela si el huerto no existe o si este usuario no puede verlo.
    if (!huertoInicial) return { estado: "sin_acceso" };
    let huerto = huertoInicial;

    const miembroRespuesta = await cliente
      .from("miembros_huerto")
      .select("*")
      .eq("huerto_id", huerto.id)
      .eq("usuario_id", usuarioId)
      .maybeSingle();

    if (miembroRespuesta.error) {
      return {
        estado: "error",
        mensaje:
          "No se han podido consultar los permisos de este usuario. Revisa la configuración de acceso del proyecto.",
      };
    }
    const miembro = miembroRespuesta.data;
    if (!miembro) return { estado: "sin_acceso" };

    const filasRespuesta = await cliente.from("filas").select("*").eq("huerto_id", huerto.id).order("numero");
    if (filasRespuesta.error) {
      return {
        estado: "error",
        mensaje: "No se han podido consultar las filas del huerto.",
      };
    }
    let filas = filasRespuesta.data ?? [];
    // Leer la versión antes y después evita mezclar números de puntos de una
    // versión con asociaciones de otra cuando dos sesiones cambian el plano.
    for (let intento = 0; intento < 2; intento++) {
      const [puntosRespuesta, plantacionesRespuesta, asignacionesRespuesta] = await Promise.all([
        cargarPaginas((desde, hasta) => cliente.from("puntos_riego").select("*").eq("huerto_id", huerto.id)
          .order("fila_id").order("numero_desde_oeste").order("id").range(desde, hasta)),
        cargarPaginas((desde, hasta) => cliente.from("plantaciones").select("*").eq("huerto_id", huerto.id)
          .order("cultivo").order("id").range(desde, hasta)),
        cargarPaginas((desde, hasta) => cliente.from("plantacion_puntos").select("*").eq("huerto_id", huerto.id)
          .order("plantacion_id").order("punto_id").range(desde, hasta)),
      ]);
      if (puntosRespuesta.error || plantacionesRespuesta.error || asignacionesRespuesta.error) {
        return { estado: "error", mensaje: "No se han podido cargar todos los datos del huerto. Actualiza la página para volver a intentarlo." };
      }
      if (filas.some((fila) => typeof fila.version_plano === "number")) {
        const comprobacion = await cliente.from("filas").select("*").eq("huerto_id", huerto.id).order("numero");
        if (comprobacion.error) return { estado: "error", mensaje: "No se ha podido comprobar la versión del plano." };
        const filasActuales = comprobacion.data ?? [];
        const coherente = filas.length === filasActuales.length && filas.every((fila) =>
          filasActuales.some((actual) => actual.id === fila.id && actual.version_plano === fila.version_plano));
        filas = filasActuales;
        if (!coherente) continue;
      }
      let cuaderno: Cuaderno = {estado: "pendiente", eventos: [], ocupaciones: []};
      if (typeof huerto.version_cuaderno === "number") {
        const [eventos, ocupaciones] = await Promise.all([
          cargarPaginas((desde,hasta)=>cliente.from("eventos_cultivo").select("*").eq("huerto_id",huerto.id).order("fecha").order("id").range(desde,hasta)),
          cargarPaginas((desde,hasta)=>cliente.from("ocupaciones_cultivo").select("*").eq("huerto_id",huerto.id).order("registrado_en").order("id").range(desde,hasta)),
        ]);
        if(eventos.error||ocupaciones.error) return {estado:"error",mensaje:"No se ha podido cargar el calendario o el historial. Comprueba la migracion 06 y vuelve a actualizar; no se han sustituido datos por listas vacias."};
        const comprobacion=await cliente.from("huertos").select("*").eq("id",huerto.id).single();
        if(comprobacion.error||!comprobacion.data) return {estado:"error",mensaje:"No se ha podido comprobar la version del cuaderno."};
        const cambio=comprobacion.data.version_cuaderno!==huerto.version_cuaderno;
        huerto=comprobacion.data;
        if(cambio) continue;
        cuaderno={estado:"listo",eventos:eventos.data,ocupaciones:ocupaciones.data};
      }
      const ordenFilas = new Map(filas.map((fila) => [fila.id, fila.numero]));
      const puntos = [...puntosRespuesta.data].sort(
        (a, b) =>
          (ordenFilas.get(a.fila_id) ?? Number.MAX_SAFE_INTEGER) -
            (ordenFilas.get(b.fila_id) ?? Number.MAX_SAFE_INTEGER) ||
          a.numero_desde_oeste - b.numero_desde_oeste,
      );

      return {
        estado: "listo",
        datos: {
          huerto,
          rol: miembro.rol,
          filas,
          puntos,
          plantaciones: ordenarPlantaciones(plantacionesRespuesta.data, filas),
          asignaciones: asignacionesRespuesta.data,
          usuarioId,
          cuaderno,
          hoy: hoyEnZona(huerto.zona_horaria),
        },
      };
    }
    return { estado: "error", mensaje: "El plano está cambiando desde otra sesión. Espera a que termine y actualiza la página." };
  } catch {
    return {
      estado: "error",
      mensaje:
        "No se ha podido conectar con Supabase. Comprueba la conexión a Internet y vuelve a cargar la página.",
    };
  }
}
