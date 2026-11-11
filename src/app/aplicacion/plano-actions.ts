"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validarCambioPlano, type EstadoCambioPlano } from "@/lib/huerto/validar-plano";
import type { Database } from "@/types/database";

export async function ejecutarCambioPlano(
  estadoAnterior: EstadoCambioPlano,
  formData: FormData,
): Promise<EstadoCambioPlano> {
  void estadoAnterior;
  const validacion = validarCambioPlano(formData);
  if (!validacion.ok) return { estado: "error", mensaje: validacion.mensaje };
  const cambio = validacion.datos;

  try {
    const supabase = await createClient();
    const { data: { user }, error: errorSesion } = await supabase.auth.getUser();
    if (errorSesion || !user) {
      return { estado: "error", mensaje: "No se ha podido verificar tu sesión. Inicia sesión antes de editar el plano." };
    }
    const { data: miembro, error: errorPermisos } = await supabase
      .from("miembros_huerto")
      .select("rol")
      .eq("huerto_id", cambio.huertoId)
      .eq("usuario_id", user.id)
      .maybeSingle();
    if (errorPermisos) {
      return { estado: "error", mensaje: "No se han podido comprobar tus permisos. Vuelve a intentarlo." };
    }
    const permitido = cambio.operacion === "asignar_cultivos"
      ? miembro && ["administrador", "editor"].includes(miembro.rol)
      : miembro?.rol === "administrador";
    if (!permitido) {
      return { estado: "error", mensaje: cambio.operacion === "asignar_cultivos"
        ? "Tu cuenta no tiene permiso para asignar cultivos en este huerto."
        : "Solo un administrador del huerto puede añadir o eliminar puntos de goteo." };
    }

    const args: Database["public"]["Functions"]["editar_plano"]["Args"] = {
      p_huerto_id: cambio.huertoId,
      p_fila_id: cambio.filaId,
      p_version: cambio.versionPlano,
      p_operacion: cambio.operacion,
    };
    if (cambio.operacion === "anadir_punto") args.p_posicion = cambio.posicion;
    else args.p_punto_id = cambio.puntoId;
    if (cambio.operacion === "asignar_cultivos") {
      args.p_plantacion_ids = cambio.plantacionIds;
      args.p_cultivo = cambio.cultivoNuevo;
      args.p_variedad = cambio.variedadNueva;
    }

    // La RPC verifica de nuevo auth.uid(), rol, pertenencia y versión, y aplica
    // todos los cambios de forma atómica. No usa ninguna clave privilegiada.
    const { data, error } = await supabase.rpc("editar_plano", args);
    if (error) {
      if (["PGRST202", "42883", "42703"].includes(error.code)) {
        return { estado: "error", mensaje: "Falta la actualización del plano en Supabase. Ejecuta supabase/04_gestion_plano.sql y vuelve a actualizar la página." };
      }
      if (["40001", "P0002", "23503", "23505"].includes(error.code)) {
        return { estado: "conflicto", mensaje: "El plano o los cultivos de esta fila han cambiado. Conserva lo que necesites, cierra el formulario, pulsa Actualizar y ábrelo de nuevo." };
      }
      if (error.code === "42501") {
        return { estado: "error", mensaje: "Tu cuenta ya no tiene permiso para realizar este cambio. Actualiza el plano." };
      }
      if (error.code === "22023") {
        return { estado: "error", mensaje: "Revisa la posición y los cultivos seleccionados. Deben pertenecer a esta fila y estar presentes. Actualiza el plano antes de reintentar." };
      }
      return { estado: "error", mensaje: "No se ha podido confirmar el cambio. Actualiza el plano y comprueba el resultado antes de reintentarlo." };
    }

    if (!data || !Number.isInteger(data.version_plano) || data.version_plano <= cambio.versionPlano || typeof data.punto_id !== "string") {
      return { estado: "error", mensaje: "La respuesta del guardado no se ha podido comprobar. Actualiza el plano antes de repetir la operación." };
    }
    revalidatePath("/aplicacion");
    const mensaje = cambio.operacion === "anadir_punto"
      ? "Punto de goteo añadido."
      : cambio.operacion === "eliminar_punto"
        ? "Punto eliminado. Los cultivos y sus notas se conservan."
        : "Cultivos del punto guardados.";
    return {
      estado: "guardado", mensaje,
      versionPlano: data.version_plano,
      puntoId: data.punto_id,
      ...(data.plantacion_id ? { plantacionId: data.plantacion_id } : {}),
    };
  } catch {
    return { estado: "error", mensaje: "No se ha podido confirmar el cambio. Comprueba la conexión y actualiza el plano antes de repetirlo." };
  }
}
