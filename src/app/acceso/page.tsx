import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseConfigIssue } from "@/lib/supabase/config";
import FormularioAcceso from "./FormularioAcceso";
import { cerrarSesion } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Acceso | Sistema Monitorización",
};

type Props = {
  searchParams: Promise<{ estado?: string | string[] }>;
};

export default async function Acceso({ searchParams }: Props) {
  const configIssue = getSupabaseConfigIssue();
  const { estado } = await searchParams;
  const signOutFailed = estado === "error-salida";

  return (
    <main className="auth-layout">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">SISTEMA MONITORIZACIÓN</p>
        {configIssue ? (
          <>
            <h1 id="auth-title">Configurar la conexión</h1>
            <p>{configIssue}</p>
            <ol>
              <li>Copia <code>.env.example</code> como <code>.env.local</code> en la carpeta del proyecto.</li>
              <li>Introduce la Project URL y la Publishable key de tu proyecto de Supabase.</li>
              <li>Guarda el archivo y reinicia <code>npm run dev</code>.</li>
            </ol>
            <p>La Publishable key comienza por <code>sb_publishable_</code>.</p>
          </>
        ) : (
          <>
            <h1 id="auth-title">Acceder al huerto</h1>
            <p>Entra con el correo y la contraseña de tu cuenta del huerto.</p>
            {signOutFailed && (
              <div className="feedback-error" role="alert">
                <p>No se ha podido cerrar la sesión. Vuelve a intentarlo.</p>
                <form action={cerrarSesion}>
                  <button type="submit" className="primary-button">Reintentar cierre de sesión</button>
                </form>
              </div>
            )}
            <FormularioAcceso />
          </>
        )}
        <Link href="/prototipo" className="auth-back-link">Ver el prototipo</Link>
      </section>
    </main>
  );
}
