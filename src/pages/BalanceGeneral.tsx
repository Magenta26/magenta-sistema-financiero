import { useMemo } from 'react'
import { useBg, useErRubros } from '../hooks/useInformes'
import { construirModeloBg } from '../lib/balanceGeneral'
import { construirModeloEr } from '../lib/estadoResultados'
import { exportarBg } from '../lib/exportarExcel'
import { contable } from '../lib/formato'
import { nombreMes } from '../types/balance'
import SeccionBalance from '../components/informes/SeccionBalance'

export default function BalanceGeneral() {
  const bg = useBg()
  const rubros = useErRubros()

  const anio = useMemo(
    () => (bg.data ?? []).reduce((max, f) => Math.max(max, f.anio), new Date().getFullYear()),
    [bg.data]
  )

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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Balance General {anio}</h1>
          <p className="mt-1 text-sm text-ciruela-300">
            Por grupo (2 dígitos), saldo final de cada mes. Pasivo y patrimonio en positivo.
          </p>
        </div>
        <button
          type="button"
          disabled={!modelo}
          onClick={() => modelo && exportarBg(modelo)}
          className="rounded-lg border border-ciruela-700 px-3 py-1.5 text-xs font-semibold text-ciruela-200 transition-colors hover:border-magenta-500 hover:text-magenta-300 disabled:opacity-50"
        >
          Exportar a Excel
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-300">
          Error consultando las vistas: {error.message}
        </p>
      )}
      {cargando && <p className="mt-6 text-sm text-ciruela-400">Calculando el Balance General…</p>}

      {modelo && meses.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-ciruela-700 bg-ciruela-900/40 p-6 text-center text-sm text-ciruela-400">
          No hay datos cargados para {anio}. Sube balances en la sección Cargas.
        </p>
      )}

      {modelo && meses.length > 0 && (
        <>
          <div className="mt-6 overflow-x-auto rounded-xl border border-ciruela-800">
            <table className="w-full">
              <thead className="bg-ciruela-900 text-ciruela-400">
                <tr>
                  <th className="min-w-64 px-3 py-2.5 text-left text-xs font-medium">Línea</th>
                  {meses.map((mes) => (
                    <th key={mes} className="px-3 py-2.5 text-right text-xs font-medium">
                      {nombreMes(mes)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <SeccionBalance seccion={modelo.activo} meses={meses} />
                <SeccionBalance seccion={modelo.pasivo} meses={meses} />
                <SeccionBalance
                  seccion={modelo.patrimonio}
                  meses={meses}
                  resultadoEjercicio={modelo.resultadoEjercicio}
                />

                {/* Cuadre */}
                <tr className="border-t-2 border-ciruela-700 bg-ciruela-900">
                  <td className="px-3 py-2.5 text-xs font-bold text-white">
                    Cuadre: Activo − (Pasivo + Patrimonio + Resultado)
                  </td>
                  {meses.map((mes) => {
                    const dif = modelo.cuadre.get(mes) ?? 0
                    const cuadra = Math.abs(dif) <= 1
                    return (
                      <td key={mes} className="px-3 py-2.5 text-right">
                        {cuadra ? (
                          <span className="rounded-full bg-emerald-900/60 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                            ✓ cuadra
                          </span>
                        ) : (
                          <span
                            className="rounded-full bg-red-900/70 px-2 py-0.5 font-mono text-xs font-semibold text-red-200"
                            title={`Diferencia: ${contable(dif)}`}
                          >
                            {contable(dif)}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-ciruela-500">
            El cuadre se considera correcto con diferencia ≤ $1 (redondeos). El resultado del
            ejercicio es la utilidad neta acumulada calculada desde el Estado de Resultados.
          </p>
        </>
      )}
    </div>
  )
}
