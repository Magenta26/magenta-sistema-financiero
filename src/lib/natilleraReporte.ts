/**
 * Resolución del reporte de la Natillera (compute-on-read).
 *
 * Los aportes mensuales NO se almacenan: se calculan al vuelo para un
 * (empleado, año) a partir de la cuota base, las novedades y las fechas de
 * ingreso/retiro. El "mes actual" se pasa como parámetro (la fecha de hoy en la
 * app; explícito en los tests). No hay cron ni jobs.
 *
 * Reglas (ver spec):
 *  - Antes del ingreso → celda vacía (null, no participa).
 *  - Después del mes de retiro → vacía. El mes de retiro SÍ se genera.
 *  - Mes futuro respecto a hoy → vacía (aún no se ha generado).
 *  - Cuota vigente en (Y,m) = cuota base ajustada por las novedades
 *    'cambio_cuota' con (anio,mes) <= (Y,m), tomando la más reciente.
 *  - Override del mes: 'no_aporto' → 0 · 'abono' → su valor · si no → cuota vigente.
 *  - Total del año = saldo inicial + suma de los montos resueltos no vacíos.
 */
import type { EmpleadoNatillera, NovedadNatillera } from '../types/natillera'

export interface PeriodoYM {
  anio: number
  mes: number
}

export interface ReporteEmpleado {
  /** 12 posiciones (ene..dic); null = celda vacía (no aplica o futuro). */
  meses: (number | null)[]
  /** Cuota vigente al cierre del año (para la columna "Cuota"). */
  cuotaVigente: number
  saldoInicial: number
  /** saldo inicial + suma de meses no vacíos. */
  total: number
}

/** Clave ordinal de un período para comparar (anio,mes). */
const clave = (anio: number, mes: number): number => anio * 12 + (mes - 1)

/** Convierte una fecha 'YYYY-MM-DD' a {anio, mes}; null si vacía/ inválida. */
export function periodoDeFecha(fecha: string | null | undefined): PeriodoYM | null {
  if (!fecha) return null
  const partes = fecha.split('-')
  const anio = Number(partes[0])
  const mes = Number(partes[1])
  if (!Number.isFinite(anio) || !Number.isFinite(mes) || mes < 1 || mes > 12) return null
  return { anio, mes }
}

/** Período de retiro del empleado: novedad 'retiro' más reciente, o fecha_retiro. */
function periodoRetiro(
  empleado: Pick<EmpleadoNatillera, 'fecha_retiro'>,
  novedades: NovedadNatillera[]
): PeriodoYM | null {
  const retiros = novedades
    .filter((n) => n.tipo === 'retiro')
    .sort((a, b) => b.creado_en.localeCompare(a.creado_en))
  if (retiros.length > 0) return { anio: retiros[0].anio, mes: retiros[0].mes }
  return periodoDeFecha(empleado.fecha_retiro)
}

/** Cuota vigente en (Y,m): cuota base + el último 'cambio_cuota' con período <= (Y,m). */
export function cuotaVigenteEn(
  cuotaBase: number,
  novedades: NovedadNatillera[],
  anio: number,
  mes: number
): number {
  const limite = clave(anio, mes)
  let cuota = cuotaBase
  let mejorClave = -Infinity
  let mejorCreado = ''
  for (const n of novedades) {
    if (n.tipo !== 'cambio_cuota' || n.valor == null) continue
    const k = clave(n.anio, n.mes)
    if (k > limite) continue
    if (k > mejorClave || (k === mejorClave && n.creado_en > mejorCreado)) {
      mejorClave = k
      mejorCreado = n.creado_en
      cuota = Number(n.valor)
    }
  }
  return cuota
}

/** Override del mes (Y,m): la novedad 'no_aporto'/'abono' más reciente, si existe. */
function overrideMes(
  novedades: NovedadNatillera[],
  anio: number,
  mes: number
): { monto: number } | null {
  const candidatas = novedades
    .filter((n) => n.anio === anio && n.mes === mes && (n.tipo === 'no_aporto' || n.tipo === 'abono'))
    .sort((a, b) => b.creado_en.localeCompare(a.creado_en))
  if (candidatas.length === 0) return null
  const top = candidatas[0]
  return { monto: top.tipo === 'no_aporto' ? 0 : Number(top.valor ?? 0) }
}

/**
 * Resuelve el reporte de un empleado para un año dado.
 * @param novedades Novedades del empleado (de cualquier año; las de años
 *   previos afectan la cuota vigente y el retiro).
 */
export function resolverReporteEmpleado(
  empleado: Pick<EmpleadoNatillera, 'cuota_mensual' | 'fecha_ingreso' | 'fecha_retiro'>,
  novedades: NovedadNatillera[],
  saldoInicial: number,
  anio: number,
  hoy: PeriodoYM
): ReporteEmpleado {
  const ingreso = periodoDeFecha(empleado.fecha_ingreso)
  const retiro = periodoRetiro(empleado, novedades)
  const hoyK = clave(hoy.anio, hoy.mes)

  const meses: (number | null)[] = []
  for (let mes = 1; mes <= 12; mes++) {
    const k = clave(anio, mes)
    if (ingreso && k < clave(ingreso.anio, ingreso.mes)) {
      meses.push(null) // antes del ingreso
      continue
    }
    if (retiro && k > clave(retiro.anio, retiro.mes)) {
      meses.push(null) // después del mes de retiro (el mes de retiro sí se incluye)
      continue
    }
    if (k > hoyK) {
      meses.push(null) // mes futuro (aún no generado)
      continue
    }
    const ov = overrideMes(novedades, anio, mes)
    meses.push(ov ? ov.monto : cuotaVigenteEn(empleado.cuota_mensual, novedades, anio, mes))
  }

  const sumaMeses = meses.reduce<number>((acc, v) => acc + (v ?? 0), 0)
  return {
    meses,
    cuotaVigente: cuotaVigenteEn(empleado.cuota_mensual, novedades, anio, 12),
    saldoInicial,
    total: saldoInicial + sumaMeses,
  }
}

/** Total aportado por todos los empleados en un mes (índice 0 = enero). */
export function totalMesReporte(reportes: ReporteEmpleado[], mesIndice: number): number {
  return reportes.reduce((acc, r) => acc + (r.meses[mesIndice] ?? 0), 0)
}

/** Gran total: suma de los totales (saldo inicial + meses) de todos los reportes. */
export function totalGeneralReporte(reportes: ReporteEmpleado[]): number {
  return reportes.reduce((acc, r) => acc + r.total, 0)
}
