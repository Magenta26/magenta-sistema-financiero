import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from '../hooks/useTranslation'

/** Sin sesión activa, cualquier ruta protegida redirige a /login. */
export default function RutaProtegida() {
  const { sesion, cargando } = useAuth()
  const { t } = useTranslation()

  if (cargando) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-tinta-suave">{t.comun.cargando}</p>
      </div>
    )
  }

  if (!sesion) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
