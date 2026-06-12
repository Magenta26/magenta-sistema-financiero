import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SeriePunto } from '../../lib/analisis'
import { COLORES } from './colores'
import { TooltipPorcentaje } from './graficos'

/** Evolución de los márgenes bruto, operacional y neto (% de ingresos). */
export default function GraficoMargenes({ series }: { series: SeriePunto[] }) {
  return (
    <div className="rounded-2xl border border-borde bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-brand-900">Evolución de márgenes</h2>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={series} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={COLORES.grilla} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="etiqueta" tick={{ fill: COLORES.ejes, fontSize: 11 }} axisLine={{ stroke: COLORES.grilla }} tickLine={false} />
          <YAxis
            tickFormatter={(v: number) => `${v} %`}
            tick={{ fill: COLORES.ejes, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<TooltipPorcentaje />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line name="Margen bruto" dataKey="margenBruto" stroke={COLORES.medio} strokeWidth={2} dot={{ r: 2.5 }} type="monotone" />
          <Line name="Margen operacional" dataKey="margenOperacional" stroke={COLORES.suave} strokeWidth={2} dot={{ r: 2.5 }} type="monotone" />
          <Line name="Margen neto" dataKey="margenNeto" stroke={COLORES.principal} strokeWidth={2.5} dot={{ r: 3 }} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
