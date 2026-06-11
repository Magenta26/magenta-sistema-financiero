import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const SECCIONES = [
  { ruta: '/cargas', etiqueta: 'Cargas', icono: '⬆' },
  { ruta: '/consolidado', etiqueta: 'Consolidado', icono: '▤' },
  { ruta: '/estado-resultados', etiqueta: 'Estado de Resultados', icono: '∑' },
  { ruta: '/balance-general', etiqueta: 'Balance General', icono: '⚖' },
  { ruta: '/analisis', etiqueta: 'Análisis', icono: '◔' },
]

export default function Layout() {
  const { sesion, cerrarSesion } = useAuth()

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 shrink-0 flex-col border-r border-ciruela-800 bg-ciruela-900">
        <div className="border-b border-ciruela-800 px-6 py-5">
          <h1 className="text-lg font-bold text-white">
            Magenta <span className="text-magenta-500">Farms</span>
          </h1>
          <p className="mt-0.5 text-xs text-ciruela-400">Sistema Financiero</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {SECCIONES.map(({ ruta, etiqueta, icono }) => (
            <NavLink
              key={ruta}
              to={ruta}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-magenta-600/20 text-magenta-300 border-l-2 border-magenta-500'
                    : 'text-ciruela-300 hover:bg-ciruela-800 hover:text-white'
                }`
              }
            >
              <span aria-hidden="true" className="w-5 text-center">
                {icono}
              </span>
              {etiqueta}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-ciruela-800 px-4 py-4">
          <p className="mb-3 truncate text-xs text-ciruela-400" title={sesion?.user.email ?? ''}>
            {sesion?.user.email}
          </p>
          <button
            type="button"
            onClick={cerrarSesion}
            className="w-full rounded-lg border border-ciruela-700 px-3 py-2 text-sm text-ciruela-300 transition-colors hover:border-magenta-500 hover:text-magenta-300"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}
