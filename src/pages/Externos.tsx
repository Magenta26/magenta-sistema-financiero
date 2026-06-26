import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from '../hooks/useTranslation'

/**
 * Layout del módulo PAGO A EXTERNOS: breadcrumb + título + pestañas
 * (Catálogo · Registro de producción · Liquidación quincenal) + Outlet.
 * El acceso por rol lo cubre el guard de Nómina (admin/contadora/nomina).
 */
export default function Externos() {
  const { t } = useTranslation()

  const tabs = [
    { ruta: '/nomina/externos', etiqueta: t.externos.tabs.catalogo, fin: true },
    { ruta: '/nomina/externos/registro', etiqueta: t.externos.tabs.registro, fin: false },
    { ruta: '/nomina/externos/liquidacion', etiqueta: t.externos.tabs.liquidacion, fin: false },
  ]

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-tinta-suave">
        {t.nav.nomina} / {t.externos.titulo}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-brand-900">{t.externos.titulo}</h1>
      <p className="mt-1 max-w-2xl text-sm text-tinta-suave">{t.externos.descripcion}</p>

      <nav className="mt-5 flex gap-1 border-b border-borde" aria-label={t.externos.titulo}>
        {tabs.map((tab) => (
          <NavLink
            key={tab.ruta}
            to={tab.ruta}
            end={tab.fin}
            className={({ isActive }) =>
              `-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                isActive
                  ? 'border-brand-700 text-brand-700'
                  : 'border-transparent text-tinta-suave hover:text-brand-900'
              }`
            }
          >
            {tab.etiqueta}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  )
}
