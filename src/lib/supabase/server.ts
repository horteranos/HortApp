import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { getSupabaseConfig, getSupabaseConfigIssue } from "./config";

/** Un cliente por petición, con la sesión del usuario y las políticas RLS. */
export async function createClient() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(getSupabaseConfigIssue() ?? "Falta configurar Supabase.");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.key, {
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Un Server Component no puede escribir cookies. El proxy renueva
          // la sesión antes de renderizarlo. Las Server Actions sí escriben.
        }
      },
    },
  });
}
