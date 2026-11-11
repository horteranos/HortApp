import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/aplicacion",
    name: "Sistema Monitorización — Huerto",
    short_name: "Mi Huerto",
    description: "Gestión privada de cultivos, riego, calendario y meteorología.",
    start_url: "/aplicacion",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f6f8f1",
    theme_color: "#1c3d2f",
    lang: "es",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
