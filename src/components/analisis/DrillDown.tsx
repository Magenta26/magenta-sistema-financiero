import { Fragment, useMemo, useState } from 'react'
import type { ModeloAnalisis } from '../../lib/analisis'
import { moneda } from '../../lib/formato'
import type { MovimientoResumen } from '../../types/catalogo'
import { useTranslation } from '../../hooks/useTranslation'

interface FilaDrill {
  nivel: 0 | 1 | 2
  clave: string
  etiqueta: string
  valorPeriodo: number
  total: number
  /** % de participación dentro de su padre (sobre valores absolutos del período). */
  participacion: number
  expandible: boolean
}

function BarraParticipacion({ porcentaje: pct }: { porcentaje: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-brand-700"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="w-12 text-right text-xs tabular-nums text-tinta-suave">
        {pct.toFixed(1).replace('.', ',')} %
      </span>
    </div>
  )
}

interface DrillDownProps {
  modelo: ModeloAnalisis
  movimientos: MovimientoResumen[]
  /** Clave del período seleccionado. */
  clave: string
  etiquetaPeriodo: string
  etiquetaTotal: string // 'Acumulado año' | 'Total del rango'
}

/** Exploración jerárquica: Rubro → cuentas del catálogo → auxiliares, por período. */
export default function DrillDown({
  modelo,
  movimientos,
  clave,
  etiquetaPeriodo,
  etiquetaTotal,
}: DrillDownProps) {
  const { t } = useTranslation()
  const [rubrosAbiertos, setRubrosAbiertos] = useState<Set<string>>(new Set())
  const [cuentasAbiertas, setCuentasAbiertas] = useState<Set<string>>(new Set())

  const alternar = (conjunto: Set<string>, claveFila: string) => {
    const nuevo = new Set(conjunto)
    if (nuevo.has(claveFila)) nuevo.delete(claveFila)
    else nuevo.add(claveFila)
    return nuevo
  }

  // Meses del período seleccionado y de todo el rango visible
  const mesesPeriodo = useMemo(() => {
    const periodo = modelo.periodos.find((p) => p.clave === clave)
    return new Set((periodo?.meses ?? []).map((m) => m.anio * 100 + m.mes))
  }, [modelo, clave])
  const mesesRango = useMemo(
    () =>
      new Set(modelo.periodos.flatMap((p) => p.meses.map((m) => m.anio * 100 + m.mes))),
    [modelo]
  )

  /** Auxiliares de una cuenta del catálogo, firmados según su naturaleza. */
  const auxiliaresDe = useMemo(() => {
    return (cuentaCatalogo: string, naturaleza: 'CR' | 'DB') => {
      const porAuxiliar = new Map<string, { nombre: string; valorPeriodo: number; total: number }>()
      for (const m of movimientos) {
        if (!m.cuenta.startsWith(cuentaCatalogo)) continue
        const claveMes = m.anio * 100 + m.mes
        if (!mesesRango.has(claveMes)) continue
        const valor =
          naturaleza === 'CR' ? m.mov_credito - m.mov_debito : m.mov_debito - m.mov_credito
        let aux = porAuxiliar.get(m.cuenta)
        if (!aux) {
          aux = { nombre: m.nombre_cuenta, valorPeriodo: 0, total: 0 }
          porAuxiliar.set(m.cuenta, aux)
        }
        aux.total += valor
        if (mesesPeriodo.has(claveMes)) aux.valorPeriodo += valor
      }
      return porAuxiliar
    }
  }, [movimientos, mesesPeriodo, mesesRango])

  const filas = useMemo(() => {
    const resultado: FilaDrill[] = []
    const vp = modelo.valores.get(clave)
    if (!vp) return resultado

    const rubros = [...modelo.rubroInfo.entries()].sort((a, b) => a[1].orden - b[1].orden)
    const totalRubros = rubros.reduce(
      (acc, [codigo]) => acc + Math.abs(vp.rubros.get(codigo) ?? 0),
      0
    )

    // Total del rango por rubro y por cuenta
    const totalRubro = (codigo: string) =>
      modelo.periodos.reduce(
        (acc, p) => acc + (modelo.valores.get(p.clave)?.rubros.get(codigo) ?? 0),
        0
      )
    const totalCuenta = (cuenta: string) =>
      modelo.periodos.reduce(
        (acc, p) => acc + (modelo.valores.get(p.clave)?.cuentas.get(cuenta) ?? 0),
        0
      )

    for (const [codigo, info] of rubros) {
      const valorRubro = vp.rubros.get(codigo) ?? 0
      const cuentasDelRubro = [...modelo.cuentasInfo.entries()]
        .filter(([, c]) => c.rubro_codigo === codigo)
        .sort((a, b) => a[0].localeCompare(b[0]))

      resultado.push({
        nivel: 0,
        clave: codigo,
        etiqueta: t.rubros[codigo] ?? info.nombre,
        valorPeriodo: valorRubro,
        total: totalRubro(codigo),
        participacion: totalRubros === 0 ? 0 : (Math.abs(valorRubro) / totalRubros) * 100,
        expandible: cuentasDelRubro.length > 0,
      })
      if (!rubrosAbiertos.has(codigo)) continue

      const totalCuentas = cuentasDelRubro.reduce(
        (acc, [cuenta]) => acc + Math.abs(vp.cuentas.get(cuenta) ?? 0),
        0
      )
      for (const [cuenta, infoCuenta] of cuentasDelRubro) {
        const valorCuenta = vp.cuentas.get(cuenta) ?? 0
        const auxiliares = auxiliaresDe(cuenta, infoCuenta.naturaleza)
        const tieneAuxiliares =
          auxiliares.size > 1 || (auxiliares.size === 1 && !auxiliares.has(cuenta))
        const claveCuenta = `${codigo}:${cuenta}`
        resultado.push({
          nivel: 1,
          clave: claveCuenta,
          etiqueta: `${cuenta} ${infoCuenta.nombre}`,
          valorPeriodo: valorCuenta,
          total: totalCuenta(cuenta),
          participacion: totalCuentas === 0 ? 0 : (Math.abs(valorCuenta) / totalCuentas) * 100,
          expandible: tieneAuxiliares,
        })
        if (!tieneAuxiliares || !cuentasAbiertas.has(claveCuenta)) continue

        const listaAux = [...auxiliares.entries()].sort((a, b) => a[0].localeCompare(b[0]))
        const totalAux = listaAux.reduce((acc, [, a]) => acc + Math.abs(a.valorPeriodo), 0)
        for (const [codigoAux, aux] of listaAux) {
          resultado.push({
            nivel: 2,
            clave: `${claveCuenta}:${codigoAux}`,
            etiqueta: `${codigoAux} ${aux.nombre}`,
            valorPeriodo: aux.valorPeriodo,
            total: aux.total,
            participacion: totalAux === 0 ? 0 : (Math.abs(aux.valorPeriodo) / totalAux) * 100,
            expandible: false,
          })
        }
      }
    }
    return resultado
  }, [modelo, clave, rubrosAbiertos, cuentasAbiertas, auxiliaresDe, t])

  const alClic = (fila: FilaDrill) => {
    if (!fila.expandible) return
    if (fila.nivel === 0) setRubrosAbiertos((s) => alternar(s, fila.clave))
    else if (fila.nivel === 1) setCuentasAbiertas((s) => alternar(s, fila.clave))
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-borde bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-50 text-left text-xs text-brand-900">
          <tr>
            <th className="px-4 py-2.5 font-semibold">{t.analisis.drillEncabezado}</th>
            <th className="px-4 py-2.5 text-right font-semibold">{etiquetaPeriodo}</th>
            <th className="px-4 py-2.5 text-right font-semibold">{etiquetaTotal}</th>
            <th className="px-4 py-2.5 font-semibold">{t.analisis.drillParticipacion}</th>
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
                  className={`border-t border-borde transition-colors duration-150 ${
                    fila.nivel === 0
                      ? 'cursor-pointer bg-white font-semibold hover:bg-brand-50'
                      : fila.nivel === 1
                        ? `bg-gray-50/60 ${fila.expandible ? 'cursor-pointer hover:bg-brand-50' : ''}`
                        : 'bg-white'
                  }`}
                >
                  <td
                    className={`py-2 pr-3 text-xs ${
                      fila.nivel === 0 ? 'pl-4 text-brand-900' : fila.nivel === 1 ? 'pl-9 text-tinta' : 'pl-14 text-tinta-suave'
                    }`}
                  >
                    {fila.expandible && (
                      <span className="mr-1.5 inline-block w-3 text-tinta-suave">
                        {abierta ? '▾' : '▸'}
                      </span>
                    )}
                    {fila.etiqueta}
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-2 text-right text-xs tabular-nums ${
                      fila.valorPeriodo < 0 ? 'text-red-600' : 'text-tinta'
                    }`}
                  >
                    {moneda(fila.valorPeriodo)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-2 text-right text-xs tabular-nums ${
                      fila.total < 0 ? 'text-red-600' : 'text-tinta-suave'
                    }`}
                  >
                    {moneda(fila.total)}
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
