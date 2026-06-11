import { Fragment, useMemo, useState } from 'react'
import type { ModeloEr } from '../../lib/estadoResultados'
import { moneda } from '../../lib/formato'
import type { MovimientoResumen } from '../../types/catalogo'

interface FilaDrill {
  nivel: 0 | 1 | 2
  clave: string
  etiqueta: string
  valorMes: number
  acumulado: number
  /** % de participación dentro de su padre (sobre valores absolutos del mes). */
  participacion: number
  expandible: boolean
}

function BarraParticipacion({ porcentaje: pct }: { porcentaje: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ciruela-800">
        <div
          className="h-full rounded-full bg-magenta-500"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="w-12 text-right font-mono text-xs text-ciruela-400">
        {pct.toFixed(1).replace('.', ',')} %
      </span>
    </div>
  )
}

interface DrillDownProps {
  modelo: ModeloEr
  movimientos: MovimientoResumen[]
  mes: number
}

/** Exploración jerárquica: Rubro → cuentas del catálogo → auxiliares. */
export default function DrillDown({ modelo, movimientos, mes }: DrillDownProps) {
  const [rubrosAbiertos, setRubrosAbiertos] = useState<Set<string>>(new Set())
  const [cuentasAbiertas, setCuentasAbiertas] = useState<Set<string>>(new Set())

  const alternar = (conjunto: Set<string>, clave: string) => {
    const nuevo = new Set(conjunto)
    if (nuevo.has(clave)) nuevo.delete(clave)
    else nuevo.add(clave)
    return nuevo
  }

  /** Auxiliares de una cuenta del catálogo, firmados según su naturaleza. */
  const auxiliaresDe = useMemo(() => {
    return (cuentaCatalogo: string, naturaleza: 'CR' | 'DB') => {
      const porAuxiliar = new Map<string, { nombre: string; valorMes: number; acumulado: number }>()
      for (const m of movimientos) {
        if (!m.cuenta.startsWith(cuentaCatalogo)) continue
        const valor =
          naturaleza === 'CR' ? m.mov_credito - m.mov_debito : m.mov_debito - m.mov_credito
        let aux = porAuxiliar.get(m.cuenta)
        if (!aux) {
          aux = { nombre: m.nombre_cuenta, valorMes: 0, acumulado: 0 }
          porAuxiliar.set(m.cuenta, aux)
        }
        aux.acumulado += valor
        if (m.mes === mes) aux.valorMes += valor
      }
      return porAuxiliar
    }
  }, [movimientos, mes])

  const filas = useMemo(() => {
    const resultado: FilaDrill[] = []
    const totalRubros = modelo.rubros.reduce(
      (acc, r) => acc + Math.abs(r.valores.get(mes) ?? 0),
      0
    )

    for (const rubro of modelo.rubros) {
      const valorRubro = rubro.valores.get(mes) ?? 0
      resultado.push({
        nivel: 0,
        clave: rubro.codigo,
        etiqueta: rubro.nombre,
        valorMes: valorRubro,
        acumulado: rubro.totalAnio,
        participacion: totalRubros === 0 ? 0 : (Math.abs(valorRubro) / totalRubros) * 100,
        expandible: rubro.cuentas.length > 0,
      })
      if (!rubrosAbiertos.has(rubro.codigo)) continue

      const totalCuentas = rubro.cuentas.reduce(
        (acc, c) => acc + Math.abs(c.valores.get(mes) ?? 0),
        0
      )
      for (const cuenta of rubro.cuentas) {
        const valorCuenta = cuenta.valores.get(mes) ?? 0
        const auxiliares = auxiliaresDe(cuenta.cuenta, cuenta.naturaleza)
        const tieneAuxiliares =
          auxiliares.size > 1 || (auxiliares.size === 1 && !auxiliares.has(cuenta.cuenta))
        const claveCuenta = `${rubro.codigo}:${cuenta.cuenta}`
        resultado.push({
          nivel: 1,
          clave: claveCuenta,
          etiqueta: `${cuenta.cuenta} ${cuenta.nombre}`,
          valorMes: valorCuenta,
          acumulado: cuenta.totalAnio,
          participacion: totalCuentas === 0 ? 0 : (Math.abs(valorCuenta) / totalCuentas) * 100,
          expandible: tieneAuxiliares,
        })
        if (!tieneAuxiliares || !cuentasAbiertas.has(claveCuenta)) continue

        const listaAux = [...auxiliares.entries()].sort((a, b) => a[0].localeCompare(b[0]))
        const totalAux = listaAux.reduce((acc, [, a]) => acc + Math.abs(a.valorMes), 0)
        for (const [codigoAux, aux] of listaAux) {
          resultado.push({
            nivel: 2,
            clave: `${claveCuenta}:${codigoAux}`,
            etiqueta: `${codigoAux} ${aux.nombre}`,
            valorMes: aux.valorMes,
            acumulado: aux.acumulado,
            participacion: totalAux === 0 ? 0 : (Math.abs(aux.valorMes) / totalAux) * 100,
            expandible: false,
          })
        }
      }
    }
    return resultado
  }, [modelo, mes, rubrosAbiertos, cuentasAbiertas, auxiliaresDe])

  const alClic = (fila: FilaDrill) => {
    if (!fila.expandible) return
    if (fila.nivel === 0) setRubrosAbiertos((s) => alternar(s, fila.clave))
    else if (fila.nivel === 1) setCuentasAbiertas((s) => alternar(s, fila.clave))
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-ciruela-800 bg-ciruela-900/40">
      <table className="w-full text-sm">
        <thead className="bg-ciruela-900 text-left text-xs text-ciruela-400">
          <tr>
            <th className="px-4 py-2.5 font-medium">Rubro / cuenta / auxiliar</th>
            <th className="px-4 py-2.5 text-right font-medium">Mes</th>
            <th className="px-4 py-2.5 text-right font-medium">Acumulado año</th>
            <th className="px-4 py-2.5 font-medium">Participación</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => {
            const abierta =
              fila.nivel === 0 ? rubrosAbiertos.has(fila.clave) : cuentasAbiertas.has(fila.clave)
            return (
              <Fragment key={fila.clave}>
                <tr
                  onClick={() => alClic(fila)}
                  className={`border-t border-ciruela-800/50 ${
                    fila.nivel === 0
                      ? 'cursor-pointer bg-ciruela-950/70 font-semibold hover:bg-ciruela-900'
                      : fila.nivel === 1
                        ? `bg-ciruela-950/30 ${fila.expandible ? 'cursor-pointer hover:bg-ciruela-900/60' : ''}`
                        : 'bg-ciruela-950/10'
                  }`}
                >
                  <td
                    className={`py-2 pr-3 text-xs ${
                      fila.nivel === 0 ? 'pl-4 text-white' : fila.nivel === 1 ? 'pl-9 text-ciruela-200' : 'pl-14 text-ciruela-300'
                    }`}
                  >
                    {fila.expandible && (
                      <span className="mr-1.5 inline-block w-3 text-ciruela-400">
                        {abierta ? '▾' : '▸'}
                      </span>
                    )}
                    {fila.etiqueta}
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-2 text-right font-mono text-xs ${
                      fila.valorMes < 0 ? 'text-red-400' : 'text-ciruela-100'
                    }`}
                  >
                    {moneda(fila.valorMes)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-2 text-right font-mono text-xs ${
                      fila.acumulado < 0 ? 'text-red-400' : 'text-ciruela-300'
                    }`}
                  >
                    {moneda(fila.acumulado)}
                  </td>
                  <td className="px-4 py-2">
                    <BarraParticipacion porcentaje={fila.participacion} />
                  </td>
                </tr>
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
