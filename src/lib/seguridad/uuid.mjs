/**
 * UUID v4 para navegadores HTTPS y para pruebas HTTP desde una IP local.
 * `crypto.randomUUID()` solo existe en contextos seguros, pero
 * `crypto.getRandomValues()` sigue disponible en HTTP.
 * No se utilizan Math.random() ni IDs previsibles.
 */
export function generarUUID(cryptoApi = globalThis.crypto) {
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('El navegador no permite crear identificadores seguros. Prueba con Safari actualizado o con HTTPS.');
  }
  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // UUID version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0,4).join('')}-${hex.slice(4,6).join('')}-${hex.slice(6,8).join('')}-${hex.slice(8,10).join('')}-${hex.slice(10).join('')}`;
}
