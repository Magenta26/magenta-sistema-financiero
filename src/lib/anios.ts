/** Lógica pura del selector de año (ER / BG). */

/** Años distintos presentes en los datos cargados, de mayor a menor. */
export function aniosConDatos(filas: { anio: number }[]): number[] {
  return [...new Set(filas.map((f) => f.anio))].sort((a, b) => b - a)
}

/**
 * Año a mostrar: la elección del usuario si sigue siendo válida; si no, el
 * preferido (del periodo_actual) si tiene datos; si no, el más reciente
 * disponible. null si no hay años con datos.
 */
export function anioPorDefecto(
  anioElegido: number | null,
  disponibles: number[],
  anioPreferido: number | null
): number | null {
  if (anioElegido != null && disponibles.includes(anioElegido)) return anioElegido
  if (anioPreferido != null && disponibles.includes(anioPreferido)) return anioPreferido
  return disponibles[0] ?? null
}
