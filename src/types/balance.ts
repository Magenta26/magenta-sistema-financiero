import { idiomaGlobal } from '../i18n/idioma'

/** Una fila del balance de prueba de SIIGO, ya parseada. */
export interface FilaBalance {
  nivel: string // Clase | Grupo | Cuenta | Subcuenta | Auxiliar
  transaccional: boolean
  cuenta: string // código SIEMPRE como texto
  nombre_cuenta: string
  saldo_inicial: number
  mov_debito: number
  mov_credito: number
  saldo_final: number
  clase: string // primer dígito del código
}

export interface Periodo {
  anio: number
  mes: number
}

export type TipoValidacion = 'bloqueante' | 'advertencia' | 'info'

export interface Validacion {
  tipo: TipoValidacion
  mensaje: string
  detalle?: string
}

/** Resultado de parsear un .xlsx de SIIGO. */
export interface ResultadoParser {
  /** null si no se detectó o el rango cubre más de un mes (selección manual). */
  periodo: Periodo | null
  filas: FilaBalance[]
  /** Nombres de encabezados requeridos que no se encontraron. */
  encabezadosFaltantes: string[]
}

export const MESES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const

export const MESES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/** Nombre del mes en el idioma activo. */
export function nombreMes(mes: number): string {
  const meses = idiomaGlobal() === 'en' ? MESES_EN : MESES_ES
  return meses[mes - 1] ?? `${idiomaGlobal() === 'en' ? 'Month' : 'Mes'} ${mes}`
}
