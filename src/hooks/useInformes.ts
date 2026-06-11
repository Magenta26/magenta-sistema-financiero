import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { paginarConsulta } from '../lib/paginar'
import type { BgFila, ErChequeoFila, ErDetalleFila, ErRubroFila } from '../types/informes'

export function useErDetalle() {
  return useQuery({
    queryKey: ['v_er_detalle'],
    queryFn: () =>
      paginarConsulta<ErDetalleFila>((desde, hasta) =>
        supabase
          .from('v_er_detalle')
          .select('*')
          .order('cuenta', { ascending: true })
          .order('anio', { ascending: true })
          .order('mes', { ascending: true })
          .range(desde, hasta)
      ),
  })
}

export function useErRubros() {
  return useQuery({
    queryKey: ['v_er_rubros'],
    queryFn: () =>
      paginarConsulta<ErRubroFila>((desde, hasta) =>
        supabase
          .from('v_er_rubros')
          .select('*')
          .order('orden', { ascending: true })
          .order('anio', { ascending: true })
          .order('mes', { ascending: true })
          .range(desde, hasta)
      ),
  })
}

export function useErChequeos() {
  return useQuery({
    queryKey: ['v_er_chequeos'],
    queryFn: () =>
      paginarConsulta<ErChequeoFila>((desde, hasta) =>
        supabase
          .from('v_er_chequeos')
          .select('*')
          .order('grupo', { ascending: true })
          .order('anio', { ascending: true })
          .order('mes', { ascending: true })
          .range(desde, hasta)
      ),
  })
}

export function useBg() {
  return useQuery({
    queryKey: ['v_bg'],
    queryFn: () =>
      paginarConsulta<BgFila>((desde, hasta) =>
        supabase
          .from('v_bg')
          .select('*')
          .order('grupo', { ascending: true })
          .order('anio', { ascending: true })
          .order('mes', { ascending: true })
          .range(desde, hasta)
      ),
  })
}
