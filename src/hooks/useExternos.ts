import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Externo } from '../types/externos'

/** Catálogo de externos (todos), ordenados por código. */
export function useExternos() {
  return useQuery({
    queryKey: ['externos'],
    queryFn: async (): Promise<Externo[]> => {
      const { data, error } = await supabase
        .from('externos')
        .select('id, codigo, nombre_completo, cedula, activo, natillera_empleado_id, creado_en')
        .order('codigo', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as Externo[]
    },
  })
}
