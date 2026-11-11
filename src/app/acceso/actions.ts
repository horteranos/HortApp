"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type EstadoAcceso = {
  error: string | null;
  email: string;
};

export async function iniciarSesion(
  _previousState: EstadoAcceso,
  formData: FormData,
): Promise<EstadoAcceso> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const email = typeof emailValue === "string" ? emailValue.trim() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const emailForForm = email.slice(0, 254);

  if (
    email.length === 0 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length === 0 ||
    password.length > 4096
  ) {
    return {
      error: "Introduce un correo válido y la contraseña de tu cuenta del huerto.",
      email: emailForForm,
    };
  }

  if (!getSupabaseConfig()) {
    return {
      error: "La conexión del huerto todavía necesita configurarse. Revisa .env.local.",
      email: emailForForm,
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user || !data.session) {
      return {
        error:
          error?.status === 429
            ? "Se han realizado demasiados intentos. Espera unos minutos y vuelve a intentarlo."
            : "No se ha podido iniciar sesión. Revisa el correo y la contraseña e inténtalo de nuevo.",
        email: emailForForm,
      };
    }
  } catch {
    return {
      error: "No se ha podido conectar con el huerto. Comprueba tu conexión y vuelve a intentarlo.",
      email: emailForForm,
    };
  }

  revalidatePath("/aplicacion", "layout");
  redirect("/aplicacion");
}

export async function cerrarSesion(): Promise<void> {
  if (!getSupabaseConfig()) redirect("/acceso");

  let failed = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    failed = Boolean(error);
  } catch {
    failed = true;
  }

  if (failed) redirect("/acceso?estado=error-salida");
  revalidatePath("/aplicacion", "layout");
  redirect("/acceso");
}
