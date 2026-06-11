import { moneda, monedaCompacta, porcentaje } from '../../lib/formato'

interface VariacionProps {
  etiqueta: string
  valor: number | null
}

function Variacion({ etiqueta, valor }: VariacionProps) {
  if (valor === null) {
    return (
      <p className="text-xs text-gray-400">
        {etiqueta}: <span>—</span>
      </p>
    )
  }
  const positiva = valor >= 0
  return (
    <p className="text-xs text-tinta-suave">
      {etiqueta}:{' '}
      <span className={positiva ? 'font-semibold text-exito' : 'font-semibold text-red-600'}>
        {positiva ? '▲' : '▼'} {porcentaje(Math.abs(valor))}
      </span>
    </p>
  )
}

interface TarjetaKpiProps {
  etiqueta: string
  valor: number
  /** % sobre ingresos del mes. */
  margen?: number | null
  varMesAnterior?: number | null
  varPromedio?: number | null
  destacada?: boolean
}

export default function TarjetaKpi({
  etiqueta,
  valor,
  margen,
  varMesAnterior,
  varPromedio,
  destacada,
}: TarjetaKpiProps) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        destacada ? 'border-brand-200 bg-brand-50' : 'border-borde bg-white'
      }`}
    >
      <p className="text-xs text-tinta-suave">{etiqueta}</p>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums ${valor < 0 ? 'text-red-600' : 'text-brand-900'}`}
        title={`$${moneda(valor).slice(1)}`}
      >
        {monedaCompacta(valor)}
      </p>
      {margen !== undefined && margen !== null && (
        <p className="mt-0.5 text-xs font-semibold text-brand-700">
          margen {porcentaje(margen)}
        </p>
      )}
      <div className="mt-2 space-y-0.5">
        {varMesAnterior !== undefined && <Variacion etiqueta="vs mes anterior" valor={varMesAnterior} />}
        {varPromedio !== undefined && <Variacion etiqueta="vs promedio del año" valor={varPromedio} />}
      </div>
    </div>
  )
}
