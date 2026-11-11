import Link from "next/link";
import { redirect } from "next/navigation";
import { PanelHuerto } from "@/components/huerto/PanelHuerto";
import { cargarHuerto } from "@/lib/huerto/cargar";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/app/acceso/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AplicacionReal() {
  if (!getSupabaseConfig()) redirect("/acceso");
  const supabase = await createClient();
  // La autorización de esta página no depende solo del proxy; RLS se aplica
  // además en cada consulta y escritura de la sesión del usuario.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/acceso");
  const resultado = await cargarHuerto(supabase, user.id);
  if (resultado.estado !== "listo") {
    const sinAcceso = resultado.estado === "sin_acceso";
    return (
      <main className="auth-layout">
        <section className="auth-card" aria-labelledby="estado-title">
          <span className="brand-mark auth-mark" aria-hidden="true">✳</span>
          <p className="eyebrow">SISTEMA MONITORIZACIÓN</p>
          <h1 id="estado-title">{sinAcceso ? "Tu cuenta aún no tiene acceso" : "No se han podido cargar los datos"}</h1>
          <p>{sinAcceso
            ? "El administrador del huerto debe dar acceso a esta cuenta. Comprueba que has entrado con el correo al que se asignó el permiso."
            : resultado.mensaje}</p>
          <p className="account-email">{user.email}</p>
          <div className="action-row">
            <Link href="/aplicacion" className="primary-button">Volver a comprobar</Link>
            <form action={cerrarSesion}><button className="secondary-button" type="submit">Cerrar sesión</button></form>
          </div>
          <Link href="/prototipo" className="auth-back-link">Consultar el prototipo de la Etapa 1</Link>
        </section>
      </main>
    );
  }
  return <PanelHuerto datos={resultado.datos} correo={user.email ?? ""} />;
}
