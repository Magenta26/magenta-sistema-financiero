/**
 * Tipos de la Natillera (caja de ahorro de empleados).
 * Registro INDEPENDIENTE de la contabilidad: no se relaciona con movimientos,
 * catálogo, rubros ni con el ER/BG.
 */

export interface EmpleadoNatillera {
  id: string
  /** Código único del empleado (autosugerido EMP-### al crear, editable). */
  codigo: string | null
  nombre: string
  /** Cuota base/inicial al ingreso (las variaciones se hacen con novedades). */
  cuota_mensual: number
  /** true = Activo · false = Retirado. */
  activo: boolean
  /** Mes/año de ingreso a la natillera. */
  fecha_ingreso: string | null
  /** Mes/año de retiro (se fija al registrar la novedad 'retiro'). */
  fecha_retiro: string | null
  creado_en: string | null
}

/** Tipos de novedad mensual por empleado. */
export type TipoNovedad = 'cambio_cuota' | 'no_aporto' | 'abono' | 'retiro'

export interface NovedadNatillera {
  id: string
  empleado_id: string
  anio: number
  mes: number
  tipo: TipoNovedad
  /** cambio_cuota: nueva cuota · abono: monto real del mes · no_aporto/retiro: null. */
  valor: number | null
  nota: string | null
  creado_en: string
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
