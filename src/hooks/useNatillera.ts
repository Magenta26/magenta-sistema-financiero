import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { AporteNatillera, EmpleadoNatillera, RetiroNatillera } from '../types/natillera'

/** Saldos iniciales del año: mapa empleado_id -> saldo (lo traído del año anterior). */
export function useSaldosInicialesNatillera(anio: number) {
  return useQuery({
    queryKey: ['natillera_saldos_iniciales', anio],
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase
        .from('natillera_saldos_iniciales')
        .select('empleado_id, saldo')
        .eq('anio', anio)
      if (error) throw new Error(error.message)
      const mapa = new Map<string, number>()
      for (const f of data ?? []) mapa.set(f.empleado_id as string, Number(f.saldo))
      return mapa
    },
  })
}

/** Todos los empleados de la natillera (activos e inactivos), por nombre. */
export function useEmpleadosNatillera() {
  return useQuery({
    queryKey: ['natillera_empleados'],
    queryFn: async (): Promise<EmpleadoNatillera[]> => {
      const { data, error } = await supabase
        .from('natillera_empleados')
        .select('id, nombre, cuota_mensual, activo, fecha_ingreso, creado_en')
        .order('nombre', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []).map((e) => ({
        ...e,
        cuota_mensual: Number(e.cuota_mensual),
      })) as EmpleadoNatillera[]
    },
  })
}

/** Aportes del año (todos los empleados). */
export function useAportesNatillera(anio: number) {
  return useQuery({
    queryKey: ['natillera_aportes', anio],
    queryFn: async (): Promise<AporteNatillera[]> => {
      const { data, error } = await supabase
        .from('natillera_aportes')
        .select('id, empleado_id, anio, mes, monto')
        .eq('anio', anio)
      if (error) throw new Error(error.message)
      return (data ?? []).map((a) => ({ ...a, monto: Number(a.monto) })) as AporteNatillera[]
    },
  })
}

/** Todos los años con aportes (solo el campo anio, para el selector). */
export function useAniosAportes() {
  return useQuery({
    queryKey: ['natillera_aportes', 'anios'],
    queryFn: async (): Promise<number[]> => {
      const { data, error } = await supabase.from('natillera_aportes').select('anio')
      if (error) throw new Error(error.message)
      return (data ?? []).map((f) => Number(f.anio))
    },
  })
}

/** Retiros del año. */
export function useRetirosNatillera(anio: number) {
  return useQuery({
    queryKey: ['natillera_retiros', anio],
    queryFn: async (): Promise<RetiroNatillera[]> => {
      const { data, error } = await supabase
        .from('natillera_retiros')
        .select(
          'id, empleado_id, consecutivo, fecha_retiro, anio, monto_total, motivo, estado, fecha_pago'
        )
        .eq('anio', anio)
        .order('consecutivo', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []).map((r) => ({
        ...r,
        consecutivo: Number(r.consecutivo),
        monto_total: Number(r.monto_total),
      })) as RetiroNatillera[]
    },
  })
}
