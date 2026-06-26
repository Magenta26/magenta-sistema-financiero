import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import {
  esAdmin as esAdminRol,
  puedeEditarExternos,
  puedeEditarNomina,
  puedeVerExternos,
  puedeVerFinanzas,
  puedeVerNomina,
  type Rol,
} from '../lib/acceso'

export type { Rol }

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
    // Editor financiero (admin/contadora): gobierna la edición en Finanzas.
    esEditor: puedeVerFinanzas(rol),
    // Editor del núcleo de Nómina (admin/contadora/nomina).
    esEditorNomina: puedeEditarNomina(rol),
    // Editor de Externos (admin/contadora/nomina/lider_campo).
    esEditorExternos: puedeEditarExternos(rol),
    esAdmin: esAdminRol(rol),
    puedeFinanzas: puedeVerFinanzas(rol),
    puedeNomina: puedeVerNomina(rol),
    puedeExternos: puedeVerExternos(rol),
    debeCambiarPassword: query.data?.debeCambiarPassword ?? false,
    ...query,
  }
}
