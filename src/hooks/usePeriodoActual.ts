import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Periodo } from '../types/balance'

/** Período de trabajo actual (config.periodo_actual). */
export function usePeriodoActual() {
  return useQuery({
    queryKey: ['config', 'periodo_actual'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config')
        .select('valor')
        .eq('clave', 'periodo_actual')
        .maybeSingle()
      if (error) throw new Error(error.message)
      return (data?.valor ?? null) as Periodo | null
    },
  })
}
