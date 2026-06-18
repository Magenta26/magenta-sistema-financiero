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
  lineasTornado,
} from '../lib/analisis'
import type { ModeloAnalisis, VistaPeriodo } from '../lib/analisis'
import TarjetaKpi from '../components/analisis/TarjetaKpi'
import GraficoTendencia from '../components/analisis/GraficoTendencia'
import GraficoMargenes from '../components/analisis/GraficoMargenes'
import GraficoTornado from '../components/analisis/GraficoTornado'
import DonutComposicion from '../components/analisis/DonutComposicion'
import type { PorcionDonut } from '../components/analisis/DonutComposicion'
import DrillDown from '../components/analisis/DrillDown'
import { useTraducciones } from '../hooks/useTraducciones'
import { nombreCuentaTexto } from '../lib/nombreCuenta'
import type { MapaTraducciones } from '../lib/nombreCuenta'
import { useTranslation } from '../hooks/useTranslation'

const VISTAS: VistaPeriodo[] = ['mensual', 'trimestral', 'anual']

/** Porciones del donut para un conjunto de rubros, con top 3 cuentas del período. */
function porcionesRubros(
  modelo: ModeloAnalisis,
  clave: string,
  codigos: string[],
  nombresRubros: Record<string, string>,
  trad: MapaTraducciones
): PorcionDonut[] {
  const vp = modelo.valores.get(clave)
  return codigos.flatMap((codigo) => {
    const valor = vp?.rubros.get(codigo) ?? 0
    if (Math.abs(valor) < 0.005) return []
    const topCuentas = [...modelo.cuentasInfo.entries()]
      .filter(([, c]) => c.rubro_codigo === codigo)
      .map(([cuenta, c]) => ({
        nombre: nombreCuentaTexto(trad, cuenta, c.nombre),
        valor: vp?.cuentas.get(cuenta) ?? 0,
      }))
      .filter((c) => Math.abs(c.valor) > 0.005)
      .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
      .slice(0, 3)
    return [
      {
        nombre: nombresRubros[codigo] ?? modelo.rubroInfo.get(codigo)?.nombre ?? codigo,
        valor,
        topCuentas,
      },
    ]
  })
}

/** Composición de las ventas: cuentas de ING_OP (las contra-cuentas, ej. devoluciones, no se grafican). */
function porcionesVentas(modelo: ModeloAnalisis, clave: string, trad: MapaTraducciones): PorcionDonut[] {
  const vp = modelo.valores.get(clave)
  return [...modelo.cuentasInfo.entries()]
    .filter(([, c]) => c.rubro_codigo === 'ING_OP')
    .map(([cuenta, c]) => {
      const bruto = vp?.cuentas.get(cuenta) ?? 0
      return {
        nombre: nombreCuentaTexto(trad, cuenta, c.nombre),
        valor: c.naturaleza === 'CR' ? bruto : -bruto,
        topCuentas: [],
      }
    })
    .filter((p) => p.valor > 0.005)
    .sort((a, b) => b.valor - a.valor)
}

export default function Analisis() {
  const { t, idioma } = useTranslation()
  const detalle = useErDetalle()
  const rubros = useErRubros()
  const periodoActual = usePeriodoActual()
  const movimientos = useMovimientosTransaccionales()
  const traducciones = useTraducciones()
  const trad = traducciones.data ?? new Map()

  const [vista, setVista] = useState<VistaPeriodo>('mensual')
  const [claveElegida, setClaveElegida] = useState<string | null>(null)

  const modelo = useMemo(
    () =>
      detalle.data && rubros.data
        ? construirModeloAnalisis(detalle.data, rubros.data, vista)
        : null,
    // idioma: las etiquetas de los períodos usan los meses del idioma activo
    [detalle.data, rubros.data, vista, idioma] // eslint-disable-line react-hooks/exhaustive-deps
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
  const tornado = useMemo(
    () => (modelo && clave ? lineasTornado(modelo, clave, dya) : []),
    [modelo, clave, dya]
  )
  const frases = useMemo(
    () =>
      modelo && clave
        ? lecturaDelPeriodo(modelo, clave, dya, { lectura: t.analisis.lectura, rubros: t.rubros }, (cuenta, nombre) =>
            nombreCuentaTexto(trad, cuenta, nombre)
          )
        : [],
    // traducciones.data: re-traduce el nombre de cuenta de la frase
    [modelo, clave, dya, t, traducciones.data] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const cargando = detalle.isLoading || rubros.isLoading || movimientos.isLoading
  const error = detalle.error ?? rubros.error ?? movimientos.error

  const sustantivo = t.analisis.lectura.sustantivo[vista]
  const etiquetaAnterior = t.analisis.vsAnterior(sustantivo)
  const sinHistorico = vista !== 'mensual' && (modelo?.aniosConDatos.length ?? 0) < 2

  const tooltipEbitda =
    dya.size > 0
      ? [
          ...t.analisis.tooltipEbitdaCon,
          ...[...dya.entries()].map(
            ([cuenta, nombre]) => `• ${cuenta} ${nombreCuentaTexto(trad, cuenta, nombre)}`
          ),
        ]
      : t.analisis.tooltipEbitdaSin

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">{t.analisis.titulo}</h1>
          <p className="mt-1 text-sm text-tinta-suave">{t.analisis.descripcion(sustantivo)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-borde bg-white p-0.5">
            {VISTAS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setVista(v)
                  setClaveElegida(null)
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                  vista === v ? 'bg-brand-700 text-white' : 'text-tinta-suave hover:text-brand-900'
                }`}
              >
                {t.analisis.vistas[v]}
              </button>
            ))}
          </div>
          {modelo && clave && (
            <label className="flex items-center gap-2 text-sm text-tinta">
              {t.analisis.selector[vista]}:
              <select
                value={clave}
                onChange={(e) => setClaveElegida(e.target.value)}
                className="rounded-lg border border-borde bg-white px-3 py-2 text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
              >
                {modelo.periodos.map((p) => (
                  <option key={p.clave} value={p.clave}>
                    {p.etiqueta}
                    {p.parcial ? t.analisis.parcialSelector : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t.comun.errorConsultando(error.message)}
        </p>
      )}
      {cargando && <p className="mt-6 text-sm text-tinta-suave">{t.analisis.calculando}</p>}

      {modelo && !clave && !cargando && (
        <p className="mt-6 rounded-xl border border-dashed border-borde bg-white p-6 text-center text-sm text-tinta-suave">
          {t.comun.sinDatosCargados}
        </p>
      )}

      {sinHistorico && (
        <p className="mt-6 rounded-xl border border-dashed border-brand-200 bg-brand-50 px-4 py-3 text-sm text-tinta">
          {t.analisis.sinHistorico(modelo?.aniosConDatos.join(', ') ?? '')}
        </p>
      )}

      {modelo && clave && periodoSeleccionado && (
        <>
          {periodoSeleccionado.parcial && (
            <p className="mt-4 text-xs font-medium text-amber-700">
              {t.analisis.notaParcial(periodoSeleccionado.etiqueta, periodoSeleccionado.meses.length)}
            </p>
          )}

          {/* KPIs */}
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {kpis.map((kpi) => (
              <TarjetaKpi
                key={kpi.clave}
                etiqueta={`${t.analisis.kpis[kpi.clave] ?? kpi.etiqueta} · ${periodoSeleccionado.etiqueta}`}
                valor={kpi.valor}
                porcentaje={kpi.porcentaje}
                etiquetaPorcentaje={t.analisis.kpiPorcentaje[kpi.clave] ?? kpi.etiquetaPorcentaje}
                varAnterior={kpi.varAnterior}
                varPromedio={kpi.varPromedio}
                etiquetaAnterior={etiquetaAnterior}
                invertirColor={kpi.invertirColor}
                tooltip={kpi.clave === 'EBITDA' ? tooltipEbitda : undefined}
              />
            ))}
          </div>

          {/* Lectura del período (va arriba de las donas) */}
          {frases.length > 0 && (
            <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50 p-5">
              <h2 className="text-sm font-semibold text-brand-700">
                {t.analisis.lecturaTitulo(periodoSeleccionado.etiqueta)}
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

          {/* Donas de composición */}
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <DonutComposicion
              titulo={`${t.analisis.donaVentas} · ${periodoSeleccionado.etiqueta}`}
              porciones={porcionesVentas(modelo, clave, trad)}
              nota={t.analisis.donaNotaVentas}
            />
            <DonutComposicion
              titulo={`${t.analisis.donaCosto} · ${periodoSeleccionado.etiqueta}`}
              porciones={porcionesRubros(modelo, clave, ['COSTO_MP', 'COSTO_PER', 'COSTO_SER'], t.rubros, trad)}
            />
            <DonutComposicion
              titulo={`${t.analisis.donaGastos} · ${periodoSeleccionado.etiqueta}`}
              porciones={porcionesRubros(modelo, clave, ['GASTO_ADM', 'GASTO_VTA'], t.rubros, trad)}
            />
          </div>

          {/* Fila de 2 gráficos alineados (misma altura) */}
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <GraficoTendencia series={series} titulo={t.analisis.tendencia[vista]} altura={300} />
            <GraficoMargenes series={series} altura={300} />
          </div>

          {/* Tornado a ancho completo (en su propia fila) */}
          <div className="mt-4">
            <GraficoTornado
              lineas={tornado}
              titulo={t.analisis.tornadoTitulo(periodoSeleccionado.etiqueta)}
              altura={480}
            />
          </div>

          {/* Drill-down */}
          <div className="mt-6">
            <h2 className="mb-1 text-lg font-semibold text-brand-900">{t.analisis.drillTitulo}</h2>
            <p className="mb-3 text-sm text-tinta-suave">
              {t.analisis.drillDescripcion(periodoSeleccionado.etiqueta)}
            </p>
            <DrillDown
              modelo={modelo}
              movimientos={movimientos.data ?? []}
              traducciones={trad}
              clave={clave}
              etiquetaPeriodo={periodoSeleccionado.etiqueta}
              etiquetaTotal={
                vista === 'mensual' ? t.analisis.drillTotalMensual : t.analisis.drillTotalRango
              }
            />
          </div>
        </>
      )}
    </div>
  )
}
