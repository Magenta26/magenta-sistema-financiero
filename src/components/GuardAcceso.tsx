import { Navigate, Outlet } from 'react-router-dom'
import { useRol } from '../hooks/useRol'
import { landingPorRol } from '../lib/acceso'

/**
 * Guard de módulo por rol. Si el usuario no tiene acceso al módulo pedido, lo
 * redirige a su ruta de aterrizaje (un 'nomina' que escriba /finanzas/* va a
 * parar a su módulo). Es solo UX: la barrera real es el RLS de la base.
 *
 * `RutaProtegida` ya esperó a que el perfil cargue, así que aquí `isLoading`
 * normalmente es false; se cubre por si acaso para no parpadear el redirect.
 */
export default function GuardAcceso({ requiere }: { requiere: 'finanzas' | 'admin' }) {
  const { rol, puedeFinanzas, esAdmin, isLoading } = useRol()
  if (isLoading) return null
  const permitido = requiere === 'admin' ? esAdmin : puedeFinanzas
  if (!permitido) return <Navigate to={landingPorRol(rol)} replace />
  return <Outlet />
}
