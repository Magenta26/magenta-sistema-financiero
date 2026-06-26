import { Navigate, Outlet } from 'react-router-dom'
import { useRol } from '../hooks/useRol'
import { landingPorRol } from '../lib/acceso'

type Modulo = 'finanzas' | 'admin' | 'nomina' | 'externos'

/**
 * Guard de módulo por rol. Si el usuario no tiene acceso al módulo pedido, lo
 * redirige a su ruta de aterrizaje (un 'lider_campo' que escriba /finanzas/* o
 * /nomina/empleados va a parar a Externos). Es solo UX: la barrera real es el RLS.
 *
 * `RutaProtegida` ya esperó a que el perfil cargue, así que aquí `isLoading`
 * normalmente es false; se cubre por si acaso para no parpadear el redirect.
 */
export default function GuardAcceso({ requiere }: { requiere: Modulo }) {
  const { rol, puedeFinanzas, puedeNomina, puedeExternos, esAdmin, isLoading } = useRol()
  if (isLoading) return null
  const permitido =
    requiere === 'admin'
      ? esAdmin
      : requiere === 'finanzas'
        ? puedeFinanzas
        : requiere === 'nomina'
          ? puedeNomina
          : puedeExternos
  if (!permitido) return <Navigate to={landingPorRol(rol)} replace />
  return <Outlet />
}
