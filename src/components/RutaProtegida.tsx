import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRol } from '../hooks/useRol'
import { useTranslation } from '../hooks/useTranslation'

const RUTA_CAMBIO = '/cambiar-password'

/**
 * Sin sesión activa, cualquier ruta protegida redirige a /login.
 * Si el perfil tiene debe_cambiar_password = true, fuerza /cambiar-password y
 * no deja navegar a ninguna otra sección hasta cambiarla.
 */
export default function RutaProtegida() {
  const { sesion, cargando } = useAuth()
  const perfil = useRol()
  const { pathname } = useLocation()
  const { t } = useTranslation()

  if (cargando || (sesion && perfil.isLoading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-tinta-suave">{t.comun.cargando}</p>
      </div>
    )
  }

  if (!sesion) {
    return <Navigate to="/login" replace />
  }

  // Guard global: contraseña obligatoria en el primer ingreso.
  if (perfil.debeCambiarPassword && pathname !== RUTA_CAMBIO) {
    return <Navigate to={RUTA_CAMBIO} replace />
  }

  return <Outlet />
}
