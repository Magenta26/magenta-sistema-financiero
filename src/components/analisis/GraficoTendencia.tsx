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
import type { SeriePunto } from '../../lib/analisis'
import { monedaCompacta } from '../../lib/formato'
import { COLORES } from './colores'
import { TooltipPesos } from './graficos'

interface GraficoTendenciaProps {
  series: SeriePunto[]
  titulo: string
}

/** Barras de ingresos y costos+gastos con la utilidad neta superpuesta. */
export default function GraficoTendencia({ series, titulo }: GraficoTendenciaProps) {
  return (
    <div className="rounded-2xl border border-borde bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-brand-900">{titulo}</h2>
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
          <Tooltip content={<TooltipPesos />} cursor={{ fill: 'rgba(122,27,92,0.05)' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: COLORES.ejes }} />
          <Bar name="Ingresos" dataKey="ingresos" fill={COLORES.principal} radius={[4, 4, 0, 0]} />
          <Bar name="Costos y gastos" dataKey="costosGastos" fill={COLORES.suave} radius={[4, 4, 0, 0]} />
          <Line
            name="Utilidad neta"
            dataKey="utilidadNeta"
            stroke={COLORES.exito}
            strokeWidth={2.5}
            dot={{ r: 3, fill: COLORES.exito }}
            type="monotone"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
