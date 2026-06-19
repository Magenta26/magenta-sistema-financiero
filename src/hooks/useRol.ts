import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export type Rol = 'admin' | 'contadora'

interface Perfil {
  rol: Rol | null
  debeCambiarPassword: boolean
}

/** Perfil del usuario actual (rol + flag de cambio de contraseña). */
export function useRol() {
  const { sesion } = useAuth()
  const userId = sesion?.user.id

  const query = useQuery({
    queryKey: ['perfil', 'rol', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Perfil> => {
      const { data, error } = await supabase
        .from('perfiles')
        .select('rol, debe_cambiar_password')
        .eq('user_id', userId!)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return {
        rol: (data?.rol ?? null) as Rol | null,
        debeCambiarPassword: data?.debe_cambiar_password === true,
      }
    },
  })

  const rol = query.data?.rol ?? null
  return {
    rol,
    esEditor: rol === 'admin' || rol === 'contadora',
    debeCambiarPassword: query.data?.debeCambiarPassword ?? false,
    ...query,
  }
}
