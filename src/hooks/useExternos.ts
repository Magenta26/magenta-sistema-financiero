import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { TARIFAS_DEFECTO } from '../lib/externos'
import type {
  DeduccionExterno,
  Externo,
  RegistroExterno,
  TarifasExternos,
} from '../types/externos'

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

/** Tarifas globales (fila única de config). Fallback a las por defecto si falta. */
export function useTarifasExternos() {
  return useQuery({
    queryKey: ['externos_tarifas'],
    queryFn: async (): Promise<TarifasExternos> => {
      const { data, error } = await supabase
        .from('externos_tarifas')
        .select('maquillada_valor, hydratada_valor, hora_valor')
        .eq('id', 1)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) return TARIFAS_DEFECTO
      return {
        maquillada_valor: Number(data.maquillada_valor),
        hydratada_valor: Number(data.hydratada_valor),
        hora_valor: Number(data.hora_valor),
      }
    },
  })
}

/** Todos los registros de producción, por fecha descendente (luego creado_en). */
export function useRegistrosExternos() {
  return useQuery({
    queryKey: ['externos_registros'],
    queryFn: async (): Promise<RegistroExterno[]> => {
      const { data, error } = await supabase
        .from('externos_registros')
        .select('id, externo_id, fecha, maquillada_tallos, hydratada_tallos, horas, creado_en')
        .order('fecha', { ascending: false })
        .order('creado_en', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map((r) => ({
        id: r.id,
        externo_id: r.externo_id,
        fecha: r.fecha,
        maquillada_tallos: Number(r.maquillada_tallos),
        hydratada_tallos: Number(r.hydratada_tallos),
        horas: Number(r.horas),
      })) as RegistroExterno[]
    },
  })
}

/** Todas las deducciones manuales (la vista filtra por año/quincena). */
export function useDeduccionesExternos() {
  return useQuery({
    queryKey: ['externos_deducciones'],
    queryFn: async (): Promise<DeduccionExterno[]> => {
      const { data, error } = await supabase
        .from('externos_deducciones')
        .select('id, externo_id, anio, quincena, tipo, valor, nota, creado_en')
        .order('creado_en', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []).map((d) => ({
        id: d.id,
        externo_id: d.externo_id,
        anio: Number(d.anio),
        quincena: Number(d.quincena) as DeduccionExterno['quincena'],
        tipo: d.tipo,
        valor: Number(d.valor),
        nota: d.nota,
      })) as DeduccionExterno[]
    },
  })
}
