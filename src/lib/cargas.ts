import type { Periodo } from '../types/balance'

export interface CargaPeriodo {
  anio: number
  mes: number
  estado: 'activa' | 'reemplazada'
}

/**
 * Recalcula `config.periodo_actual` tras eliminar una carga.
 *
 * Replica exactamente la lógica del RPC `eliminar_carga` (migración 008):
 * el período de la carga ACTIVA más reciente que aún exista; si no queda
 * ninguna carga activa, se vuelve al año actual con mes 0 (sin mes de trabajo).
 *
 * Nota: las cargas 'reemplazada' nunca cuentan — al borrar una 'activa' que
 * tenía una 'reemplazada' del mismo período, ese mes queda sin carga activa
 * (no se reactiva la vieja). Por eso solo se consideran las 'activa'.
 *
 * @param cargasRestantes cargas que QUEDAN después de borrar.
 * @param anioActual año calendario actual (para el caso sin cargas activas).
 */
export function recalcularPeriodoActual(
  cargasRestantes: CargaPeriodo[],
  anioActual: number
): Periodo {
  let mejor: CargaPeriodo | null = null
  for (const c of cargasRestantes) {
    if (c.estado !== 'activa') continue
    if (!mejor || c.anio * 100 + c.mes > mejor.anio * 100 + mejor.mes) {
      mejor = c
    }
  }
  if (!mejor) return { anio: anioActual, mes: 0 }
  return { anio: mejor.anio, mes: mejor.mes }
}
