import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getSupabaseConfig, getSupabaseConfigIssue } from "../src/lib/supabase/config";

const initialUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const initialKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const validUrl = "https://abcdefghijklmnopqrst.supabase.co";
const validKey = "sb_publishable_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefgh";

afterEach(() => {
  if (initialUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = initialUrl;
  if (initialKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = initialKey;
});

function setConfig(url: string, key: string) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = key;
}

test("La ausencia de variables devuelve un estado de configuración, no una excepción", () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert.equal(getSupabaseConfig(), null);
  assert.match(getSupabaseConfigIssue() ?? "", /\.env\.local/);
});

test("Acepta una URL alojada HTTPS y una clave publicable; normaliza espacios y barra final", () => {
  setConfig(` ${validUrl}/ `, ` ${validKey} `);
  assert.deepEqual(getSupabaseConfig(), { url: validUrl, key: validKey });
  assert.equal(getSupabaseConfigIssue(), null);
});

test("Rechaza claves secretas, service_role, JWT heredado y valores incompletos", () => {
  const rejected = [
    "sb_secret_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    "service_role",
    "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.firma",
    "sb_publishable_...",
    "sb_publishable_corta",
  ];
  for (const key of rejected) {
    setConfig(validUrl, key);
    assert.equal(getSupabaseConfig(), null);
    assert.ok(getSupabaseConfigIssue());
    if (key !== "service_role") {
      assert.ok(!getSupabaseConfigIssue()?.includes(key), "El error no debe mostrar la clave introducida");
    }
  }
});

test("Rechaza HTTP, credenciales embebidas, rutas, parámetros y enlaces del panel", () => {
  for (const url of [
    validUrl.replace("https:", "http:"),
    "https://supabase.com/dashboard/project/abcdefghijklmnopqrst",
    `${validUrl}/rest/v1`,
    `${validUrl}?token=privado`,
    `${validUrl}#fragmento`,
    "https://usuario:contrasena@abcdefghijklmnopqrst.supabase.co",
    "https://abcdefghijklmnopqrst.supabase.co:8443",
    "https://abcdefghijklmnopqrst.supabase.co.ejemplo.test",
    "esto no es una URL",
  ]) {
    setConfig(url, validKey);
    assert.equal(getSupabaseConfig(), null);
    assert.ok(getSupabaseConfigIssue());
    assert.ok(!getSupabaseConfigIssue()?.includes(url));
  }
});
