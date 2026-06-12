import { moneda, monedaCompacta, porcentaje } from '../../lib/formato'

interface VariacionProps {
  etiqueta: string
  valor: number | null
  /** true: crecer es malo (gastos) — al alza en rojo, a la baja en verde. */
  invertir?: boolean
}

function Variacion({ etiqueta, valor, invertir }: VariacionProps) {
  if (valor === null) {
    return (
      <p className="text-xs text-gray-400">
        {etiqueta}: <span>—</span>
      </p>
    )
  }
  const sube = valor >= 0
  const buena = invertir ? !sube : sube
  return (
    <p className="text-xs text-tinta-suave">
      {etiqueta}:{' '}
      <span className={buena ? 'font-semibold text-exito' : 'font-semibold text-red-600'}>
        {sube ? '▲' : '▼'} {porcentaje(Math.abs(valor))}
      </span>
    </p>
  )
}

interface TarjetaKpiProps {
  etiqueta: string
  valor: number
  porcentaje?: number | null
  etiquetaPorcentaje?: string
  varAnterior?: number | null
  varPromedio?: number | null
  etiquetaAnterior: string // 'vs mes anterior' | 'vs trimestre anterior' | 'vs año anterior'
  invertirColor?: boolean
  /** Líneas del tooltip ⓘ (transparencia del cálculo, ej. cuentas del EBITDA). */
  tooltip?: string[]
}

export default function TarjetaKpi({
  etiqueta,
  valor,
  porcentaje: pct,
  etiquetaPorcentaje,
  varAnterior,
  varPromedio,
  etiquetaAnterior,
  invertirColor,
  tooltip,
}: TarjetaKpiProps) {
  return (
    <div className="rounded-2xl border border-borde bg-white p-4 shadow-sm">
      <p className="flex items-center gap-1.5 text-xs text-tinta-suave">
        {etiqueta}
        {tooltip && tooltip.length > 0 && (
          <span className="group relative inline-block">
            <span
              aria-label={`Detalle de ${etiqueta}`}
              className="cursor-help rounded-full text-brand-700"
            >
              ⓘ
            </span>
            <span className="invisible absolute left-1/2 top-5 z-20 w-72 -translate-x-1/2 rounded-lg border border-borde bg-white p-3 text-left text-xs text-tinta shadow-lg group-hover:visible">
              {tooltip.map((linea, i) => (
                <span key={i} className="block leading-relaxed">
                  {linea}
                </span>
              ))}
            </span>
          </span>
        )}
      </p>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums ${valor < 0 ? 'text-red-600' : 'text-brand-900'}`}
        title={`$${moneda(valor).slice(1)}`}
      >
        {monedaCompacta(valor)}
      </p>
      {pct !== undefined && pct !== null && (
        <p className="mt-0.5 text-xs font-semibold text-brand-700">
          {porcentaje(pct)} {etiquetaPorcentaje}
        </p>
      )}
      <div className="mt-2 space-y-0.5">
        {varAnterior !== undefined && (
          <Variacion etiqueta={etiquetaAnterior} valor={varAnterior} invertir={invertirColor} />
        )}
        {varPromedio !== undefined && (
          <Variacion etiqueta="vs promedio" valor={varPromedio} invertir={invertirColor} />
        )}
      </div>
    </div>
  )
}
