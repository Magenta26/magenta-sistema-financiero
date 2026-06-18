import type { ReactElement } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { LineaTornado } from '../../lib/analisis'
import { moneda, monedaMillones } from '../../lib/formato'
import { COLORES } from './colores'
import { useTranslation } from '../../hooks/useTranslation'
import type { Diccionario } from '../../i18n/es'

/** Convención de color (consistente): ingresos y utilidades en magenta; costos
 *  y gastos en teal; utilidad neta destacada (ciruela); EBITDA en magenta medio. */
const COLOR_TIPO: Record<LineaTornado['tipo'], string> = {
  ingreso: COLORES.principal, // brand-700
  costo: COLORES.teal,
  utilidad: COLORES.principal, // brand-700
  utilidadNeta: COLORES.profundo, // brand-900 (destacada)
  ebitda: COLORES.medio, // brand-500
}

function etiquetaRubro(clave: string, t: Diccionario): string {
  if (t.rubros[clave]) return t.rubros[clave]
  if (clave === 'EBITDA') return t.er.ebitda
  return t.derivadas[clave] ?? clave
}

interface DatoTornado {
  etiqueta: string
  x: number
  valor: number
  color: string
}

interface PropsTooltip {
  active?: boolean
  payload?: Array<{ payload?: DatoTornado }>
}

function TooltipTornado({ active, payload }: PropsTooltip) {
  const d = payload?.[0]?.payload
  if (!active || !d) return null
  return (
    <div className="rounded-lg border border-borde bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-brand-900">{d.etiqueta}</p>
      <p className="mt-1 tabular-nums text-tinta">{moneda(d.valor)}</p>
    </div>
  )
}

interface GraficoTornadoProps {
  lineas: LineaTornado[]
  titulo: string
  /** Alto del área de gráfico (para igualar la fila de 3). */
  altura?: number
}

/** Tornado de magnitudes del Estado de Resultados, centrado en 0. */
export default function GraficoTornado({ lineas, titulo, altura }: GraficoTornadoProps) {
  const { t } = useTranslation()
  const datos: DatoTornado[] = lineas.map((l) => ({
    etiqueta: etiquetaRubro(l.clave, t),
    x: l.x,
    valor: l.valor,
    color: COLOR_TIPO[l.tipo],
  }))
  // A ancho completo damos holgura al dominio (×1.3) para que las etiquetas de
  // dato (millones COP) no se encimen con los bordes.
  const maxAbs = Math.max(1, ...datos.map((d) => Math.abs(d.x)))

  // Etiqueta de dato (millones COP) al extremo EXTERIOR de cada barra.
  const renderEtiqueta = (props: {
    x?: string | number
    y?: string | number
    width?: string | number
    height?: string | number
    index?: number
  }): ReactElement => {
    const x = Number(props.x ?? 0)
    const y = Number(props.y ?? 0)
    const width = Number(props.width ?? 0)
    const height = Number(props.height ?? 0)
    const d = datos[props.index ?? 0]
    const positivo = (d?.x ?? 0) >= 0
    const px = positivo ? x + width + 6 : x - 6
    return (
      <text
        x={px}
        y={y + height / 2}
        dy={3}
        textAnchor={positivo ? 'start' : 'end'}
        fontSize={10}
        fill={COLORES.ejes}
      >
        {monedaMillones(d?.valor ?? 0)}
      </text>
    )
  }

  return (
    <div className="rounded-2xl border border-borde bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-brand-900">{titulo}</h2>
      <ResponsiveContainer width="100%" height={altura ?? Math.max(360, datos.length * 34)}>
        <BarChart
          data={datos}
          layout="vertical"
          margin={{ top: 0, right: 96, bottom: 0, left: 8 }}
        >
          {/* Eje X oculto (sin escala numérica abajo); conserva el dominio para
              escalar las barras. Las etiquetas de dato sobre las barras quedan. */}
          <XAxis type="number" domain={[-maxAbs * 1.3, maxAbs * 1.3]} hide />
          <YAxis
            type="category"
            dataKey="etiqueta"
            width={232}
            tick={{ fill: '#1f2430', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine x={0} stroke={COLORES.ejes} />
          <Tooltip content={<TooltipTornado />} cursor={{ fill: 'rgba(122,27,92,0.05)' }} />
          <Bar dataKey="x" radius={2} isAnimationActive={false}>
            {datos.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
            <LabelList content={renderEtiqueta} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
