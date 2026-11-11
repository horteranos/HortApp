"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validarNotas, type EstadoGuardado } from "@/lib/huerto/validar-notas";
import type { Database } from "@/types/database";

type CambioDeNotas = Pick<Database["public"]["Tables"]["plantaciones"]["Update"], "notas">;

export async function guardarNotas(
  estadoAnterior: EstadoGuardado,
  formData: FormData,
): Promise<EstadoGuardado> {
  // useActionState aporta este argumento; nunca lo usamos para autorizar cambios.
  void estadoAnterior;
  const validacion = validarNotas(formData);
  if (!validacion.ok) return { estado: "error", mensaje: validacion.mensaje };

  const { plantacionId, huertoId, actualizadoEn, notas } = validacion.datos;

  try {
    const supabase = await createClient();
    const { data: { user }, error: errorSesion } = await supabase.auth.getUser();

    if (errorSesion || !user) {
      return {
        estado: "error",
        mensaje: "No se ha podido verificar tu sesión. Inicia sesión para guardar los cambios.",
      };
    }

    const { data: miembro, error: errorPermisos } = await supabase
      .from("miembros_huerto")
      .select("rol")
      .eq("huerto_id", huertoId)
      .eq("usuario_id", user.id)
      .maybeSingle();

    if (errorPermisos) {
      return {
        estado: "error",
        mensaje: "No se han podido comprobar tus permisos. Vuelve a intentarlo.",
      };
    }

    if (!miembro || !["administrador", "editor"].includes(miembro.rol)) {
      return { estado: "error", mensaje: "Tu usuario no tiene permiso para editar este huerto." };
    }

    // Solo notas procede del formulario. Las políticas RLS vuelven a comprobar
    // los permisos al escribir, incluso si la membresía acaba de cambiar.
    const cambio: CambioDeNotas = { notas };
    const { data: plantacion, error: errorGuardado } = await supabase
      .from("plantaciones")
      .update(cambio)
      .eq("id", plantacionId)
      .eq("huerto_id", huertoId)
      .eq("actualizado_en", actualizadoEn)
      .select("id,notas,actualizado_en")
      .maybeSingle();

    if (errorGuardado) {
      return {
        estado: "error",
        mensaje: errorGuardado.code === "42501"
          ? "Tu usuario no tiene permiso para guardar estos cambios. Recarga la página."
          : "No se ha podido confirmar el guardado. Recarga la página para comprobar las notas antes de reintentarlo.",
      };
    }

    if (!plantacion) {
      return {
        estado: "conflicto",
        mensaje: "No se ha guardado: el lote ha cambiado o ya no está disponible para tu usuario. Recarga la página y revisa las notas antes de reintentar.",
      };
    }

    revalidatePath("/aplicacion");
    return {
      estado: "guardado",
      mensaje: "Notas guardadas.",
      actualizadoEn: plantacion.actualizado_en,
      notas: plantacion.notas,
    };
  } catch {
    return {
      estado: "error",
      mensaje: "No se ha podido confirmar el guardado. Recarga la página para comprobar las notas antes de reintentarlo.",
    };
  }
}
