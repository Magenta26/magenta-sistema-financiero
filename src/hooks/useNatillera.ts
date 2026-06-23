import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { EmpleadoNatillera, NovedadNatillera, RetiroNatillera } from '../types/natillera'

/**
 * Saldos iniciales (todos los años): mapa `${empleado_id}:${anio}` -> saldo.
 * Usar el helper `saldoInicialDe` para leerlo.
 */
export function useSaldosInicialesNatillera() {
  return useQuery({
    queryKey: ['natillera_saldos_iniciales'],
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase
        .from('natillera_saldos_iniciales')
        .select('empleado_id, anio, saldo')
      if (error) throw new Error(error.message)
      const mapa = new Map<string, number>()
      for (const f of data ?? []) mapa.set(`${f.empleado_id}:${f.anio}`, Number(f.saldo))
      return mapa
    },
  })
}

/** Todos los empleados de la natillera (activos e inactivos), por código. */
export function useEmpleadosNatillera() {
  return useQuery({
    queryKey: ['natillera_empleados'],
    queryFn: async (): Promise<EmpleadoNatillera[]> => {
      const { data, error } = await supabase
        .from('natillera_empleados')
        .select(
          'id, empleado_id, codigo, nombre, cuota_mensual, activo, fecha_ingreso, fecha_retiro, creado_en'
        )
        .order('codigo', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []).map((e) => ({
        ...e,
        cuota_mensual: Number(e.cuota_mensual),
      })) as EmpleadoNatillera[]
    },
  })
}

/** Todas las novedades (de cualquier año): la resolución del reporte las usa. */
export function useNovedadesNatillera() {
  return useQuery({
    queryKey: ['natillera_novedades'],
    queryFn: async (): Promise<NovedadNatillera[]> => {
      const { data, error } = await supabase
        .from('natillera_novedades')
        .select('id, empleado_id, anio, mes, tipo, valor, nota, creado_en')
        .order('creado_en', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []).map((n) => ({
        ...n,
        valor: n.valor == null ? null : Number(n.valor),
      })) as NovedadNatillera[]
    },
  })
}

/** Retiros (todos): snapshots para el comprobante y el estado pendiente/pagado. */
export function useRetirosNatillera() {
  return useQuery({
    queryKey: ['natillera_retiros'],
    queryFn: async (): Promise<RetiroNatillera[]> => {
      const { data, error } = await supabase
        .from('natillera_retiros')
        .select(
          'id, empleado_id, consecutivo, fecha_retiro, anio, monto_total, motivo, estado, fecha_pago'
        )
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
