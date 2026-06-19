import { useMemo, useState } from 'react'
import { useBg, useErRubros } from '../hooks/useInformes'
import { construirModeloBg } from '../lib/balanceGeneral'
import { construirModeloEr } from '../lib/estadoResultados'
import { exportarBg } from '../lib/exportarExcel'
import { contable } from '../lib/formato'
import { nombreMes } from '../types/balance'
import type { ModoBg } from '../types/informes'
import SeccionBalance from '../components/informes/SeccionBalance'
import SelectorAnio from '../components/informes/SelectorAnio'
import { useTraducciones } from '../hooks/useTraducciones'
import { usePeriodoActual } from '../hooks/usePeriodoActual'
import { aniosConDatos, anioPorDefecto } from '../lib/anios'
import { useTranslation } from '../hooks/useTranslation'

const MODOS: ModoBg[] = ['saldos', 'variacion']

export default function BalanceGeneral() {
  const { t } = useTranslation()
  const bg = useBg()
  const rubros = useErRubros()
  const periodoActual = usePeriodoActual()
  const traducciones = useTraducciones()
  const trad = traducciones.data ?? new Map()
  const [modo, setModo] = useState<ModoBg>('saldos')
  const [anioElegido, setAnioElegido] = useState<number | null>(null)

  // Años con datos (de v_bg) y año mostrado: elección del usuario, si no el del
  // periodo_actual, si no el más reciente.
  const anios = useMemo(() => aniosConDatos(bg.data ?? []), [bg.data])
  const anio =
    anioPorDefecto(anioElegido, anios, periodoActual.data?.anio ?? null) ?? new Date().getFullYear()

  const modelo = useMemo(() => {
    if (!bg.data || !rubros.data) return null
    // Utilidad neta mensual desde el ER (mismas fórmulas del PLAN)
    const modeloEr = construirModeloEr([], rubros.data, [], anio)
    const utilidadNetaMensual = modeloEr.derivadas.get('UTILIDAD_NETA')!.valores
    return construirModeloBg(bg.data, utilidadNetaMensual, anio)
  }, [bg.data, rubros.data, anio])

  const cargando = bg.isLoading || rubros.isLoading
  const error = bg.error ?? rubros.error
  const meses = modelo?.mesesConDatos ?? []
  const esVariacion = modo === 'variacion'
  const cuadre = esVariacion ? modelo?.cuadreVariacion : modelo?.cuadre

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">{t.bg.titulo(anio)}</h1>
          <p className="mt-1 text-sm text-tinta-suave">
            {esVariacion ? t.bg.descripcionVariacion : t.bg.descripcionSaldos}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SelectorAnio anios={anios} anioSel={anio} onCambiar={setAnioElegido} />
          <div className="flex rounded-lg border border-borde bg-white p-0.5">
            {MODOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                  modo === m ? 'bg-brand-700 text-white' : 'text-tinta-suave hover:text-brand-900'
                }`}
              >
                {t.bg.modos[m]}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!modelo}
            onClick={() => modelo && exportarBg(modelo, modo, t, trad)}
            className="rounded-lg border border-borde bg-white px-3 py-1.5 text-xs font-semibold text-tinta-suave transition-colors duration-150 hover:border-brand-700 hover:text-brand-700 disabled:opacity-50"
          >
            {t.comun.exportarExcel}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t.er.errorVistas(error.message)}
        </p>
      )}
      {cargando && <p className="mt-6 text-sm text-tinta-suave">{t.bg.calculando}</p>}

      {modelo && meses.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-borde bg-white p-6 text-center text-sm text-tinta-suave">
          {t.er.sinDatos(anio)}
        </p>
      )}

      {modelo && meses.length > 0 && (
        <>
          <div className="mt-6 overflow-x-auto rounded-xl border border-borde bg-white shadow-sm">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50 text-brand-900">
                <tr>
                  <th className="min-w-64 px-3 py-2.5 text-left text-xs font-semibold">{t.comun.linea}</th>
                  {meses.map((mes) => (
                    <th key={mes} className="px-3 py-2.5 text-right text-xs font-semibold">
                      {nombreMes(mes)}
                    </th>
                  ))}
                  {esVariacion && (
                    <th className="px-3 py-2.5 text-right text-xs font-bold">{t.comun.totalAnio}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                <SeccionBalance seccion={modelo.activo} meses={meses} modo={modo} traducciones={trad} />
                <SeccionBalance seccion={modelo.pasivo} meses={meses} modo={modo} traducciones={trad} />
                <SeccionBalance
                  seccion={modelo.patrimonio}
                  meses={meses}
                  modo={modo}
                  traducciones={trad}
                  resultadoEjercicio={modelo.resultadoEjercicio}
                  utilidadNetaMensual={modelo.utilidadNetaMensual}
                />

                {/* Cuadre */}
                <tr className="border-t-2 border-brand-200 bg-gray-50">
                  <td className="px-3 py-2.5 text-xs font-bold text-brand-900">
                    {esVariacion ? t.bg.cuadreVariacion : t.bg.cuadreSaldos}
                  </td>
                  {meses.map((mes) => {
                    const dif = cuadre?.get(mes) ?? 0
                    const cuadra = Math.abs(dif) <= 1
                    return (
                      <td key={mes} className="px-3 py-2.5 text-right">
                        {cuadra ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-exito">
                            {t.bg.cuadra}
                          </span>
                        ) : (
                          <span
                            className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-red-700"
                            title={t.bg.diferencia(contable(dif))}
                          >
                            {contable(dif)}
                          </span>
                        )}
                      </td>
                    )
                  })}
                  {esVariacion && <td />}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-tinta-suave">
            {esVariacion ? t.bg.notaVariacion : t.bg.notaSaldos}
          </p>
        </>
      )}
    </div>
  )
}
