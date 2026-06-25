import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Rol } from '../lib/acceso'

export interface UsuarioFila {
  user_id: string
  email: string | null
  rol: Rol
  debe_cambiar_password: boolean
  created_at: string | null
}

/**
 * Usuarios del sistema (perfiles + email de auth.users), vía la vista
 * `v_usuarios`. La vista solo devuelve filas si el que consulta es admin (filtro
 * de rol en su definición); para los demás roles regresa vacío.
 */
export function useUsuarios() {
  return useQuery({
    queryKey: ['v_usuarios'],
    queryFn: async (): Promise<UsuarioFila[]> => {
      const { data, error } = await supabase
        .from('v_usuarios')
        .select('user_id, email, rol, debe_cambiar_password, created_at')
        .order('email', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as UsuarioFila[]
    },
  })
}
