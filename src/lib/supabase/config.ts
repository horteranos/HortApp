type SupabaseConfig = { url: string; key: string };

type ConfigResult =
  | { config: SupabaseConfig; issue: null }
  | { config: null; issue: string };

function readConfig(): ConfigResult {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

  if (!rawUrl || !key) {
    return {
      config: null,
      issue:
        "Completa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local y reinicia la aplicación.",
    };
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return {
      config: null,
      issue: "La URL de Supabase no es válida. Copia la Project URL del proyecto.",
    };
  }

  // Esta entrega utiliza un proyecto alojado en Supabase, no un servidor local
  // ni un dominio personalizado. No acepta enlaces del panel de administración.
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname) ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    (url.pathname !== "" && url.pathname !== "/") ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    return {
      config: null,
      issue:
        "Utiliza la Project URL HTTPS del proyecto, con el formato https://referencia-del-proyecto.supabase.co y sin rutas adicionales.",
    };
  }

  if (!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key) || key.length > 1024) {
    return {
      config: null,
      issue:
        "La clave debe ser la Publishable key que comienza por sb_publishable_. No utilices claves secretas, service_role ni la antigua clave anon.",
    };
  }

  return { config: { url: url.origin, key }, issue: null };
}

/** Devuelve solo una configuración validada; nunca incluye valores en errores. */
export function getSupabaseConfig(): SupabaseConfig | null {
  return readConfig().config;
}

export function getSupabaseConfigIssue(): string | null {
  return readConfig().issue;
}
