import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export interface AuthContextValue {
  sesion: Session | null
  cargando: boolean
  cerrarSesion: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
