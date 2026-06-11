import type { CuentaCatalogo, MovimientoResumen } from '../types/catalogo'

/**
 * Cálculo de valores del consolidado (PLAN.md sección 4):
 * matching por prefijo sobre movimientos transaccionales,
 * signo según naturaleza (CR: créditos−débitos, DB: débitos−créditos).
 * Clases 1-3: saldo final del último mes cargado (cifra de balance, no acumulable).
 */

export function ultimoPeriodo(movimientos: MovimientoResumen[]): number {
  return movimientos.reduce((max, m) => Math.max(max, m.anio * 100 + m.mes), 0)
}

export function calcularValores(
  cuentas: CuentaCatalogo[],
  movimientos: MovimientoResumen[]
): Map<string, number> {
  const ultimo = ultimoPeriodo(movimientos)
  const valores = new Map<string, number>()
  for (const c of cuentas) {
    const coincidentes = movimientos.filter((m) => m.cuenta.startsWith(c.cuenta))
    let valor: number
    if (['1', '2', '3'].includes(c.cuenta[0])) {
      valor = coincidentes
        .filter((m) => m.anio * 100 + m.mes === ultimo)
        .reduce((acc, m) => acc + m.saldo_final, 0)
    } else {
      valor = coincidentes.reduce(
        (acc, m) =>
          acc +
          (c.naturaleza === 'CR' ? m.mov_credito - m.mov_debito : m.mov_debito - m.mov_credito),
        0
      )
    }
    valores.set(c.cuenta, valor)
  }
  return valores
}

/**
 * Invariante anti-doble-conteo (PLAN.md sección 4): ningún código con incluir_er
 * puede ser prefijo de otro código con incluir_er.
 * Devuelve la cuenta en conflicto si activar `cuenta` violaría la invariante.
 */
export function conflictoEr(
  cuenta: string,
  cuentas: CuentaCatalogo[]
): { conflicto: CuentaCatalogo; razon: string } | null {
  for (const otra of cuentas) {
    if (otra.cuenta === cuenta || !otra.incluir_er) continue
    if (cuenta.startsWith(otra.cuenta)) {
      return {
        conflicto: otra,
        razon: `${otra.cuenta} ya está incluida en el ER y contiene a ${cuenta} — incluir ambas duplicaría el valor.`,
      }
    }
    if (otra.cuenta.startsWith(cuenta)) {
      return {
        conflicto: otra,
        razon: `${otra.cuenta} ya está incluida en el ER y ${cuenta} la contiene — incluir ambas duplicaría el valor.`,
      }
    }
  }
  return null
}

/** Detalle mes a mes de una cuenta del catálogo (agrega sus auxiliares si es prefijo). */
export interface DetalleMes {
  anio: number
  mes: number
  auxiliares: number
  saldo_inicial: number
  mov_debito: number
  mov_credito: number
  saldo_final: number
}

export function detallePorMes(cuenta: string, movimientos: MovimientoResumen[]): DetalleMes[] {
  const porPeriodo = new Map<number, DetalleMes>()
  for (const m of movimientos) {
    if (!m.cuenta.startsWith(cuenta)) continue
    const clave = m.anio * 100 + m.mes
    let detalle = porPeriodo.get(clave)
    if (!detalle) {
      detalle = {
        anio: m.anio,
        mes: m.mes,
        auxiliares: 0,
        saldo_inicial: 0,
        mov_debito: 0,
        mov_credito: 0,
        saldo_final: 0,
      }
      porPeriodo.set(clave, detalle)
    }
    detalle.auxiliares += 1
    detalle.saldo_inicial += m.saldo_inicial
    detalle.mov_debito += m.mov_debito
    detalle.mov_credito += m.mov_credito
    detalle.saldo_final += m.saldo_final
  }
  return [...porPeriodo.values()].sort((a, b) => a.anio * 100 + a.mes - (b.anio * 100 + b.mes))
}
