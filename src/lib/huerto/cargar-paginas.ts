type Pagina<T> = { data: T[] | null; error: unknown | null };

/** Supabase limita las filas por petición: una respuesta parcial no es el huerto completo. */
export async function cargarPaginas<T>(
  consulta: (desde: number, hasta: number) => PromiseLike<Pagina<T>>,
  tamano = 500,
): Promise<{ data: T[]; error: unknown | null }> {
  const data: T[] = [];
  for (let desde = 0; desde < 100000;) {
    const pagina = await consulta(desde, desde + tamano - 1);
    if (pagina.error) return { data: [], error: pagina.error };
    const filas = pagina.data ?? [];
    if (filas.length === 0) return { data, error: null };
    data.push(...filas);
    // El proyecto puede tener un límite inferior al tamaño solicitado.
    // Avanzar por lo recibido evita saltarse filas o aceptar una carga truncada.
    desde += filas.length;
  }
  return { data: [], error: new Error("Hay demasiados registros para cargar el plano completo.") };
}
