import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";
import { origenesLanSeguros } from "./src/lib/configuracion/origenes-desarrollo";

const nextConfig: NextConfig = {
  // Next.js 16 restringe los recursos de desarrollo a localhost salvo
  // excepciones explicitas. Autorizar solo IP privadas del Mac permite
  // usar los componentes interactivos desde Safari en la misma Wi-Fi.
  // Esta excepcion no se aplica en produccion/Vercel.
  ...(process.env.NODE_ENV === 'development'
    ? { allowedDevOrigins: origenesLanSeguros(networkInterfaces()) }
    : {}),
  reactStrictMode: true,
  async headers() {
    return [
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }, { key: 'Service-Worker-Allowed', value: '/' }] },
      { source: '/aplicacion/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/acceso', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
    ];
  },
  // TypeScript 5 conserva la API del compilador; mantener esa vía evita
  // depender del transporte de salida del proceso CLI experimental de Next.
  experimental: {
    useTypeScriptCli: false,
    // La foto de hasta 5 MB viaja en base64 a una Server Action.
    // Se amplía el límite de 1 MB solo lo imprescindible.
    serverActions: { bodySizeLimit: '8mb' },
  },
};

export default nextConfig;
