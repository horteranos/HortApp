/** Crea un UUID v4 de forma criptograficamente segura, incluso en HTTP local. */
export function generarUUID(cryptoApi?: Pick<Crypto, 'getRandomValues'> & Partial<Pick<Crypto, 'randomUUID'>>): string;
