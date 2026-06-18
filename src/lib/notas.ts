/** Lógica pura de las notas financieras bilingües por mes. */

/**
 * Nota normalizada: ambos textos SIEMPRE son string (nunca null/undefined).
 * `normalizarNota` garantiza esta invariante al recibir datos de Supabase, así
 * el resto del código jamás hace .trim()/.length sobre un valor crudo.
 */
export interface Nota {
  anio: number
  mes: number
  /** Versión en español (columna 'contenido'). */
  contenido: string
  /** Versión en inglés (columna 'contenido_en'). */
  contenido_en: string
  actualizada_en: string | null
  actualizada_por: string | null
  actualizada_por_email: string | null
}

const texto = (v: unknown): string => (typeof v === 'string' ? v : '')
const fecha = (v: unknown): string | null => (typeof v === 'string' ? v : null)

/** Normaliza una fila cruda de v_notas_financieras: textos nunca null/undefined. */
export function normalizarNota(raw: Record<string, unknown>): Nota {
  return {
    anio: Number(raw.anio),
    mes: Number(raw.mes),
    contenido: texto(raw.contenido),
    contenido_en: texto(raw.contenido_en),
    actualizada_en: fecha(raw.actualizada_en),
    actualizada_por: fecha(raw.actualizada_por),
    actualizada_por_email: fecha(raw.actualizada_por_email),
  }
}

/** 'ambas' = tiene las dos versiones; 'una' = solo una; ausente = ninguna. */
export type EstadoNota = 'una' | 'ambas'

/**
 * Estado de las notas por mes para el indicador del selector: puntito lleno si
 * el mes tiene ambas versiones (ES y EN), medio si solo una, nada si ninguna.
 *
 * Acepta valores crudos posiblemente null/undefined (defensivo): nunca truena.
 */
export function estadoNotasPorMes(
  notas: Array<{ mes: number; contenido?: string | null; contenido_en?: string | null }>,
  meses: number[]
): Map<number, EstadoNota> {
  const estados = new Map<number, EstadoNota>()
  for (const n of notas) {
    if (!meses.includes(n.mes)) continue
    const es = (n.contenido ?? '').trim() !== ''
    const en = (n.contenido_en ?? '').trim() !== ''
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
