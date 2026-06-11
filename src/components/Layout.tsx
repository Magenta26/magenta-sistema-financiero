import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import logo from '../assets/Logo.png'

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
      <aside className="flex w-64 shrink-0 flex-col border-r border-borde bg-white">
        <div className="flex items-center gap-3 border-b border-borde px-5 py-4">
          <img src={logo} alt="Magenta Farms" className="h-11 w-11 object-contain" />
          <div>
            <h1 className="text-sm font-bold leading-tight text-brand-900">Magenta Farms</h1>
            <p className="text-xs text-tinta-suave">Sistema Financiero</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {SECCIONES.map(({ ruta, etiqueta, icono }) => (
            <NavLink
              key={ruta}
              to={ruta}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'border-l-2 border-brand-700 bg-brand-50 text-brand-700'
                    : 'text-tinta-suave hover:bg-brand-50 hover:text-brand-900'
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

        <div className="border-t border-borde px-4 py-4">
          <p className="mb-3 truncate text-xs text-tinta-suave" title={sesion?.user.email ?? ''}>
            {sesion?.user.email}
          </p>
          <button
            type="button"
            onClick={cerrarSesion}
            className="w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta-suave transition-colors duration-150 hover:border-brand-700 hover:text-brand-700"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-fondo p-8">
        <Outlet />
      </main>
    </div>
  )
}
