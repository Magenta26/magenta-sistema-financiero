import { useMemo, useState } from 'react'
import { useErDetalle, useErRubros } from '../hooks/useInformes'
import { usePeriodoActual } from '../hooks/usePeriodoActual'
import { useMovimientosTransaccionales } from '../hooks/useConsolidado'
import { construirModeloEr } from '../lib/estadoResultados'
import type { ModeloEr } from '../lib/estadoResultados'
import {
  calcularKpis,
  construirSeries,
  lecturaDelMes,
  topVariaciones,
  utilidadNetaAcumulada,
} from '../lib/analisis'
import { nombreMes } from '../types/balance'
import TarjetaKpi from '../components/analisis/TarjetaKpi'
import GraficoTendencia from '../components/analisis/GraficoTendencia'
import GraficoMargenes from '../components/analisis/GraficoMargenes'
import GraficoTopVariaciones from '../components/analisis/GraficoTopVariaciones'
import DonutComposicion from '../components/analisis/DonutComposicion'
import type { PorcionDonut } from '../components/analisis/DonutComposicion'
import DrillDown from '../components/analisis/DrillDown'

/** Porciones del donut para un conjunto de rubros, con top 3 cuentas del mes. */
function porcionesDe(modelo: ModeloEr, codigos: string[], mes: number): PorcionDonut[] {
  return codigos.flatMap((codigo) => {
    const bloque = modelo.rubros.find((r) => r.codigo === codigo)
    if (!bloque) return []
    const topCuentas = bloque.cuentas
      .map((c) => ({ nombre: c.nombre, valor: c.valores.get(mes) ?? 0 }))
      .filter((c) => Math.abs(c.valor) > 0.005)
      .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
      .slice(0, 3)
    return [{ nombre: bloque.nombre, valor: bloque.valores.get(mes) ?? 0, topCuentas }]
  })
}

export default function Analisis() {
  const detalle = useErDetalle()
  const rubros = useErRubros()
  const periodoActual = usePeriodoActual()
  const movimientos = useMovimientosTransaccionales()

  const anio = useMemo(
    () => (rubros.data ?? []).reduce((max, r) => Math.max(max, r.anio), new Date().getFullYear()),
    [rubros.data]
  )

  const modelo = useMemo(
    () =>
      detalle.data && rubros.data ? construirModeloEr(detalle.data, rubros.data, [], anio) : null,
    [detalle.data, rubros.data, anio]
  )

  const [mesElegido, setMesElegido] = useState<number | null>(null)
  const mes = useMemo(() => {
    if (!modelo || modelo.mesesConDatos.length === 0) return null
    if (mesElegido !== null && modelo.mesesConDatos.includes(mesElegido)) return mesElegido
    const delPeriodo = periodoActual.data?.mes
    if (delPeriodo && modelo.mesesConDatos.includes(delPeriodo)) return delPeriodo
    return modelo.mesesConDatos[modelo.mesesConDatos.length - 1]
  }, [modelo, mesElegido, periodoActual.data])

  const kpis = useMemo(() => (modelo && mes ? calcularKpis(modelo, mes) : []), [modelo, mes])
  const series = useMemo(() => (modelo ? construirSeries(modelo) : []), [modelo])
  const variaciones = useMemo(
    () => (modelo && mes ? topVariaciones(modelo, mes, 10) : []),
    [modelo, mes]
  )
  const frases = useMemo(() => (modelo && mes ? lecturaDelMes(modelo, mes) : []), [modelo, mes])

  const cargando = detalle.isLoading || rubros.isLoading || movimientos.isLoading
  const error = detalle.error ?? rubros.error ?? movimientos.error

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Análisis financiero {anio}</h1>
          <p className="mt-1 text-sm text-ciruela-300">
            Resultados del mes y tendencias del año, directo de las cargas.
          </p>
        </div>
        {modelo && mes && (
          <label className="flex items-center gap-2 text-sm text-ciruela-300">
            Mes:
            <select
              value={mes}
              onChange={(e) => setMesElegido(parseInt(e.target.value, 10))}
              className="rounded-lg border border-ciruela-700 bg-ciruela-950 px-3 py-2 text-white focus:border-magenta-500 focus:outline-none"
            >
              {modelo.mesesConDatos.map((m) => (
                <option key={m} value={m}>
                  {nombreMes(m)} {anio}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-300">
          Error consultando la base: {error.message}
        </p>
      )}
      {cargando && <p className="mt-6 text-sm text-ciruela-400">Calculando análisis…</p>}

      {modelo && mes === null && !cargando && (
        <p className="mt-6 rounded-xl border border-dashed border-ciruela-700 bg-ciruela-900/40 p-6 text-center text-sm text-ciruela-400">
          No hay datos cargados para {anio}. Sube balances en la sección Cargas.
        </p>
      )}

      {modelo && mes && (
        <>
          {/* KPIs */}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {kpis.map((kpi) => (
              <TarjetaKpi
                key={kpi.clave}
                etiqueta={`${kpi.etiqueta} · ${nombreMes(mes)}`}
                valor={kpi.valor}
                margen={kpi.margen}
                varMesAnterior={kpi.varMesAnterior}
                varPromedio={kpi.varPromedio}
              />
            ))}
            <TarjetaKpi
              etiqueta={`Resultado acumulado del año (a ${nombreMes(mes)})`}
              valor={utilidadNetaAcumulada(modelo, mes)}
              destacada
            />
          </div>

          {/* Lectura del mes */}
          {frases.length > 0 && (
            <div className="mt-5 rounded-2xl border border-magenta-600/40 bg-magenta-600/5 p-5">
              <h2 className="text-sm font-semibold text-magenta-300">
                Lectura de {nombreMes(mes)}
              </h2>
              <ul className="mt-2 space-y-1.5">
                {frases.map((frase, i) => (
                  <li key={i} className="text-sm leading-relaxed text-ciruela-200">
                    • {frase}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Gráficos */}
          <div className="mt-5 grid gap-4">
            <GraficoTendencia series={series} />
            <div className="grid gap-4 lg:grid-cols-2">
              <GraficoMargenes series={series} />
              <GraficoTopVariaciones variaciones={variaciones} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <DonutComposicion
                titulo={`Composición del costo · ${nombreMes(mes)}`}
                porciones={porcionesDe(modelo, ['COSTO_MP', 'COSTO_PER', 'COSTO_SER'], mes)}
              />
              <DonutComposicion
                titulo={`Composición de gastos · ${nombreMes(mes)}`}
                porciones={porcionesDe(modelo, ['GASTO_ADM', 'GASTO_VTA'], mes)}
              />
            </div>
          </div>

          {/* Drill-down */}
          <div className="mt-6">
            <h2 className="mb-1 text-lg font-semibold text-white">Explorar el detalle</h2>
            <p className="mb-3 text-sm text-ciruela-300">
              Rubro → cuenta → auxiliar, con valores de {nombreMes(mes)} y acumulado del año.
            </p>
            <DrillDown modelo={modelo} movimientos={movimientos.data ?? []} mes={mes} />
          </div>
        </>
      )}
    </div>
  )
}
