/**
 * Solo IP privadas IPv4 de las interfaces locales para pruebas desde iPhone.
 * No se aceptan origenes arbitrarios ni comodines.
 */
type InterfazIPv4 = {address: string; family: string | number; internal?: boolean};
export function origenesLanSeguros(redes: Record<string, readonly InterfazIPv4[] | undefined>): string[] {
  const ips = new Set<string>();
  for (const interfaces of Object.values(redes)) {
    for (const red of interfaces ?? []) {
      if (red.internal || (red.family !== 'IPv4' && red.family !== 4)) continue;
      const partes = red.address.split('.');
      if (partes.length !== 4 || partes.some(p => !/^(0|[1-9][0-9]{0,2})$/.test(p) || Number(p) > 255)) continue;
      const [a, b] = partes.map(Number);
      if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) ips.add(red.address);
    }
  }
  return [...ips].sort();
}
