"use client";

import { useSyncExternalStore } from "react";

const sinSuscripcion = () => () => {};

/** Si React no llega a hidratar, el aviso de HTML permanece visible. */
export function EstadoInteractividad() {
  const activo = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  if (process.env.NODE_ENV !== "development" || activo) return null;
  return (
    <p className="feedback-error" role="status" data-estado-interactividad="pendiente">
      Controles interactivos pendientes de activar. Si este aviso no desaparece,
      Safari ha cargado el plano pero no ha iniciado React. Revisa la direccion
      de red del Mac y los mensajes del servidor Next.js.
    </p>
  );
}
