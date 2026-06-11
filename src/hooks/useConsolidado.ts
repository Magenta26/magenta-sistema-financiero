import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CuentaCatalogo, MovimientoResumen, RubroEr } from '../types/catalogo'

/** Catálogo completo, ordenado por cuenta. */
export function useCatalogo() {
  return useQuery({
    queryKey: ['catalogo_cuentas', 'todas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalogo_cuentas')
        .select('cuenta, nombre, naturaleza, rubro_codigo, incluir_er, incluir_bg, origen, orden')
        .order('cuenta', { ascending: true })
      if (error) throw new Error(error.message)
      return data as CuentaCatalogo[]
    },
  })
}

/** Los 8 rubros del ER en su orden. */
export function useRubros() {
  return useQuery({
    queryKey: ['rubros_er'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rubros_er')
        .select('codigo, nombre, naturaleza, orden')
        .order('orden', { ascending: true })
      if (error) throw new Error(error.message)
      return data as RubroEr[]
    },
  })
}

/**
 * Todos los movimientos transaccionales del año, paginados de a 1000
 * (PostgREST corta en 1000 filas por petición).
 */
export function useMovimientosTransaccionales() {
  return useQuery({
    queryKey: ['movimientos', 'transaccionales'],
    queryFn: async () => {
      const TAMANO_PAGINA = 1000
      const filas: MovimientoResumen[] = []
      for (let desde = 0; ; desde += TAMANO_PAGINA) {
        const { data, error } = await supabase
          .from('movimientos')
          .select('cuenta, anio, mes, saldo_inicial, mov_debito, mov_credito, saldo_final')
          .eq('transaccional', true)
          .order('id', { ascending: true })
          .range(desde, desde + TAMANO_PAGINA - 1)
        if (error) throw new Error(error.message)
        filas.push(...(data as MovimientoResumen[]))
        if (data.length < TAMANO_PAGINA) break
      }
      return filas
    },
  })
}
