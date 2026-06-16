import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export type Rol = 'admin' | 'contadora'

/** Rol del usuario actual (de la tabla `perfiles`). null si no tiene perfil. */
export function useRol() {
  const { sesion } = useAuth()
  const userId = sesion?.user.id

  const query = useQuery({
    queryKey: ['perfil', 'rol', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('user_id', userId!)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return (data?.rol ?? null) as Rol | null
    },
  })

  const rol = query.data ?? null
  return { rol, esEditor: rol === 'admin' || rol === 'contadora', ...query }
}
