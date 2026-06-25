import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRol } from '../hooks/useRol'
import { useTranslation } from '../hooks/useTranslation'
import type { Diccionario } from '../i18n/es'
import type { Idioma } from '../i18n/idioma'
import logo from '../assets/Logo.png'

const CLAVE_SIDEBAR = 'magenta-sidebar-abiertos'

interface ItemNav {
  ruta: string
  etiqueta: (t: Diccionario) => string
  icono: string
  /** Ítem visible pero no navegable (módulos en construcción). */
  deshabilitado?: boolean
}

interface GrupoNav {
  clave: string
  etiqueta: (t: Diccionario) => string
  icono: string
  /** Prefijo de rutas del grupo (para auto-expandir al navegar por URL). */
  prefijo: string
  abiertoPorDefecto: boolean
  badge?: (t: Diccionario) => string
  /** Acceso requerido para ver el grupo (undefined = todos los roles). */
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
      { ruta: '/nomina/empleados', etiqueta: (t) => t.nomina.empleados, icono: '👤' },
      { ruta: '/nomina/natillera', etiqueta: (t) => t.nomina.natillera, icono: '🐷' },
      { ruta: '/nomina/vacaciones', etiqueta: (t) => t.nomina.vacaciones, icono: '🏖' },
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

export default function Layout() {
  const { sesion, cerrarSesion } = useAuth()
  const { puedeFinanzas, esAdmin } = useRol()
  const { t, idioma, cambiarIdioma } = useTranslation()
  const location = useLocation()

  // Grupos visibles según el rol (un 'nomina' no ve Finanzas ni Administración).
  const grupos = useMemo(
    () =>
      GRUPOS.filter((g) => {
        if (g.requiere === 'finanzas') return puedeFinanzas
        if (g.requiere === 'admin') return esAdmin
        return true
      }),
    [puedeFinanzas, esAdmin]
  )

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

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 shrink-0 flex-col border-r border-borde bg-white">
        <div className="flex items-center gap-3 border-b border-borde px-5 py-4">
          <img src={logo} alt="Magenta Farms" className="h-11 w-11 object-contain" />
          <div>
            <h1 className="text-sm font-bold leading-tight text-brand-900">Magenta Farms</h1>
            <p className="text-xs text-tinta-suave">{t.nav.sistema}</p>
          </div>
        </div>

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

        <div className="space-y-3 border-t border-borde px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs text-tinta-suave" title={sesion?.user.email ?? ''}>
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
      </aside>

      <main className="flex-1 overflow-y-auto bg-fondo p-8">
        <Outlet />
      </main>
    </div>
  )
}
