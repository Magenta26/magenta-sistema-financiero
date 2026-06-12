import { useMemo, useState } from 'react'
import { useErDetalle, useErRubros } from '../hooks/useInformes'
import { usePeriodoActual } from '../hooks/usePeriodoActual'
import { useMovimientosTransaccionales } from '../hooks/useConsolidado'
import {
  calcularKpis,
  construirModeloAnalisis,
  construirSeries,
  cuentasDepreciacionAmortizacion,
  lecturaDelPeriodo,
  topVariaciones,
} from '../lib/analisis'
import type { ModeloAnalisis, VistaPeriodo } from '../lib/analisis'
import TarjetaKpi from '../components/analisis/TarjetaKpi'
import GraficoTendencia from '../components/analisis/GraficoTendencia'
import GraficoMargenes from '../components/analisis/GraficoMargenes'
import GraficoTopVariaciones from '../components/analisis/GraficoTopVariaciones'
import DonutComposicion from '../components/analisis/DonutComposicion'
import type { PorcionDonut } from '../components/analisis/DonutComposicion'
import DrillDown from '../components/analisis/DrillDown'

const VISTAS: { valor: VistaPeriodo; etiqueta: string }[] = [
  { valor: 'mensual', etiqueta: 'Mensual' },
  { valor: 'trimestral', etiqueta: 'Trimestral' },
  { valor: 'anual', etiqueta: 'Anual' },
]

const SUSTANTIVO: Record<VistaPeriodo, string> = {
  mensual: 'mes',
  trimestral: 'trimestre',
  anual: 'año',
}

const TITULO_TENDENCIA: Record<VistaPeriodo, string> = {
  mensual: 'Tendencia mensual',
  trimestral: 'Tendencia trimestral',
  anual: 'Comparación anual',
}

/** Porciones del donut para un conjunto de rubros, con top 3 cuentas del período. */
function porcionesRubros(modelo: ModeloAnalisis, clave: string, codigos: string[]): PorcionDonut[] {
  const vp = modelo.valores.get(clave)
  return codigos.flatMap((codigo) => {
    const valor = vp?.rubros.get(codigo) ?? 0
    if (Math.abs(valor) < 0.005) return []
    const topCuentas = [...modelo.cuentasInfo.entries()]
      .filter(([, c]) => c.rubro_codigo === codigo)
      .map(([cuenta, c]) => ({ nombre: c.nombre, valor: vp?.cuentas.get(cuenta) ?? 0 }))
      .filter((c) => Math.abs(c.valor) > 0.005)
      .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
      .slice(0, 3)
    return [{ nombre: modelo.rubroInfo.get(codigo)?.nombre ?? codigo, valor, topCuentas }]
  })
}

/** Composición de las ventas: cuentas de ING_OP (las contra-cuentas, ej. devoluciones, no se grafican). */
function porcionesVentas(modelo: ModeloAnalisis, clave: string): PorcionDonut[] {
  const vp = modelo.valores.get(clave)
  return [...modelo.cuentasInfo.entries()]
    .filter(([, c]) => c.rubro_codigo === 'ING_OP')
    .map(([cuenta, c]) => {
      const bruto = vp?.cuentas.get(cuenta) ?? 0
      return {
        nombre: c.nombre,
        valor: c.naturaleza === 'CR' ? bruto : -bruto,
        topCuentas: [],
      }
    })
    .filter((p) => p.valor > 0.005)
    .sort((a, b) => b.valor - a.valor)
}

export default function Analisis() {
  const detalle = useErDetalle()
  const rubros = useErRubros()
  const periodoActual = usePeriodoActual()
  const movimientos = useMovimientosTransaccionales()

  const [vista, setVista] = useState<VistaPeriodo>('mensual')
  const [claveElegida, setClaveElegida] = useState<string | null>(null)

  const modelo = useMemo(
    () =>
      detalle.data && rubros.data
        ? construirModeloAnalisis(detalle.data, rubros.data, vista)
        : null,
    [detalle.data, rubros.data, vista]
  )

  const dya = useMemo(
    () => cuentasDepreciacionAmortizacion(modelo?.cuentasInfo ?? new Map()),
    [modelo]
  )

  const clave = useMemo(() => {
    if (!modelo || modelo.periodos.length === 0) return null
    if (claveElegida && modelo.periodos.some((p) => p.clave === claveElegida)) return claveElegida
    if (vista === 'mensual' && periodoActual.data) {
      const delPeriodo = `${periodoActual.data.anio}-${String(periodoActual.data.mes).padStart(2, '0')}`
      if (modelo.periodos.some((p) => p.clave === delPeriodo)) return delPeriodo
    }
    return modelo.periodos[modelo.periodos.length - 1].clave
  }, [modelo, claveElegida, vista, periodoActual.data])

  const periodoSeleccionado = modelo?.periodos.find((p) => p.clave === clave) ?? null

  const kpis = useMemo(
    () => (modelo && clave ? calcularKpis(modelo, clave, dya) : []),
    [modelo, clave, dya]
  )
  const series = useMemo(() => (modelo ? construirSeries(modelo, dya) : []), [modelo, dya])
  const variaciones = useMemo(
    () => (modelo && clave ? topVariaciones(modelo, clave, 10) : []),
    [modelo, clave]
  )
  const frases = useMemo(
    () => (modelo && clave ? lecturaDelPeriodo(modelo, clave, dya) : []),
    [modelo, clave, dya]
  )

  const cargando = detalle.isLoading || rubros.isLoading || movimientos.isLoading
  const error = detalle.error ?? rubros.error ?? movimientos.error

  const sustantivo = SUSTANTIVO[vista]
  const etiquetaAnterior = `vs ${sustantivo} anterior`
  const sinHistorico = vista !== 'mensual' && (modelo?.aniosConDatos.length ?? 0) < 2

  const tooltipEbitda =
    dya.size > 0
      ? [
          'EBITDA = Utilidad operacional + depreciaciones y amortizaciones.',
          'Cuentas incluidas (por prefijo PUC 5160/5165/5260/5265/7360 o nombre):',
          ...[...dya.entries()].map(([cuenta, nombre]) => `• ${cuenta} ${nombre}`),
        ]
      : [
          'No hay cuentas de depreciación/amortización identificadas en el catálogo (prefijos PUC 5160/5165/5260/5265/7360 o nombre con "depreciación"/"amortización" en clases 5 y 7).',
          'Por ahora EBITDA = Utilidad operacional.',
        ]

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Análisis financiero</h1>
          <p className="mt-1 text-sm text-tinta-suave">
            Resultados por {sustantivo} y tendencias, directo de las cargas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-borde bg-white p-0.5">
            {VISTAS.map((v) => (
              <button
                key={v.valor}
                type="button"
                onClick={() => {
                  setVista(v.valor)
                  setClaveElegida(null)
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                  vista === v.valor
                    ? 'bg-brand-700 text-white'
                    : 'text-tinta-suave hover:text-brand-900'
                }`}
              >
                {v.etiqueta}
              </button>
            ))}
          </div>
          {modelo && clave && (
            <label className="flex items-center gap-2 text-sm text-tinta">
              {sustantivo === 'mes' ? 'Mes' : sustantivo === 'trimestre' ? 'Trimestre' : 'Año'}:
              <select
                value={clave}
                onChange={(e) => setClaveElegida(e.target.value)}
                className="rounded-lg border border-borde bg-white px-3 py-2 text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
              >
                {modelo.periodos.map((p) => (
                  <option key={p.clave} value={p.clave}>
                    {p.etiqueta}
                    {p.parcial ? ' (parcial)' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error consultando la base: {error.message}
        </p>
      )}
      {cargando && <p className="mt-6 text-sm text-tinta-suave">Calculando análisis…</p>}

      {modelo && !clave && !cargando && (
        <p className="mt-6 rounded-xl border border-dashed border-borde bg-white p-6 text-center text-sm text-tinta-suave">
          No hay datos cargados. Sube balances en la sección Cargas.
        </p>
      )}

      {sinHistorico && (
        <p className="mt-6 rounded-xl border border-dashed border-brand-200 bg-brand-50 px-4 py-3 text-sm text-tinta">
          Por ahora solo hay datos de {modelo?.aniosConDatos.join(', ')}. Carga balances de años
          anteriores para habilitar esta comparación completa.
        </p>
      )}

      {modelo && clave && periodoSeleccionado && (
        <>
          {periodoSeleccionado.parcial && (
            <p className="mt-4 text-xs font-medium text-amber-700">
              * {periodoSeleccionado.etiqueta} es un período parcial: agrega solo los meses
              cargados ({periodoSeleccionado.meses.length}).
            </p>
          )}

          {/* KPIs */}
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {kpis.map((kpi) => (
              <TarjetaKpi
                key={kpi.clave}
                etiqueta={`${kpi.etiqueta} · ${periodoSeleccionado.etiqueta}`}
                valor={kpi.valor}
                porcentaje={kpi.porcentaje}
                etiquetaPorcentaje={kpi.etiquetaPorcentaje}
                varAnterior={kpi.varAnterior}
                varPromedio={kpi.varPromedio}
                etiquetaAnterior={etiquetaAnterior}
                invertirColor={kpi.invertirColor}
                tooltip={kpi.clave === 'EBITDA' ? tooltipEbitda : undefined}
              />
            ))}
          </div>

          {/* Lectura del período */}
          {frases.length > 0 && (
            <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50 p-5">
              <h2 className="text-sm font-semibold text-brand-700">
                Lectura de {periodoSeleccionado.etiqueta}
              </h2>
              <ul className="mt-2 space-y-1.5">
                {frases.map((frase, i) => (
                  <li key={i} className="text-sm leading-relaxed text-tinta">
                    • {frase}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Gráficos */}
          <div className="mt-5 grid gap-4">
            <GraficoTendencia series={series} titulo={TITULO_TENDENCIA[vista]} />
            <div className="grid gap-4 lg:grid-cols-2">
              <GraficoMargenes series={series} />
              <GraficoTopVariaciones variaciones={variaciones} sustantivoPeriodo={sustantivo} />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <DonutComposicion
                titulo={`Composición de las ventas · ${periodoSeleccionado.etiqueta}`}
                porciones={porcionesVentas(modelo, clave)}
                nota="Las contra-cuentas (ej. devoluciones) no se grafican."
              />
              <DonutComposicion
                titulo={`Composición del costo · ${periodoSeleccionado.etiqueta}`}
                porciones={porcionesRubros(modelo, clave, ['COSTO_MP', 'COSTO_PER', 'COSTO_SER'])}
              />
              <DonutComposicion
                titulo={`Composición de gastos · ${periodoSeleccionado.etiqueta}`}
                porciones={porcionesRubros(modelo, clave, ['GASTO_ADM', 'GASTO_VTA'])}
              />
            </div>
          </div>

          {/* Drill-down */}
          <div className="mt-6">
            <h2 className="mb-1 text-lg font-semibold text-brand-900">Explorar el detalle</h2>
            <p className="mb-3 text-sm text-tinta-suave">
              Rubro → cuenta → auxiliar, con valores de {periodoSeleccionado.etiqueta} y el total
              del rango visible.
            </p>
            <DrillDown
              modelo={modelo}
              movimientos={movimientos.data ?? []}
              clave={clave}
              etiquetaPeriodo={periodoSeleccionado.etiqueta}
              etiquetaTotal={vista === 'mensual' ? 'Acumulado año' : 'Total del rango'}
            />
          </div>
        </>
      )}
    </div>
  )
}
