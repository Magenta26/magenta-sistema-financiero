import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { normalizarNota } from '../lib/notas'
import type { Nota } from '../lib/notas'

export type { Nota } from '../lib/notas'

/** Todas las notas del año (una por mes), normalizadas (textos nunca null). */
export function useNotasAnio(anio: number) {
  return useQuery({
    queryKey: ['notas_financieras', anio],
    queryFn: async (): Promise<Nota[]> => {
      const { data, error } = await supabase
        .from('v_notas_financieras')
        .select('*')
        .eq('anio', anio)
      if (error) throw new Error(error.message)
      return (data ?? []).map((f) => normalizarNota(f as Record<string, unknown>))
    },
  })
}
