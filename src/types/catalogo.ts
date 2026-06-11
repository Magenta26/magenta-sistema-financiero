export type Naturaleza = 'CR' | 'DB'
export type OrigenCuenta = 'seed' | 'auto' | 'manual'

export interface CuentaCatalogo {
  cuenta: string
  nombre: string
  naturaleza: Naturaleza
  rubro_codigo: string | null
  incluir_er: boolean
  incluir_bg: boolean
  origen: OrigenCuenta
  orden: number | null
}

export interface RubroEr {
  codigo: string
  nombre: string
  naturaleza: Naturaleza
  orden: number
}

/** Movimiento transaccional reducido a lo necesario para consolidado/detalle. */
export interface MovimientoResumen {
  cuenta: string
  anio: number
  mes: number
  saldo_inicial: number
  mov_debito: number
  mov_credito: number
  saldo_final: number
}

/** Pendiente de clasificar: llegó sola en una carga (clases 4-7) y nadie la ha revisado. */
export function esPendiente(c: CuentaCatalogo): boolean {
  return (
    c.origen === 'auto' &&
    ['4', '5', '6', '7'].includes(c.cuenta[0]) &&
    (c.rubro_codigo === null || !c.incluir_er)
  )
}
