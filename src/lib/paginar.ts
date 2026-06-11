/**
 * Trae TODAS las filas de una consulta de Supabase paginando de a 1000
 * (PostgREST corta en 1000 filas por petición).
 */
export async function paginarConsulta<T>(
  consultar: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const TAMANO_PAGINA = 1000
  const filas: T[] = []
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await consultar(desde, desde + TAMANO_PAGINA - 1)
    if (error) throw new Error(error.message)
    if (!data) break
    filas.push(...data)
    if (data.length < TAMANO_PAGINA) break
  }
  return filas
}
