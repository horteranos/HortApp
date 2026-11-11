import type { Metadata } from "next";
import "./globals.css";
import "./cuaderno.css";
import "./monitor.css";
import "./gestion.css";
import "./pwa.css";
import { PWASetup } from "@/components/pwa/PWASetup";

export const metadata: Metadata = {
  title: "Sistema Monitorización | Gestor de huerto",
  description: "Plano, cultivos, calendario, diario y meteorología de tu huerto.",
  applicationName: "Sistema Monitorización",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Mi Huerto", statusBarStyle: "default" },
  icons: { apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }], icon: [{ url: "/icons/icon-192.png", sizes: "192x192" }, { url: "/icons/icon-512.png", sizes: "512x512" }] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}<PWASetup /></body>
    </html>
  );
}
