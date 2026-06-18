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
import { useTranslation } from '../../hooks/useTranslation'

interface GraficoTendenciaProps {
  series: SeriePunto[]
  titulo: string
  /** Alto del área de gráfico (para igualar la fila de 3). */
  altura?: number
}

/** Barras de ingresos y costos+gastos con la utilidad neta superpuesta. */
export default function GraficoTendencia({ series, titulo, altura = 280 }: GraficoTendenciaProps) {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl border border-borde bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-brand-900">{titulo}</h2>
      <ResponsiveContainer width="100%" height={altura}>
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
          <Bar name={t.analisis.graficoIngresos} dataKey="ingresos" fill={COLORES.principal} radius={[4, 4, 0, 0]} />
          <Bar name={t.analisis.graficoCostosGastos} dataKey="costosGastos" fill={COLORES.suave} radius={[4, 4, 0, 0]} />
          <Line
            name={t.analisis.graficoUtilidadNeta}
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
