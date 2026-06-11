import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SerieMensual } from '../../lib/analisis'
import { monedaCompacta } from '../../lib/formato'
import { COLORES } from './colores'
import { TooltipPesos } from './graficos'

/** Barras de ingresos y costos+gastos con la utilidad neta superpuesta. */
export default function GraficoTendencia({ series }: { series: SerieMensual[] }) {
  return (
    <div className="rounded-2xl border border-ciruela-800 bg-ciruela-900/60 p-4">
      <h2 className="mb-3 text-sm font-semibold text-white">Tendencia mensual</h2>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={series} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
          <CartesianGrid stroke={COLORES.grilla} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="etiqueta" tick={{ fill: COLORES.ejes, fontSize: 11 }} axisLine={{ stroke: COLORES.grilla }} tickLine={false} />
          <YAxis
            tickFormatter={(v: number) => monedaCompacta(v)}
            tick={{ fill: COLORES.ejes, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip content={<TooltipPesos />} cursor={{ fill: 'rgba(227,33,155,0.06)' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: COLORES.ejes }} />
          <Bar name="Ingresos" dataKey="ingresos" fill={COLORES.magenta} radius={[4, 4, 0, 0]} />
          <Bar name="Costos y gastos" dataKey="costosGastos" fill={COLORES.ciruelaBarra} radius={[4, 4, 0, 0]} />
          <Line
            name="Utilidad neta"
            dataKey="utilidadNeta"
            stroke={COLORES.teal}
            strokeWidth={2.5}
            dot={{ r: 3, fill: COLORES.teal }}
            type="monotone"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
