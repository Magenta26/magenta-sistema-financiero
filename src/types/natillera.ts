/**
 * Tipos de la Natillera (caja de ahorro de empleados).
 * Registro INDEPENDIENTE de la contabilidad: no se relaciona con movimientos,
 * catálogo, rubros ni con el ER/BG.
 */

export interface EmpleadoNatillera {
  id: string
  nombre: string
  cuota_mensual: number
  activo: boolean
  fecha_ingreso: string | null
  creado_en: string | null
}

export interface AporteNatillera {
  id: string
  empleado_id: string
  anio: number
  mes: number
  monto: number
}

export interface SaldoInicialNatillera {
  id: string
  empleado_id: string
  anio: number
  /** Lo que el empleado traía ahorrado al cierre del año anterior. */
  saldo: number
}

export type EstadoRetiro = 'pendiente' | 'pagado'

export interface RetiroNatillera {
  id: string
  empleado_id: string
  consecutivo: number
  fecha_retiro: string
  anio: number
  /** Snapshot del total ahorrado al momento del retiro. */
  monto_total: number
  motivo: string | null
  estado: EstadoRetiro
  fecha_pago: string | null
}
