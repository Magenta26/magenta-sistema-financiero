import { useMemo, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { fecha } from '../../lib/formato'
import type { Empleado } from '../../types/empleados'
import {
  antiguedadPromedioMeses,
  areasConConteo,
  claveContrato,
  conFechaIngreso,
  filtrarEmpleados,
  iconoArea,
  mesesAntiguedad,
  ordenarEmpleados,
  partesAntiguedad,
  type ClaveContrato,
  type ClaveOrden,
  type DireccionOrden,
  type IconoArea,
} from '../../lib/empleadosLista'
import Avatar from './Avatar'
import {
  IconoBuscar,
  IconoCaja,
  IconoChevron,
  IconoEquipo,
  IconoMaletin,
  IconoPlanta,
} from './iconos'

interface Props {
  empleados: Empleado[]
  fotoUrlDe: (e: Empleado) => string | null
  esEditor: boolean
  cargando: boolean
  onAgregar: () => void
  onAbrir: (id: string) => void
}

// Columnas de la tabla (grid compartido por encabezado y filas).
const COLUMNAS = '2.6fr 1.7fr 1.4fr 1.9fr 1.1fr 44px'

// Área → ícono + colores del cuadro (magenta principal; verde y lila como
// acentos secundarios que NO compiten con el magenta).
const ICONO_AREA: Record<IconoArea, (p: { size?: number }) => React.ReactNode> = {
  maletin: IconoMaletin,
  planta: IconoPlanta,
  caja: IconoCaja,
  equipo: IconoEquipo,
}
const CLASE_AREA: Record<IconoArea, string> = {
  maletin: 'bg-brand-50 text-brand-700',
  planta: 'bg-green-50 text-exito',
  caja: 'bg-violet-50 text-violet-700',
  equipo: 'bg-brand-50 text-brand-500',
}
const CLASE_CONTRATO: Record<ClaveContrato, string> = {
  indefinido: 'bg-green-50 text-exito',
  fijo: 'bg-brand-50 text-brand-700',
  obra: 'bg-violet-50 text-violet-700',
  aprendizaje: 'bg-amber-100 text-amber-800',
  otro: 'bg-gray-100 text-tinta-suave',
}

/**
 * Lista de empleados rediseñada: migas, encabezado, tira de KPIs, toolbar
 * (buscador + chips por área) y tabla ordenable con animación de entrada. La
 * fila completa navega a la ficha individual (no se toca esa vista).
 */
export default function ListaEmpleados({
  empleados,
  fotoUrlDe,
  esEditor,
  cargando,
  onAgregar,
  onAbrir,
}: Props) {
  const { t, idioma } = useTranslation()
  const tl = t.empleados.lista

  const [busqueda, setBusqueda] = useState('')
  const [area, setArea] = useState('all')
  const [clave, setClave] = useState<ClaveOrden>('codigo')
  const [dir, setDir] = useState<DireccionOrden>('asc')

  const hoy = useMemo(() => new Date(), [])

  const areas = useMemo(() => areasConConteo(empleados), [empleados])
  const filtrados = useMemo(
    () => ordenarEmpleados(filtrarEmpleados(empleados, busqueda, area), clave, dir, hoy),
    [empleados, busqueda, area, clave, dir, hoy]
  )

  // KPIs
  const total = empleados.length
  const activos = useMemo(() => empleados.filter((e) => e.activo).length, [empleados])
  const inactivos = total - activos
  const promedioMeses = useMemo(() => antiguedadPromedioMeses(empleados, hoy), [empleados, hoy])
  const empConFecha = useMemo(() => conFechaIngreso(empleados), [empleados])
  const promedioTexto =
    promedioMeses == null
      ? null
      : (promedioMeses / 12).toLocaleString(idioma === 'en' ? 'en-US' : 'es-CO', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })

  const alternarOrden = (k: ClaveOrden) => {
    if (k === clave) setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setClave(k)
      setDir('asc')
    }
  }
  const indicador = (k: ClaveOrden) =>
    k === clave ? (dir === 'asc' ? ' ▲' : ' ▼') : ''

  const etiquetaOrden = `${tl.ordenes[clave]}${dir === 'asc' ? ' ↑' : ' ↓'}`

  return (
    <div>
      {/* Migas */}
      <p className="text-xs text-tinta-suave">
        {tl.migaNomina} / <span className="font-semibold text-brand-900">{tl.migaEmpleados}</span>
      </p>

      {/* Encabezado */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">{t.empleados.titulo}</h1>
          <p className="mt-1 max-w-2xl text-sm text-tinta-suave">{t.empleados.descripcion}</p>
        </div>
        {esEditor && (
          <button
            type="button"
            onClick={onAgregar}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900"
          >
            + {t.empleados.agregar}
          </button>
        )}
      </div>

      {cargando ? (
        <p className="mt-6 text-sm text-tinta-suave">{t.empleados.cargando}</p>
      ) : (
        <>
          {/* Tira de KPIs */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              destacada
              etiqueta={tl.kpiTotal}
              valor={String(total)}
              nota={tl.kpiTotalNota}
            />
            <KpiCard
              etiqueta={tl.kpiActivos}
              valor={String(activos)}
              nota={tl.kpiActivosNota(inactivos)}
              notaClase="text-exito"
            />
            <KpiCard
              etiqueta={tl.kpiExternos}
              valor="—"
              nota={tl.kpiExternosNota}
              notaClase="text-violet-600"
            />
            <KpiCard
              etiqueta={tl.kpiAntiguedad}
              valor={promedioTexto == null ? '—' : tl.promedioAnios(promedioTexto)}
              nota={tl.kpiAntiguedadNota(empConFecha, total)}
            />
          </div>

          {/* Toolbar: buscador + chips por área */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] max-w-sm flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-suave">
                <IconoBuscar size={16} />
              </span>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={tl.buscar}
                className="block w-full rounded-lg border border-borde bg-white py-2 pl-9 pr-3 text-sm text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <ChipArea
                activo={area === 'all'}
                etiqueta={tl.chipTodas}
                conteo={total}
                onClick={() => setArea('all')}
              />
              {areas.map((a) => (
                <ChipArea
                  key={a.valor}
                  activo={area === a.valor}
                  etiqueta={a.esSinArea ? tl.sinArea : a.valor}
                  conteo={a.count}
                  onClick={() => setArea(a.valor)}
                />
              ))}
            </div>
          </div>

          {/* Tabla */}
          <div className="mt-4 overflow-x-auto rounded-xl border border-borde bg-white shadow-sm">
            <div className="min-w-[820px]">
              {/* Encabezado */}
              <div
                className="grid items-center bg-brand-50 px-2"
                style={{ gridTemplateColumns: COLUMNAS }}
              >
                <CabezaOrden etiqueta={tl.colEmpleado} indicador={indicador('nombre')} onClick={() => alternarOrden('nombre')} />
                <CabezaOrden etiqueta={tl.colArea} indicador={indicador('area')} onClick={() => alternarOrden('area')} />
                <CabezaOrden etiqueta={tl.colContrato} indicador={indicador('contrato')} onClick={() => alternarOrden('contrato')} />
                <CabezaOrden etiqueta={tl.colAntiguedad} indicador={indicador('antiguedad')} onClick={() => alternarOrden('antiguedad')} />
                <div className="px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wide text-tinta-suave">
                  {tl.colEstado}
                </div>
                <div />
              </div>

              {/* Filas */}
              {filtrados.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                    <IconoBuscar size={22} />
                  </div>
                  <p className="text-base font-semibold text-brand-900">{tl.sinResultadosTitulo}</p>
                  <p className="mt-1 text-sm text-tinta-suave">{tl.sinResultadosTexto}</p>
                </div>
              ) : (
                filtrados.map((e, i) => {
                  const ia = iconoArea(e.equipo)
                  const IconoA = ICONO_AREA[ia]
                  const meses = mesesAntiguedad(e.fecha_ingreso, hoy)
                  const partes = meses == null ? null : partesAntiguedad(meses)
                  const cc = claveContrato(e.tipo_contrato)
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onAbrir(e.id)}
                      style={{
                        gridTemplateColumns: COLUMNAS,
                        animationDelay: `${Math.min(i, 14) * 22}ms`,
                      }}
                      className="fila-entra grid w-full items-center border-t border-borde px-2 text-left transition-colors duration-150 hover:bg-brand-50 hover:shadow-[inset_3px_0_0_var(--color-brand-700)]"
                    >
                      {/* Empleado */}
                      <div className="flex items-center gap-3 px-3.5 py-3">
                        <Avatar nombre={e.nombre_completo} fotoUrl={fotoUrlDe(e)} tamano={38} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-brand-900">
                            {e.nombre_completo}
                          </p>
                          <p className="truncate font-mono text-[11px] font-semibold text-brand-700">
                            {e.codigo}
                          </p>
                        </div>
                      </div>
                      {/* Cargo / Área */}
                      <div className="flex items-center gap-2.5 px-3.5 py-3">
                        {e.equipo ? (
                          <>
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${CLASE_AREA[ia]}`}
                            >
                              <IconoA size={15} />
                            </span>
                            <span className="truncate text-[13px] text-tinta">{e.equipo}</span>
                          </>
                        ) : (
                          <span className="text-[13px] text-tinta-suave">{t.empleados.sinDato}</span>
                        )}
                      </div>
                      {/* Contrato */}
                      <div className="px-3.5 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${CLASE_CONTRATO[cc]}`}
                        >
                          {e.tipo_contrato?.trim() ? e.tipo_contrato : tl.sinContrato}
                        </span>
                      </div>
                      {/* Ingreso / Antigüedad */}
                      <div className="px-3.5 py-3">
                        {partes ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[13px] font-semibold text-brand-900">
                              {tl.antiguedad(partes.anios, partes.meses)}
                            </span>
                            <span className="text-[11px] text-tinta-suave">
                              {tl.desde(fecha(e.fecha_ingreso!))}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-tinta-suave">{t.empleados.sinDato}</span>
                        )}
                      </div>
                      {/* Estado */}
                      <div className="px-3.5 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            e.activo ? 'bg-green-100 text-exito' : 'bg-gray-100 text-tinta-suave'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {e.activo ? t.empleados.activo : t.empleados.inactivo}
                        </span>
                      </div>
                      {/* Chevron */}
                      <div className="flex items-center justify-center text-gray-300">
                        <IconoChevron size={16} />
                      </div>
                    </button>
                  )
                })
              )}

              {/* Pie */}
              <div className="flex items-center justify-between gap-3 border-t border-borde bg-gray-50/60 px-4 py-3">
                <span className="text-xs text-tinta-suave">{tl.conteo(filtrados.length, total)}</span>
                <span className="text-xs text-tinta-suave">
                  {tl.ordenadoPor('')}
                  <b className="text-brand-900">{etiquetaOrden}</b>
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/** Tarjeta de KPI: destacada (fondo brand-900, texto blanco) o blanca. */
function KpiCard({
  etiqueta,
  valor,
  nota,
  destacada = false,
  notaClase,
}: {
  etiqueta: string
  valor: string
  nota: string
  destacada?: boolean
  notaClase?: string
}) {
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-xl p-5 shadow-sm ${
        destacada ? 'bg-brand-900 text-white' : 'border border-borde bg-white'
      }`}
    >
      <span
        className={`text-[10px] font-bold uppercase tracking-wide ${
          destacada ? 'text-white/70' : 'text-tinta-suave'
        }`}
      >
        {etiqueta}
      </span>
      <span
        className={`text-3xl font-bold tabular-nums ${destacada ? 'text-white' : 'text-brand-900'}`}
      >
        {valor}
      </span>
      <span
        className={`text-xs font-semibold ${
          destacada ? 'text-brand-200' : (notaClase ?? 'text-tinta-suave')
        }`}
      >
        {nota}
      </span>
    </div>
  )
}

/** Chip de filtro por área (activo = brand-700 sólido). */
function ChipArea({
  activo,
  etiqueta,
  conteo,
  onClick,
}: {
  activo: boolean
  etiqueta: string
  conteo: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors duration-150 ${
        activo
          ? 'border-brand-700 bg-brand-700 text-white'
          : 'border-borde bg-white text-brand-900 hover:border-brand-700 hover:text-brand-700'
      }`}
    >
      {etiqueta}
      <span className={`text-[11px] ${activo ? 'text-white/70' : 'text-tinta-suave'}`}>{conteo}</span>
    </button>
  )
}

/** Encabezado de columna ordenable con indicador ▲/▼. */
function CabezaOrden({
  etiqueta,
  indicador,
  onClick,
}: {
  etiqueta: string
  indicador: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-tinta-suave transition-colors duration-150 hover:text-brand-700"
    >
      {etiqueta}
      <span className="text-brand-700">{indicador}</span>
    </button>
  )
}
