import { Fragment, useMemo, useState } from 'react'
import { useErChequeos, useErDetalle, useErRubros } from '../hooks/useInformes'
import {
  construirModeloEr,
  transformarTotalAnio,
  transformarValor,
} from '../lib/estadoResultados'
import type { LineaDerivada, ModeloEr } from '../lib/estadoResultados'
import { exportarEr } from '../lib/exportarExcel'
import { contable } from '../lib/formato'
import { MESES_ES, nombreMes } from '../types/balance'
import type { ModoEr } from '../types/informes'
import CeldaValor from '../components/informes/CeldaValor'

const MODOS: { valor: ModoEr; etiqueta: string }[] = [
  { valor: 'absolutos', etiqueta: 'Absolutos' },
  { valor: 'vertical', etiqueta: 'Vertical %' },
  { valor: 'horizontal', etiqueta: 'Horizontal %' },
]

/** Tras qué rubro va cada línea derivada. */
const DERIVADAS_TRAS_RUBRO: Record<string, string[]> = {
  ING_OP: ['TOTAL_INGRESOS'],
  COSTO_SER: ['TOTAL_COSTO', 'UTILIDAD_BRUTA'],
  GASTO_VTA: ['UTILIDAD_OPERACIONAL'],
  GASTO_NOOP: ['UTILIDAD_NETA'],
}

function FilaDerivada({ linea, modelo, modo }: { linea: LineaDerivada; modelo: ModeloEr; modo: ModoEr }) {
  return (
    <tr className="border-t border-brand-200 bg-brand-50">
      <td className="px-3 py-2 text-xs font-bold text-brand-900">{linea.etiqueta}</td>
      {MESES_ES.map((_, i) => {
        const mes = i + 1
        const sinDatos = !modelo.mesesConDatos.includes(mes)
        return (
          <CeldaValor
            key={mes}
            valor={sinDatos ? null : transformarValor(modo, linea.valores, mes, modelo)}
            modo={modo}
            sinDatos={sinDatos}
            negrilla
          />
        )
      })}
      <CeldaValor valor={transformarTotalAnio(modo, linea.totalAnio, modelo)} modo={modo} negrilla />
    </tr>
  )
}

export default function EstadoResultados() {
  const detalle = useErDetalle()
  const rubros = useErRubros()
  const chequeos = useErChequeos()

  const [modo, setModo] = useState<ModoEr>('absolutos')
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  const anio = useMemo(
    () => (rubros.data ?? []).reduce((max, r) => Math.max(max, r.anio), new Date().getFullYear()),
    [rubros.data]
  )

  const modelo = useMemo(
    () =>
      detalle.data && rubros.data && chequeos.data
        ? construirModeloEr(detalle.data, rubros.data, chequeos.data, anio)
        : null,
    [detalle.data, rubros.data, chequeos.data, anio]
  )

  const cargando = detalle.isLoading || rubros.isLoading || chequeos.isLoading
  const error = detalle.error ?? rubros.error ?? chequeos.error

  const alternarRubro = (codigo: string) =>
    setExpandidos((previos) => {
      const nuevos = new Set(previos)
      if (nuevos.has(codigo)) nuevos.delete(codigo)
      else nuevos.add(codigo)
      return nuevos
    })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Estado de Resultados {anio}</h1>
          <p className="mt-1 text-sm text-tinta-suave">
            Cuentas del catálogo incluidas en ER, agrupadas por rubro. ▸ expande el detalle.
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
            onClick={() => modelo && exportarEr(modelo, modo)}
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
      {cargando && <p className="mt-6 text-sm text-tinta-suave">Calculando el Estado de Resultados…</p>}

      {modelo && modelo.mesesConDatos.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-borde bg-white p-6 text-center text-sm text-tinta-suave">
          No hay datos cargados para {anio}. Sube balances en la sección Cargas.
        </p>
      )}

      {modelo && modelo.mesesConDatos.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-borde bg-white shadow-sm">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50 text-brand-900">
              <tr>
                <th className="min-w-64 px-3 py-2.5 text-left text-xs font-semibold">Línea</th>
                {MESES_ES.map((nombre, i) => (
                  <th
                    key={nombre}
                    className={`px-3 py-2.5 text-right text-xs font-semibold ${
                      modelo.mesesConDatos.includes(i + 1) ? '' : 'text-gray-400'
                    }`}
                  >
                    {nombre}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right text-xs font-bold">Total año</th>
              </tr>
            </thead>
            <tbody>
              {modelo.rubros.map((bloque) => {
                const abierto = expandidos.has(bloque.codigo)
                return (
                  <Fragment key={bloque.codigo}>
                    {/* Subtotal del rubro (clic para expandir cuentas) */}
                    <tr
                      className="cursor-pointer border-t border-borde bg-white transition-colors duration-150 hover:bg-brand-50"
                      onClick={() => alternarRubro(bloque.codigo)}
                    >
                      <td className="px-3 py-2 text-xs font-semibold text-tinta">
                        <span className="mr-1.5 inline-block w-3 text-tinta-suave">
                          {abierto ? '▾' : '▸'}
                        </span>
                        {bloque.nombre}
                        <span className="ml-1.5 text-gray-400">({bloque.cuentas.length})</span>
                      </td>
                      {MESES_ES.map((_, i) => {
                        const mes = i + 1
                        const sinDatos = !modelo.mesesConDatos.includes(mes)
                        return (
                          <CeldaValor
                            key={mes}
                            valor={sinDatos ? null : transformarValor(modo, bloque.valores, mes, modelo)}
                            modo={modo}
                            sinDatos={sinDatos}
                          />
                        )
                      })}
                      <CeldaValor valor={transformarTotalAnio(modo, bloque.totalAnio, modelo)} modo={modo} />
                    </tr>

                    {/* Cuentas del rubro (expandibles) */}
                    {abierto &&
                      bloque.cuentas.map((cuenta) => (
                        <tr
                          key={cuenta.cuenta}
                          className="border-t border-borde bg-gray-50/50 transition-colors duration-150 hover:bg-brand-50"
                        >
                          <td className="py-1.5 pl-10 pr-3 text-xs text-tinta-suave">
                            <span className="font-mono text-gray-400">{cuenta.cuenta}</span>{' '}
                            {cuenta.nombre}
                          </td>
                          {MESES_ES.map((_, i) => {
                            const mes = i + 1
                            const sinDatos = !modelo.mesesConDatos.includes(mes)
                            return (
                              <CeldaValor
                                key={mes}
                                valor={sinDatos ? null : transformarValor(modo, cuenta.valores, mes, modelo)}
                                modo={modo}
                                sinDatos={sinDatos}
                              />
                            )
                          })}
                          <CeldaValor valor={transformarTotalAnio(modo, cuenta.totalAnio, modelo)} modo={modo} />
                        </tr>
                      ))}

                    {/* Líneas derivadas que van tras este rubro */}
                    {(DERIVADAS_TRAS_RUBRO[bloque.codigo] ?? []).map((clave) => (
                      <FilaDerivada key={clave} linea={modelo.derivadas.get(clave)!} modelo={modelo} modo={modo} />
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Chequeos por grupo */}
      {modelo && modelo.chequeos.length > 0 && (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">
            ⚠️ Chequeos con diferencia (total crudo del grupo vs clasificado en el ER)
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Una diferencia indica cuentas del grupo sin clasificar o mal clasificadas en el catálogo.
          </p>
          <ul className="mt-2 space-y-1">
            {modelo.chequeos.map((ch) => (
              <li key={ch.grupo} className="text-xs text-amber-800">
                <span className="font-bold">Grupo {ch.grupo}:</span>{' '}
                {[...ch.diferencias.entries()]
                  .sort((a, b) => a[0] - b[0])
                  .map(([mes, dif]) => `${nombreMes(mes)}: ${contable(dif)}`)
                  .join(' · ')}
              </li>
            ))}
          </ul>
        </div>
      )}
      {modelo && modelo.mesesConDatos.length > 0 && modelo.chequeos.length === 0 && (
        <p className="mt-5 text-xs font-medium text-exito">
          ✓ Todos los chequeos por grupo cuadran (41, 42, 51, 52, 53, 71, 72, 73).
        </p>
      )}
    </div>
  )
}
