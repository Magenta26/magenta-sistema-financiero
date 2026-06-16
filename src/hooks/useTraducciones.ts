import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { paginarConsulta } from '../lib/paginar'
import type { MapaTraducciones } from '../lib/nombreCuenta'

interface FilaTraduccion {
  cuenta: string
  nombre_en: string
}

/** Mapa cuenta -> nombre_en de la tabla traducciones_cuentas. */
export function useTraducciones() {
  return useQuery({
    queryKey: ['traducciones_cuentas'],
    queryFn: async (): Promise<MapaTraducciones> => {
      const filas = await paginarConsulta<FilaTraduccion>((desde, hasta) =>
        supabase.from('traducciones_cuentas').select('cuenta, nombre_en').range(desde, hasta)
      )
      const mapa: MapaTraducciones = new Map()
      for (const f of filas) mapa.set(f.cuenta, f.nombre_en)
      return mapa
    },
  })
}
