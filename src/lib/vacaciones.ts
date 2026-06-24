/**
 * Seguimiento de vacaciones (normativa colombiana) — lógica pura, compute-on-read.
 *
 * 15 días hábiles por año, causados desde la fecha de ingreso. La causación NO se
 * almacena: se calcula al vuelo. El "hoy" se pasa como parámetro (la fecha real en
 * la app; explícito en los tests). No hay cron ni jobs.
 *
 * FÓRMULA DE CAUSACIÓN
 *   1,25 días hábiles por mes (15 / 12). Los meses transcurridos desde el ingreso
 *   se calculan como meses calendario completos MÁS una fracción proporcional del
 *   mes en curso (por día del mes), para que el acumulado crezca suave día a día:
 *
 *     mesesTranscurridos = (refAño-ingAño)·12 + (refMes-ingMes)
 *                          + (refDía-ingDía) / díasDelMes(ref)
 *     diasAcumulados      = max(0, mesesTranscurridos) · 1,25
 *
 *   Ej.: ingreso 2025-01-15, hoy 2026-01-15 → 12 meses → 15 días exactos.
 *
 * VALOR EN DINERO
 *   valorDía            = salario / 30        (VALOR_DIA, editable)
 *   provisiónMensual    ≈ 1,25 · (salario/30) ≈ 4,17% del salario
 *   valorSaldo          = saldoDías · valorDía
 *   valorProvisiónAcum. = díasAcumulados · valorDía
 *
 * Solo causan los contratos a término indefinido o fijo (TIPOS_CONTRATO_CAUSAN).
 * INDEPENDIENTE de la contabilidad.
 */

/** Días hábiles de vacaciones por año (normativa colombiana). */
export const DIAS_VACACIONES_ANUAL = 15
/** Causación mensual: 15/12 = 1,25 días hábiles por mes. */
export const DIAS_HABILES_POR_MES = DIAS_VACACIONES_ANUAL / 12
/** Divisor del salario para el valor de un día (VALOR_DIA = salario/30). Editable. */
export const BASE_VALOR_DIA = 30

/**
 * Tipos de contrato que CAUSAN vacaciones (match case/acento-insensitive por
 * "contiene"). Fácil de editar: agregar/quitar fragmentos aquí.
 */
export const TIPOS_CONTRATO_CAUSAN = ['indefinido', 'fijo'] as const

export type EstadoVacaciones = 'ok' | 'no_aplica' | 'sin_fecha'

export interface FechaYMD {
  anio: number
  mes: number
  dia: number
}

export interface ResumenVacaciones {
  estado: EstadoVacaciones
  diasAcumulados: number
  diasTomados: number
  saldoDias: number
  valorDia: number
  valorSaldo: number
  valorProvisionAcumulada: number
  provisionMensual: number
}

export interface LineaMesVacaciones {
  mes: number
  /** Días causados dentro del mes. */
  causado: number
  /** Días hábiles tomados dentro del mes. */
  tomado: number
  /** Días acumulados al cierre del mes (desde el ingreso). */
  acumulado: number
  /** Saldo al cierre del mes (acumulado − tomado hasta el fin del mes). */
  saldo: number
  /** Valor en dinero de lo causado en el mes. */
  valorProvisionMes: number
  /** Valor en dinero del acumulado al cierre del mes. */
  valorAcumulado: number
}

/** Minúsculas + sin acentos para comparar tipos de contrato. */
function normalizar(s: string): string {
  // ̀-ͯ = marcas diacríticas combinantes (acentos) que NFD separa.
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** ¿El tipo de contrato causa vacaciones? (contiene "indefinido" o "fijo"). */
export function causaAplica(tipoContrato: string | null | undefined): boolean {
  if (!tipoContrato) return false
  const n = normalizar(tipoContrato)
  return TIPOS_CONTRATO_CAUSAN.some((frag) => n.includes(frag))
}

/** Convierte 'YYYY-MM-DD' a {anio,mes,dia}; null si vacía/inválida. */
export function parseYMD(fecha: string | null | undefined): FechaYMD | null {
  if (!fecha) return null
  const [a, m, d] = fecha.split('-').map(Number)
  if (!Number.isFinite(a) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return { anio: a, mes: m, dia: d }
}

/** Días del mes (1..12). Determinístico (sin "hoy"). */
function diasEnMes(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate()
}

/** Clave ordinal de una fecha para comparar (anio,mes,dia). */
const ord = (f: FechaYMD): number => f.anio * 10000 + f.mes * 100 + f.dia

/** Meses transcurridos (con fracción del mes en curso) entre ingreso y ref. */
function mesesTranscurridos(ing: FechaYMD, ref: FechaYMD): number {
  const base = (ref.anio - ing.anio) * 12 + (ref.mes - ing.mes)
  const frac = (ref.dia - ing.dia) / diasEnMes(ref.anio, ref.mes)
  return base + frac
}

/** Días acumulados (causados) entre ingreso y una fecha de referencia. */
function diasAcumuladosEntre(ing: FechaYMD, ref: FechaYMD): number {
  return Math.max(0, mesesTranscurridos(ing, ref)) * DIAS_HABILES_POR_MES
}

/** Días acumulados desde la fecha de ingreso hasta hoy. null si no hay ingreso. */
export function diasAcumulados(fechaIngreso: string | null | undefined, hoy: FechaYMD): number | null {
  const ing = parseYMD(fechaIngreso)
  if (!ing) return null
  return diasAcumuladosEntre(ing, hoy)
}

/** Suma de los días hábiles tomados en los períodos. */
export function diasTomados(periodos: Pick<PeriodoLike, 'dias_habiles'>[]): number {
  return periodos.reduce((acc, p) => acc + (Number(p.dias_habiles) || 0), 0)
}

/** Valor de un día = salario / 30. 0 si no hay salario. */
export function valorDia(salario: number | null | undefined): number {
  if (!salario || salario <= 0) return 0
  return salario / BASE_VALOR_DIA
}

/** Provisión mensual en dinero ≈ 1,25 · (salario/30). */
export function provisionMensual(salario: number | null | undefined): number {
  return DIAS_HABILES_POR_MES * valorDia(salario)
}

interface PeriodoLike {
  fecha_inicio: string
  dias_habiles: number
}

interface EmpleadoVacaciones {
  tipo_contrato: string | null
  salario: number | null
  fecha_ingreso: string | null
}

/**
 * Resumen de vacaciones de un empleado a la fecha `hoy`.
 *  - 'no_aplica' : el contrato no causa (saldo N/A).
 *  - 'sin_fecha' : causa, pero falta la fecha de ingreso.
 *  - 'ok'        : se calculan acumulados, tomados, saldo y sus valores.
 */
export function resumenVacaciones(
  empleado: EmpleadoVacaciones,
  periodos: PeriodoLike[],
  hoy: FechaYMD
): ResumenVacaciones {
  const tomados = diasTomados(periodos)
  const vDia = valorDia(empleado.salario)
  const vacio: ResumenVacaciones = {
    estado: 'ok',
    diasAcumulados: 0,
    diasTomados: tomados,
    saldoDias: 0,
    valorDia: vDia,
    valorSaldo: 0,
    valorProvisionAcumulada: 0,
    provisionMensual: DIAS_HABILES_POR_MES * vDia,
  }

  if (!causaAplica(empleado.tipo_contrato)) return { ...vacio, estado: 'no_aplica' }
  const acum = diasAcumulados(empleado.fecha_ingreso, hoy)
  if (acum == null) return { ...vacio, estado: 'sin_fecha' }

  const saldo = acum - tomados
  return {
    estado: 'ok',
    diasAcumulados: acum,
    diasTomados: tomados,
    saldoDias: saldo,
    valorDia: vDia,
    valorSaldo: saldo * vDia,
    valorProvisionAcumulada: acum * vDia,
    provisionMensual: DIAS_HABILES_POR_MES * vDia,
  }
}

/**
 * Timeline mensual de la causación para un año dado: una fila por cada mes desde
 * el ingreso (en ese año) hasta el mes actual. Días causados, tomados, acumulado
 * y saldo corrientes, más sus valores en dinero.
 */
export function lineasMensualesVacaciones(
  empleado: EmpleadoVacaciones,
  periodos: PeriodoLike[],
  anio: number,
  hoy: FechaYMD
): LineaMesVacaciones[] {
  const ing = parseYMD(empleado.fecha_ingreso)
  if (!causaAplica(empleado.tipo_contrato) || !ing) return []
  const vDia = valorDia(empleado.salario)
  const lineas: LineaMesVacaciones[] = []

  for (let mes = 1; mes <= 12; mes++) {
    const inicio: FechaYMD = { anio, mes, dia: 1 }
    const finExcl: FechaYMD = mes < 12 ? { anio, mes: mes + 1, dia: 1 } : { anio: anio + 1, mes: 1, dia: 1 }
    // El mes termina antes (o justo) del ingreso → aún no causa nada: se omite.
    if (ord(finExcl) <= ord(ing)) continue
    // El mes empieza después de hoy → futuro: se omite.
    if (ord(inicio) > ord(hoy)) continue

    const refFin: FechaYMD = ord(finExcl) <= ord(hoy) ? finExcl : hoy
    const refIni: FechaYMD = ord(inicio) <= ord(hoy) ? inicio : hoy
    const acumFin = diasAcumuladosEntre(ing, refFin)
    const acumIni = diasAcumuladosEntre(ing, refIni)
    const causado = Math.max(0, acumFin - acumIni)

    let tomadoMes = 0
    let tomadoHasta = 0
    for (const p of periodos) {
      const f = parseYMD(p.fecha_inicio)
      if (!f) continue
      if (ord(f) < ord(finExcl)) tomadoHasta += Number(p.dias_habiles) || 0
      if (f.anio === anio && f.mes === mes) tomadoMes += Number(p.dias_habiles) || 0
    }

    lineas.push({
      mes,
      causado,
      tomado: tomadoMes,
      acumulado: acumFin,
      saldo: acumFin - tomadoHasta,
      valorProvisionMes: causado * vDia,
      valorAcumulado: acumFin * vDia,
    })
  }

  return lineas
}

/** Años para el selector del detalle: del año de ingreso al año en curso (desc). */
export function aniosVacaciones(fechaIngreso: string | null | undefined, anioEnCurso: number): number[] {
  const ing = parseYMD(fechaIngreso)
  const desde = ing ? Math.min(ing.anio, anioEnCurso) : anioEnCurso
  const anios: number[] = []
  for (let a = anioEnCurso; a >= desde; a--) anios.push(a)
  return anios
}
