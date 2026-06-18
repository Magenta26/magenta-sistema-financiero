import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface FilaVentaEfectivo {
  mes: number
  valor: number
}

/** Ventas en efectivo del año: mapa mes -> valor (dato manual informativo). */
export function useVentasEfectivo(anio: number) {
  return useQuery({
    queryKey: ['ventas_efectivo', anio],
    queryFn: async (): Promise<Map<number, number>> => {
      const { data, error } = await supabase
        .from('ventas_efectivo')
        .select('mes, valor')
        .eq('anio', anio)
      if (error) throw new Error(error.message)
      const mapa = new Map<number, number>()
      for (const f of data as FilaVentaEfectivo[]) mapa.set(f.mes, Number(f.valor))
      return mapa
    },
  })
}
