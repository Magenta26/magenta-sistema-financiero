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

export interface NotaBilingue {
  mes: number
  /** Versión en español. */
  contenido: string
  /** Versión en inglés. */
  contenido_en: string
}

/** 'ambas' = tiene las dos versiones; 'una' = solo una; ausente = ninguna. */
export type EstadoNota = 'una' | 'ambas'

/**
 * Estado de las notas por mes para el indicador del selector: puntito lleno si
 * el mes tiene ambas versiones (ES y EN), medio si solo una, nada si ninguna.
 */
export function estadoNotasPorMes(
  notas: NotaBilingue[],
  meses: number[]
): Map<number, EstadoNota> {
  const estados = new Map<number, EstadoNota>()
  for (const n of notas) {
    if (!meses.includes(n.mes)) continue
    const es = n.contenido.trim() !== ''
    const en = n.contenido_en.trim() !== ''
    if (es && en) estados.set(n.mes, 'ambas')
    else if (es || en) estados.set(n.mes, 'una')
  }
  return estados
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
