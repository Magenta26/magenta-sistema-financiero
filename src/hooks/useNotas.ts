import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface NotaFinanciera {
  anio: number
  mes: number
  /** Versión en español (columna 'contenido'). */
  contenido: string
  /** Versión en inglés (columna 'contenido_en'). */
  contenido_en: string
  actualizada_en: string | null
  actualizada_por: string | null
  actualizada_por_email: string | null
}

/** Todas las notas financieras del año (una por mes). */
export function useNotasAnio(anio: number) {
  return useQuery({
    queryKey: ['notas_financieras', anio],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_notas_financieras')
        .select('*')
        .eq('anio', anio)
      if (error) throw new Error(error.message)
      return data as NotaFinanciera[]
    },
  })
}
