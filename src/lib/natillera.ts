/**
 * Lógica pura de la Natillera (caja de ahorro de empleados).
 *
 * El "total ahorrado" de un empleado es SIEMPRE la suma de sus aportes del año
 * (nunca un campo manual). Aquí viven los cálculos derivados de la tabla de
 * aportes y la lógica del selector de año.
 */
import type { AporteNatillera } from '../types/natillera'

/** Mapa (mes -> monto) de los aportes de un empleado en el año. */
export type AportesMes = Map<number, number>

/**
 * Indexa los aportes por empleado y mes: empleado_id -> (mes -> monto).
 * Solo considera el año dado (los aportes ya vienen filtrados por año, pero se
 * vuelve a chequear por seguridad).
 */
export function indexarAportes(aportes: AporteNatillera[], anio: number): Map<string, AportesMes> {
  const indice = new Map<string, AportesMes>()
  for (const a of aportes) {
    if (a.anio !== anio) continue
    let porMes = indice.get(a.empleado_id)
    if (!porMes) {
      porMes = new Map()
      indice.set(a.empleado_id, porMes)
    }
    porMes.set(a.mes, Number(a.monto))
  }
  return indice
}

/**
 * Total ahorrado por un empleado en el año:
 *   saldo inicial (lo que traía al cierre del año anterior) + suma de aportes.
 * Si no hay saldo inicial, cuenta como 0 (default del parámetro).
 */
export function totalAhorradoEmpleado(porMes: AportesMes | undefined, saldoInicial = 0): number {
  let total = saldoInicial
  if (porMes) for (const monto of porMes.values()) total += monto
  return total
}

/** Total aportado por TODOS los empleados en un mes dado. */
export function totalDelMes(indice: Map<string, AportesMes>, mes: number): number {
  let total = 0
  for (const porMes of indice.values()) total += porMes.get(mes) ?? 0
  return total
}

/** Gran total: suma de todos los aportes del año (todos los empleados, 12 meses). */
export function totalGeneral(indice: Map<string, AportesMes>): number {
  let total = 0
  for (const porMes of indice.values()) {
    for (const monto of porMes.values()) total += monto
  }
  return total
}

/**
 * Gran total ahorrado sobre un conjunto de empleados:
 * suma de (saldo inicial + aportes del año) de cada uno. Coincide con la suma
 * de la columna "Total ahorrado" de las filas mostradas.
 */
export function totalGeneralEmpleados(
  empleados: { id: string }[],
  indice: Map<string, AportesMes>,
  saldos: Map<string, number>
): number {
  let total = 0
  for (const e of empleados) {
    total += totalAhorradoEmpleado(indice.get(e.id), saldos.get(e.id) ?? 0)
  }
  return total
}

/**
 * Siguiente código de empleado con el patrón EMP-###: toma el mayor número con
 * ese formato entre los códigos existentes y le suma 1, con relleno a 3 dígitos
 * (mínimo). Si no hay ninguno con el patrón, arranca en EMP-001. Otros formatos
 * de código se ignoran para el conteo (no rompen la sugerencia).
 */
export function siguienteCodigoEmpleado(codigos: (string | null | undefined)[]): string {
  let max = 0
  for (const c of codigos) {
    const m = /^EMP-(\d+)$/.exec((c ?? '').trim())
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `EMP-${String(max + 1).padStart(3, '0')}`
}

/**
 * Años disponibles para el selector: los años con aportes registrados MÁS el
 * año en curso (aunque aún no tenga aportes), de mayor a menor, sin repetidos.
 */
export function aniosNatillera(aportes: { anio: number }[], anioEnCurso: number): number[] {
  const set = new Set<number>(aportes.map((a) => a.anio))
  set.add(anioEnCurso)
  return [...set].sort((a, b) => b - a)
}

/**
 * Año a mostrar por defecto: la elección del usuario si sigue disponible; si no,
 * el preferido (periodo_actual) si está disponible; si no, el más reciente.
 */
export function anioNatilleraPorDefecto(
  anioElegido: number | null,
  disponibles: number[],
  anioPreferido: number | null
): number | null {
  if (anioElegido != null && disponibles.includes(anioElegido)) return anioElegido
  if (anioPreferido != null && disponibles.includes(anioPreferido)) return anioPreferido
  return disponibles[0] ?? null
}
