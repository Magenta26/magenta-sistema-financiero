import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRol } from '../hooks/useRol'
import { useTranslation } from '../hooks/useTranslation'
import type { Diccionario } from '../i18n/es'
import type { Idioma } from '../i18n/idioma'
import logo from '../assets/Logo.png'

const CLAVE_SIDEBAR = 'magenta-sidebar-abiertos'
const CLAVE_COLAPSADO = 'magenta-sidebar-colapsado'

/** Chevron lineal para el botón de colapsar/expandir (convención SVG inline del proyecto). */
function IconoChevron({ direccion }: { direccion: 'izquierda' | 'derecha' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      {direccion === 'izquierda' ? (
        <polyline points="15 18 9 12 15 6" />
      ) : (
        <polyline points="9 18 15 12 9 6" />
      )}
    </svg>
  )
}

/** Ícono de salida para el botón de cerrar sesión en modo colapsado. */
function IconoSalir() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

interface ItemNav {
  ruta: string
  etiqueta: (t: Diccionario) => string
  icono: string
  /** Ítem visible pero no navegable (módulos en construcción). */
  deshabilitado?: boolean
  /** Acceso requerido para ver el ítem (undefined = visible si el grupo lo es). */
  requiere?: 'nomina' | 'externos'
}

interface GrupoNav {
  clave: string
  etiqueta: (t: Diccionario) => string
  icono: string
  /** Prefijo de rutas del grupo (para auto-expandir al navegar por URL). */
  prefijo: string
  abiertoPorDefecto: boolean
  badge?: (t: Diccionario) => string
  /** Acceso requerido para ver el grupo (undefined = se evalúa por sus ítems). */
  requiere?: 'finanzas' | 'admin'
  items: ItemNav[]
}

/**
 * Estructura declarativa del sidebar: agregar un módulo o subsección nueva
 * es añadir una entrada aquí.
 */
const GRUPOS: GrupoNav[] = [
  {
    clave: 'finanzas',
    etiqueta: (t) => t.nav.finanzas,
    icono: '🏦',
    prefijo: '/finanzas',
    abiertoPorDefecto: true,
    requiere: 'finanzas',
    items: [
      { ruta: '/finanzas/cargas', etiqueta: (t) => t.nav.cargas, icono: '⬆' },
      { ruta: '/finanzas/consolidado', etiqueta: (t) => t.nav.consolidado, icono: '▤' },
      { ruta: '/finanzas/estado-resultados', etiqueta: (t) => t.nav.estadoResultados, icono: '∑' },
      { ruta: '/finanzas/balance-general', etiqueta: (t) => t.nav.balanceGeneral, icono: '⚖' },
      { ruta: '/finanzas/analisis', etiqueta: (t) => t.nav.analisis, icono: '◔' },
    ],
  },
  {
    clave: 'nomina',
    etiqueta: (t) => t.nav.nomina,
    icono: '👥',
    prefijo: '/nomina',
    abiertoPorDefecto: false,
    items: [
      { ruta: '/nomina/empleados', etiqueta: (t) => t.nomina.empleados, icono: '👤', requiere: 'nomina' },
      { ruta: '/nomina/externos', etiqueta: (t) => t.nomina.externos, icono: '🌹', requiere: 'externos' },
      { ruta: '/nomina/natillera', etiqueta: (t) => t.nomina.natillera, icono: '🐷', requiere: 'nomina' },
      { ruta: '/nomina/vacaciones', etiqueta: (t) => t.nomina.vacaciones, icono: '🏖', requiere: 'nomina' },
    ],
  },
  {
    clave: 'admin',
    etiqueta: (t) => t.nav.administracion,
    icono: '⚙',
    prefijo: '/admin',
    abiertoPorDefecto: false,
    requiere: 'admin',
    items: [{ ruta: '/admin/usuarios', etiqueta: (t) => t.nav.usuarios, icono: '🔑' }],
  },
]

function abiertosGuardados(): string[] | null {
  try {
    const crudo = localStorage.getItem(CLAVE_SIDEBAR)
    if (!crudo) return null
    const lista = JSON.parse(crudo)
    return Array.isArray(lista) ? lista.filter((x) => typeof x === 'string') : null
  } catch {
    return null
  }
}

function guardarAbiertos(claves: Set<string>): void {
  try {
    localStorage.setItem(CLAVE_SIDEBAR, JSON.stringify([...claves]))
  } catch {
    // sin persistencia, el estado vive solo en la sesión
  }
}

function colapsadoGuardado(): boolean | null {
  try {
    const crudo = localStorage.getItem(CLAVE_COLAPSADO)
    if (crudo === null) return null
    return crudo === '1'
  } catch {
    return null
  }
}

export default function Layout() {
  const { sesion, cerrarSesion } = useAuth()
  const { puedeFinanzas, puedeNomina, puedeExternos, esAdmin } = useRol()
  const { t, idioma, cambiarIdioma } = useTranslation()
  const location = useLocation()

  // Grupos e ítems visibles según el rol: se filtran los ítems por su acceso y
  // luego se ocultan los grupos sin ítems visibles. Así un 'lider_campo' solo ve
  // Externos (sin el resto de Nómina, ni Finanzas, ni Administración).
  const grupos = useMemo(() => {
    const itemVisible = (it: ItemNav): boolean => {
      if (it.requiere === 'nomina') return puedeNomina
      if (it.requiere === 'externos') return puedeExternos
      return true
    }
    const grupoVisible = (g: GrupoNav): boolean => {
      if (g.requiere === 'finanzas') return puedeFinanzas
      if (g.requiere === 'admin') return esAdmin
      return true
    }
    return GRUPOS.map((g) => ({ ...g, items: g.items.filter(itemVisible) })).filter(
      (g) => grupoVisible(g) && g.items.length > 0
    )
  }, [puedeFinanzas, puedeNomina, puedeExternos, esAdmin])

  const [abiertos, setAbiertos] = useState<Set<string>>(() => {
    const guardado = abiertosGuardados()
    const iniciales = guardado
      ? new Set(guardado)
      : new Set(grupos.filter((g) => g.abiertoPorDefecto).map((g) => g.clave))
    // Si se entra directo por URL a un grupo colapsado, arranca expandido.
    const grupoActivo = grupos.find((g) => location.pathname.startsWith(g.prefijo))
    if (grupoActivo) iniciales.add(grupoActivo.clave)
    return iniciales
  })

  const actualizarAbiertos = (nuevos: Set<string>) => {
    setAbiertos(nuevos)
    guardarAbiertos(nuevos)
  }

  // Al navegar (incluso directo por URL), el grupo de la ruta activa se expande solo.
  // Patrón "ajustar estado durante el render" (https://react.dev/learn/you-might-not-need-an-effect).
  const [rutaPrevia, setRutaPrevia] = useState(location.pathname)
  if (rutaPrevia !== location.pathname) {
    setRutaPrevia(location.pathname)
    const grupoActivo = grupos.find((g) => location.pathname.startsWith(g.prefijo))
    if (grupoActivo && !abiertos.has(grupoActivo.clave)) {
      actualizarAbiertos(new Set([...abiertos, grupoActivo.clave]))
    }
  }

  const alternarGrupo = (clave: string) => {
    const nuevos = new Set(abiertos)
    if (nuevos.has(clave)) nuevos.delete(clave)
    else nuevos.add(clave)
    actualizarAbiertos(nuevos)
  }

  // Estado colapsado del sidebar: en pantallas angostas arranca colapsado si no
  // hay preferencia guardada; la elección del usuario se persiste en localStorage.
  const [colapsado, setColapsado] = useState<boolean>(() => {
    const guardado = colapsadoGuardado()
    if (guardado !== null) return guardado
    return typeof window !== 'undefined' && window.innerWidth < 768
  })

  const alternarColapso = () => {
    setColapsado((prev) => {
      const nuevo = !prev
      try {
        localStorage.setItem(CLAVE_COLAPSADO, nuevo ? '1' : '0')
      } catch {
        // sin persistencia, el estado vive solo en la sesión
      }
      return nuevo
    })
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={`flex shrink-0 flex-col border-r border-borde bg-white transition-[width] duration-200 ease-in-out ${
          colapsado ? 'w-[68px]' : 'w-64'
        }`}
      >
        {colapsado ? (
          <div className="flex flex-col items-center gap-2 border-b border-borde px-2 py-4">
            <img src={logo} alt="Magenta Farms" className="h-9 w-9 object-contain" />
            <button
              type="button"
              onClick={alternarColapso}
              aria-label={t.nav.expandir}
              aria-expanded={false}
              title={t.nav.expandir}
              className="rounded-lg p-2 text-tinta-suave transition-colors duration-150 hover:bg-gray-50 hover:text-brand-900"
            >
              <IconoChevron direccion="derecha" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 border-b border-borde px-5 py-4">
            <img src={logo} alt="Magenta Farms" className="h-11 w-11 object-contain" />
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold leading-tight text-brand-900">Magenta Farms</h1>
              <p className="text-xs text-tinta-suave">{t.nav.sistema}</p>
            </div>
            <button
              type="button"
              onClick={alternarColapso}
              aria-label={t.nav.colapsar}
              aria-expanded={true}
              title={t.nav.colapsar}
              className="shrink-0 rounded-lg p-2 text-tinta-suave transition-colors duration-150 hover:bg-gray-50 hover:text-brand-900"
            >
              <IconoChevron direccion="izquierda" />
            </button>
          </div>
        )}

        {colapsado ? (
          <nav className="flex-1 space-y-2 overflow-y-auto px-2 py-4">
            {grupos.map((grupo, idx) => (
              <div
                key={grupo.clave}
                className={idx > 0 ? 'mt-2 border-t border-borde pt-2' : ''}
              >
                {grupo.items.map((item) =>
                  item.deshabilitado ? (
                    <span
                      key={item.ruta}
                      title={item.etiqueta(t)}
                      className="flex cursor-not-allowed justify-center rounded-lg p-2.5 text-base text-gray-400"
                    >
                      <span aria-hidden="true">{item.icono}</span>
                    </span>
                  ) : (
                    <NavLink
                      key={item.ruta}
                      to={item.ruta}
                      title={item.etiqueta(t)}
                      className={({ isActive }) =>
                        `group/nav relative flex justify-center rounded-lg p-2.5 text-base transition-colors duration-150 ${
                          isActive
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-tinta-suave hover:bg-brand-50 hover:text-brand-900'
                        }`
                      }
                    >
                      <span aria-hidden="true" className="leading-none">
                        {item.icono}
                      </span>
                      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-brand-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/nav:opacity-100">
                        {item.etiqueta(t)}
                      </span>
                    </NavLink>
                  )
                )}
              </div>
            ))}
          </nav>
        ) : (
          <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
          {grupos.map((grupo) => {
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
                    {grupo.etiqueta(t)}
                  </span>
                  {grupo.badge && (
                    <span className="rounded-full bg-brand-200/40 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                      {grupo.badge(t)}
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
                          {item.etiqueta(t)}
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
                          {item.etiqueta(t)}
                        </NavLink>
                      )
                    )}
                  </div>
                )}
              </div>
            )
          })}
          </nav>
        )}

        {colapsado ? (
          <div className="flex flex-col items-center gap-2 border-t border-borde px-2 py-4">
            <button
              type="button"
              onClick={() => cambiarIdioma(idioma === 'es' ? 'en' : 'es')}
              title={t.nav.idioma}
              aria-label={t.nav.idioma}
              className="rounded-md border border-borde px-2 py-1 text-[10px] font-bold uppercase text-tinta-suave transition-colors duration-150 hover:border-brand-700 hover:text-brand-900"
            >
              {idioma}
            </button>
            <button
              type="button"
              onClick={cerrarSesion}
              title={t.nav.cerrarSesion}
              aria-label={t.nav.cerrarSesion}
              className="rounded-lg border border-borde p-2 text-tinta-suave transition-colors duration-150 hover:border-brand-700 hover:text-brand-700"
            >
              <IconoSalir />
            </button>
          </div>
        ) : (
          <div className="space-y-3 border-t border-borde px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <p
                className="min-w-0 truncate text-xs text-tinta-suave"
                title={sesion?.user.email ?? ''}
              >
                {sesion?.user.email}
              </p>
              <div
                className="flex shrink-0 rounded-lg border border-borde p-0.5"
                role="group"
                aria-label={t.nav.idioma}
              >
                {(['es', 'en'] as Idioma[]).map((opcion) => (
                  <button
                    key={opcion}
                    type="button"
                    onClick={() => cambiarIdioma(opcion)}
                    className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase transition-colors duration-150 ${
                      idioma === opcion
                        ? 'bg-brand-700 text-white'
                        : 'text-tinta-suave hover:text-brand-900'
                    }`}
                  >
                    {opcion}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={cerrarSesion}
              className="w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta-suave transition-colors duration-150 hover:border-brand-700 hover:text-brand-700"
            >
              {t.nav.cerrarSesion}
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-y-auto bg-fondo p-8">
        <Outlet />
      </main>
    </div>
  )
}
