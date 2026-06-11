import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/** Sin sesión activa, cualquier ruta protegida redirige a /login. */
export default function RutaProtegida() {
  const { sesion, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-tinta-suave">Cargando…</p>
      </div>
    )
  }

  if (!sesion) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
