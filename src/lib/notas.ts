/** Lógica pura de las notas financieras por mes. */

export interface NotaContenido {
  mes: number
  contenido: string
}

/**
 * Subconjunto de `meses` que tiene una nota con contenido no vacío.
 * Sirve para el indicador (puntito) junto al selector de meses.
 */
export function mesesConNotas(notas: NotaContenido[], meses: number[]): Set<number> {
  const conNotas = new Set<number>()
  for (const n of notas) {
    if (meses.includes(n.mes) && n.contenido.trim() !== '') conNotas.add(n.mes)
  }
  return conNotas
}

/**
 * Mes seleccionado por defecto: el preferido (periodo_actual) si tiene datos,
 * si no el último mes con datos. null si no hay meses con datos.
 */
export function mesPorDefecto(mesPreferido: number | null, mesesConDatos: number[]): number | null {
  if (mesesConDatos.length === 0) return null
  if (mesPreferido != null && mesesConDatos.includes(mesPreferido)) return mesPreferido
  return Math.max(...mesesConDatos)
}
