import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Empleado } from '../types/empleados'

const CAMPOS =
  'id, codigo, nombre_completo, foto_url, activo, estado_civil, es_padre, num_hijos, ' +
  'esta_estudiando, estudio, tipo_sangre, eps, caja_compensacion, fondo_pension, ' +
  'tipo_contrato, salario, fecha_ingreso, aplica_auxilio_transporte, jornada_inicio, jornada_fin, ' +
  'equipo, beneficio_lentes'

/** Todos los empleados (ficha central), ordenados por código. */
export function useEmpleados() {
  return useQuery({
    queryKey: ['empleados'],
    queryFn: async (): Promise<Empleado[]> => {
      const { data, error } = await supabase
        .from('empleados')
        .select(CAMPOS)
        .order('codigo', { ascending: true })
      if (error) throw new Error(error.message)
      // `select` con string no literal => el cliente no infiere el tipo de fila.
      const filas = (data ?? []) as unknown as Empleado[]
      return filas.map((e) => ({
        ...e,
        salario: e.salario == null ? null : Number(e.salario),
        num_hijos: Number(e.num_hijos ?? 0),
      }))
    },
  })
}

const BUCKET = 'empleados-fotos'

/**
 * URLs firmadas para las fotos de empleados (bucket privado): mapa ruta -> URL.
 * Las firmas caducan (1 h); React Query las refresca al revalidar.
 */
export function useFotosFirmadas(rutas: (string | null)[]) {
  const validas = [...new Set(rutas.filter((r): r is string => !!r))].sort()
  return useQuery({
    queryKey: ['empleados-fotos', validas],
    enabled: validas.length > 0,
    queryFn: async (): Promise<Map<string, string>> => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(validas, 3600)
      if (error) throw new Error(error.message)
      const mapa = new Map<string, string>()
      for (const f of data ?? []) {
        if (f.signedUrl && f.path) mapa.set(f.path, f.signedUrl)
      }
      return mapa
    },
  })
}
