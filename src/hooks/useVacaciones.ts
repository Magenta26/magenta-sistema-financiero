import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PeriodoVacaciones } from '../types/vacaciones'

/** Períodos de vacaciones tomadas (todos los empleados), por fecha de inicio. */
export function usePeriodosVacaciones() {
  return useQuery({
    queryKey: ['vacaciones_periodos'],
    queryFn: async (): Promise<PeriodoVacaciones[]> => {
      const { data, error } = await supabase
        .from('vacaciones_periodos')
        .select('id, empleado_id, fecha_inicio, fecha_fin, dias_habiles, nota, creado_en')
        .order('fecha_inicio', { ascending: false })
      if (error) throw new Error(error.message)
      const filas = (data ?? []) as unknown as PeriodoVacaciones[]
      return filas.map((p) => ({ ...p, dias_habiles: Number(p.dias_habiles) }))
    },
  })
}
