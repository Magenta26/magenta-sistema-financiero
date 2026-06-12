import { useMemo, useState } from 'react'
import { useBg, useErRubros } from '../hooks/useInformes'
import { construirModeloBg } from '../lib/balanceGeneral'
import { construirModeloEr } from '../lib/estadoResultados'
import { exportarBg } from '../lib/exportarExcel'
import { contable } from '../lib/formato'
import { nombreMes } from '../types/balance'
import type { ModoBg } from '../types/informes'
import SeccionBalance from '../components/informes/SeccionBalance'

const MODOS: { valor: ModoBg; etiqueta: string }[] = [
  { valor: 'saldos', etiqueta: 'Saldos' },
  { valor: 'variacion', etiqueta: 'Variación del mes' },
]

export default function BalanceGeneral() {
  const bg = useBg()
  const rubros = useErRubros()
  const [modo, setModo] = useState<ModoBg>('saldos')

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
  const esVariacion = modo === 'variacion'
  const cuadre = esVariacion ? modelo?.cuadreVariacion : modelo?.cuadre

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Balance General {anio}</h1>
          <p className="mt-1 text-sm text-tinta-suave">
            {esVariacion
              ? 'Variación del mes por grupo: saldo final − saldo inicial (impacto neto del período).'
              : 'Por grupo (2 dígitos), saldo final de cada mes. Pasivo y patrimonio en positivo.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-borde bg-white p-0.5">
            {MODOS.map((m) => (
              <button
                key={m.valor}
                type="button"
                onClick={() => setModo(m.valor)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                  modo === m.valor
                    ? 'bg-brand-700 text-white'
                    : 'text-tinta-suave hover:text-brand-900'
                }`}
              >
                {m.etiqueta}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!modelo}
            onClick={() => modelo && exportarBg(modelo, modo)}
            className="rounded-lg border border-borde bg-white px-3 py-1.5 text-xs font-semibold text-tinta-suave transition-colors duration-150 hover:border-brand-700 hover:text-brand-700 disabled:opacity-50"
          >
            Exportar a Excel
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error consultando las vistas: {error.message}
        </p>
      )}
      {cargando && <p className="mt-6 text-sm text-tinta-suave">Calculando el Balance General…</p>}

      {modelo && meses.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-borde bg-white p-6 text-center text-sm text-tinta-suave">
          No hay datos cargados para {anio}. Sube balances en la sección Cargas.
        </p>
      )}

      {modelo && meses.length > 0 && (
        <>
          <div className="mt-6 overflow-x-auto rounded-xl border border-borde bg-white shadow-sm">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50 text-brand-900">
                <tr>
                  <th className="min-w-64 px-3 py-2.5 text-left text-xs font-semibold">Línea</th>
                  {meses.map((mes) => (
                    <th key={mes} className="px-3 py-2.5 text-right text-xs font-semibold">
                      {nombreMes(mes)}
                    </th>
                  ))}
                  {esVariacion && (
                    <th className="px-3 py-2.5 text-right text-xs font-bold">Total año</th>
                  )}
                </tr>
              </thead>
              <tbody>
                <SeccionBalance seccion={modelo.activo} meses={meses} modo={modo} />
                <SeccionBalance seccion={modelo.pasivo} meses={meses} modo={modo} />
                <SeccionBalance
                  seccion={modelo.patrimonio}
                  meses={meses}
                  modo={modo}
                  resultadoEjercicio={modelo.resultadoEjercicio}
                  utilidadNetaMensual={modelo.utilidadNetaMensual}
                />

                {/* Cuadre */}
                <tr className="border-t-2 border-brand-200 bg-gray-50">
                  <td className="px-3 py-2.5 text-xs font-bold text-brand-900">
                    {esVariacion
                      ? 'Cuadre: var. Activo − (var. Pasivo + var. Patrimonio + utilidad del mes)'
                      : 'Cuadre: Activo − (Pasivo + Patrimonio + Resultado)'}
                  </td>
                  {meses.map((mes) => {
                    const dif = cuadre?.get(mes) ?? 0
                    const cuadra = Math.abs(dif) <= 1
                    return (
                      <td key={mes} className="px-3 py-2.5 text-right">
                        {cuadra ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-exito">
                            ✓ cuadra
                          </span>
                        ) : (
                          <span
                            className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-red-700"
                            title={`Diferencia: ${contable(dif)}`}
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
            {esVariacion
              ? 'Variación = saldo final − saldo inicial del mes, con el signo del efecto en la posición (un aumento de pasivo se muestra como aumento). Total año = suma de variaciones, que equivale al saldo final del último mes menos el saldo inicial de enero.'
              : 'El cuadre se considera correcto con diferencia ≤ $1 (redondeos). El resultado del ejercicio es la utilidad neta acumulada calculada desde el Estado de Resultados.'}
          </p>
        </>
      )}
    </div>
  )
}
