"use client";

import { useEffect, useSyncExternalStore } from "react";

/** Sin permisos ni llamadas de datos: solo registro de SW y estado de conectividad. */
export function PWASetup() {
  const online = useSyncExternalStore(
    (callback) => {
      window.addEventListener("online", callback);
      window.addEventListener("offline", callback);
      return () => {
        window.removeEventListener("online", callback);
        window.removeEventListener("offline", callback);
      };
    },
    () => navigator.onLine,
    () => true,
  );
  useEffect(() => {
    if ("serviceWorker" in navigator && (window.isSecureContext || window.location.hostname === "localhost")) {
      // Dejar SW fuera de desarrollo facilita recargar código y evita caché antigua.
      if (process.env.NODE_ENV === "production") {
        void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err: unknown) => {
          console.warn("No se pudo registrar el service worker:", err);
        });
      }
    }
  }, []);
  return !online ? <div className="pwa-connection" role="status">Sin conexión: los cambios requieren Internet y no se guardarán sin ella.</div> : null;
}
