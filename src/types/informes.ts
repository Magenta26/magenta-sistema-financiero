import type { Naturaleza } from './catalogo'

/** Fila de v_er_detalle. */
export interface ErDetalleFila {
  rubro_codigo: string
  cuenta: string
  nombre: string
  naturaleza: Naturaleza
  anio: number
  mes: number
  valor: number
}

/** Fila de v_er_rubros. */
export interface ErRubroFila {
  anio: number
  mes: number
  codigo: string
  nombre: string
  orden: number
  naturaleza: Naturaleza
  total: number
}

/** Fila de v_er_chequeos. */
export interface ErChequeoFila {
  anio: number
  mes: number
  grupo: string
  naturaleza: Naturaleza
  total_crudo: number
  total_clasificado: number
  diferencia: number
}

/** Fila de v_bg. */
export interface BgFila {
  anio: number
  mes: number
  clase: '1' | '2' | '3'
  grupo: string
  nombre_grupo: string
  saldo_final: number
  saldo_presentacion: number
  saldo_inicial: number
  /** saldo_final − saldo_inicial del mes, con signo de presentación (clases 2-3 × −1). */
  variacion_presentacion: number
}

export type ModoEr = 'absolutos' | 'vertical' | 'horizontal'

export type ModoBg = 'saldos' | 'variacion'
