import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import logo from '../assets/Logo.png'

interface ItemNav {
  ruta: string
  etiqueta: string
  icono: string
  /** Ítem visible pero no navegable (módulos en construcción). */
  deshabilitado?: boolean
}

interface GrupoNav {
  clave: string
  etiqueta: string
  icono: string
  /** Prefijo de rutas del grupo (para auto-expandir al navegar por URL). */
  prefijo: string
  abiertoPorDefecto: boolean
  badge?: string
  items: ItemNav[]
}

/**
 * Estructura declarativa del sidebar: agregar un módulo o subsección nueva
 * es añadir una entrada aquí.
 */
const GRUPOS: GrupoNav[] = [
  {
    clave: 'finanzas',
    etiqueta: 'Finanzas',
    icono: '🏦',
    prefijo: '/finanzas',
    abiertoPorDefecto: true,
    items: [
      { ruta: '/finanzas/cargas', etiqueta: 'Cargas', icono: '⬆' },
      { ruta: '/finanzas/consolidado', etiqueta: 'Consolidado', icono: '▤' },
      { ruta: '/finanzas/estado-resultados', etiqueta: 'Estado de Resultados', icono: '∑' },
      { ruta: '/finanzas/balance-general', etiqueta: 'Balance General', icono: '⚖' },
      { ruta: '/finanzas/analisis', etiqueta: 'Análisis', icono: '◔' },
    ],
  },
  {
    clave: 'nomina',
    etiqueta: 'Nómina',
    icono: '👥',
    prefijo: '/nomina',
    abiertoPorDefecto: false,
    badge: 'Próximamente',
    items: [{ ruta: '/nomina', etiqueta: 'Módulo en construcción', icono: '🚧', deshabilitado: true }],
  },
]

export default function Layout() {
  const { sesion, cerrarSesion } = useAuth()
  const location = useLocation()
  const [abiertos, setAbiertos] = useState<Set<string>>(() => {
    const iniciales = new Set(GRUPOS.filter((g) => g.abiertoPorDefecto).map((g) => g.clave))
    // Si se entra directo por URL a un grupo colapsado, arranca expandido.
    const grupoActivo = GRUPOS.find((g) => location.pathname.startsWith(g.prefijo))
    if (grupoActivo) iniciales.add(grupoActivo.clave)
    return iniciales
  })

  // Al navegar (incluso directo por URL), el grupo de la ruta activa se expande solo.
  // Patrón "ajustar estado durante el render" (https://react.dev/learn/you-might-not-need-an-effect).
  const [rutaPrevia, setRutaPrevia] = useState(location.pathname)
  if (rutaPrevia !== location.pathname) {
    setRutaPrevia(location.pathname)
    const grupoActivo = GRUPOS.find((g) => location.pathname.startsWith(g.prefijo))
    if (grupoActivo && !abiertos.has(grupoActivo.clave)) {
      setAbiertos(new Set([...abiertos, grupoActivo.clave]))
    }
  }

  const alternarGrupo = (clave: string) =>
    setAbiertos((previos) => {
      const nuevos = new Set(previos)
      if (nuevos.has(clave)) nuevos.delete(clave)
      else nuevos.add(clave)
      return nuevos
    })

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 shrink-0 flex-col border-r border-borde bg-white">
        <div className="flex items-center gap-3 border-b border-borde px-5 py-4">
          <img src={logo} alt="Magenta Farms" className="h-11 w-11 object-contain" />
          <div>
            <h1 className="text-sm font-bold leading-tight text-brand-900">Magenta Farms</h1>
            <p className="text-xs text-tinta-suave">Sistema de gestión</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
          {GRUPOS.map((grupo) => {
            const abierto = abiertos.has(grupo.clave)
            return (
              <div key={grupo.clave}>
                <button
                  type="button"
                  onClick={() => alternarGrupo(grupo.clave)}
                  aria-expanded={abierto}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors duration-150 hover:bg-gray-50"
                >
                  <span aria-hidden="true" className="w-5 text-center text-sm">
                    {grupo.icono}
                  </span>
                  <span className="flex-1 text-xs font-bold uppercase tracking-wider text-brand-900">
                    {grupo.etiqueta}
                  </span>
                  {grupo.badge && (
                    <span className="rounded-full bg-brand-200/40 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                      {grupo.badge}
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className={`text-xs text-tinta-suave transition-transform duration-150 ${
                      abierto ? 'rotate-90' : ''
                    }`}
                  >
                    ▸
                  </span>
                </button>

                {abierto && (
                  <div className="mt-1 space-y-0.5 pl-3">
                    {grupo.items.map((item) =>
                      item.deshabilitado ? (
                        <span
                          key={item.ruta}
                          className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400"
                        >
                          <span aria-hidden="true" className="w-5 text-center">
                            {item.icono}
                          </span>
                          {item.etiqueta}
                        </span>
                      ) : (
                        <NavLink
                          key={item.ruta}
                          to={item.ruta}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                              isActive
                                ? 'border-l-2 border-brand-700 bg-brand-50 text-brand-700'
                                : 'text-tinta-suave hover:bg-brand-50 hover:text-brand-900'
                            }`
                          }
                        >
                          <span aria-hidden="true" className="w-5 text-center">
                            {item.icono}
                          </span>
                          {item.etiqueta}
                        </NavLink>
                      )
                    )}
                  </div>
                )}
              </div>
            )
          })}
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
