import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSupabaseConfig } from "./config";

function privateResponse(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

/** Refresca cookies y valida la identidad. La autorización de datos sigue en RLS. */
export async function updateSession(request: NextRequest) {
  let response = privateResponse(NextResponse.next({ request }));
  const config = getSupabaseConfig();

  // Permite renderizar las instrucciones de configuración sin credenciales.
  if (!config) return response;

  const supabase = createServerClient<Database>(config.url, config.key, {
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        const previousCookies = response.cookies.getAll();
        response = privateResponse(NextResponse.next({ request }));
        previousCookies.forEach((cookie) => response.cookies.set(cookie));
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  let authenticated = false;
  try {
    // getUser consulta Auth. No se confía en el contenido de una cookie sin
    // verificar; getSession no se utiliza para decidir el acceso.
    const { data, error } = await supabase.auth.getUser();
    authenticated = !error && Boolean(data.user);
  } catch {
    // Ante un fallo de conexión no se concede acceso a rutas protegidas.
    authenticated = false;
  }

  const pathname = request.nextUrl.pathname;
  const protectedRoute = pathname === "/aplicacion" || pathname.startsWith("/aplicacion/");
  const needsLogin = protectedRoute && !authenticated;
  const alreadySignedIn =
    pathname === "/acceso" &&
    authenticated &&
    request.method === "GET" &&
    request.nextUrl.searchParams.get("estado") !== "error-salida";

  if (needsLogin || alreadySignedIn) {
    // Los destinos son constantes. No se aceptan URLs de retorno del usuario.
    const target = new URL(needsLogin ? "/acceso" : "/aplicacion", request.url);
    const redirected = privateResponse(NextResponse.redirect(target));
    response.cookies.getAll().forEach((cookie) => redirected.cookies.set(cookie));
    return redirected;
  }

  return privateResponse(response);
}
