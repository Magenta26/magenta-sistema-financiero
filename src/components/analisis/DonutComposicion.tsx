import type { ReactElement } from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { moneda, monedaCompacta } from '../../lib/formato'
import { PALETA_DONUT } from './colores'
import { useTranslation } from '../../hooks/useTranslation'

export interface PorcionDonut {
  nombre: string
  valor: number
  topCuentas: { nombre: string; valor: number }[]
}

interface SegmentoDonut extends PorcionDonut {
  porcentaje: number
  color: string
}

/** % mínimo para etiquetar el arco (los más chicos se leen en tooltip/leyenda). */
const UMBRAL_ETIQUETA = 5

/** Texto legible (blanco u oscuro) según la luminancia del color del segmento. */
function textoSobre(hex: string): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminancia > 0.6 ? '#501040' : '#ffffff' // brand-900 sobre claros; blanco sobre oscuros
}

interface PropsTooltipDonut {
  active?: boolean
  payload?: Array<{ payload?: SegmentoDonut }>
}

/** Tooltip tipo tarjeta reutilizado por las tres donas. */
function TooltipDonut({ active, payload }: PropsTooltipDonut) {
  const { t } = useTranslation()
  const s = payload?.[0]?.payload
  if (!active || !s) return null
  return (
    <div className="max-w-72 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs shadow-lg">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
          style={{ backgroundColor: s.color }}
        />
        <span className="font-semibold text-brand-900">{s.nombre}</span>
      </div>
      <div className="mt-1.5 space-y-0.5">
        <p className="text-tinta">
          <span className="text-tinta-suave">{t.analisis.donaValor} </span>
          <span className="tabular-nums">{moneda(s.valor)}</span>
        </p>
        <p className="text-tinta">
          <span className="text-tinta-suave">{t.analisis.donaParticipacion} </span>
          <span className="tabular-nums">{s.porcentaje.toFixed(0)} %</span>
        </p>
      </div>
      {s.topCuentas.length > 0 && (
        <div className="mt-2 border-t border-gray-100 pt-1.5">
          <p className="text-tinta-suave">{t.analisis.donaPrincipales}</p>
          <ul className="mt-0.5 space-y-0.5">
            {s.topCuentas.map((c) => (
              <li key={c.nombre} className="text-tinta">
                {c.nombre}: <span className="tabular-nums">{monedaCompacta(c.valor)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

interface DonutComposicionProps {
  titulo: string
  porciones: PorcionDonut[]
  /** Nota aclaratoria opcional al pie de la tarjeta. */
  nota?: string
}

/** Donut por rubro con % sobre cada arco y detalle al pasar el mouse. */
export default function DonutComposicion({ titulo, porciones, nota }: DonutComposicionProps) {
  const { t } = useTranslation()
  const conDatos = porciones.filter((p) => Math.abs(p.valor) > 0.005)
  const total = conDatos.reduce((acc, p) => acc + Math.abs(p.valor), 0)
  const datos: SegmentoDonut[] = conDatos.map((p, i) => ({
    ...p,
    porcentaje: total > 0 ? (Math.abs(p.valor) / total) * 100 : 0,
    color: PALETA_DONUT[i % PALETA_DONUT.length],
  }))

  // Etiqueta de % en el centro radial del arco; oculta los segmentos chicos.
  const renderEtiqueta = (props: {
    cx?: number | string
    cy?: number | string
    midAngle?: number
    innerRadius?: number | string
    outerRadius?: number | string
    index?: number
  }): ReactElement | null => {
    const seg = datos[props.index ?? 0]
    if (!seg || seg.porcentaje < UMBRAL_ETIQUETA) return null
    const cx = Number(props.cx ?? 0)
    const cy = Number(props.cy ?? 0)
    const innerR = Number(props.innerRadius ?? 0)
    const outerR = Number(props.outerRadius ?? 0)
    const RADIAN = Math.PI / 180
    const r = innerR + (outerR - innerR) / 2
    const x = cx + r * Math.cos(-(props.midAngle ?? 0) * RADIAN)
    const y = cy + r * Math.sin(-(props.midAngle ?? 0) * RADIAN)
    return (
      <text
        x={x}
        y={y}
        fill={textoSobre(seg.color)}
        fontSize={11}
        fontWeight={500}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {seg.porcentaje.toFixed(0)} %
      </text>
    )
  }

  return (
    <div className="rounded-2xl border border-borde bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-brand-900">{titulo}</h2>
      {datos.length === 0 ? (
        <p className="py-16 text-center text-xs text-tinta-suave">{t.analisis.donaSinDatos}</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-tinta-suave">
            {t.analisis.donaTotal} <span className="tabular-nums text-tinta">{moneda(total)}</span>
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={datos}
                dataKey="valor"
                nameKey="nombre"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                stroke="#ffffff"
                label={renderEtiqueta}
                labelLine={false}
              >
                {datos.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip content={<TooltipDonut />} />
              <Legend
                formatter={(nombre: string) => {
                  const seg = datos.find((p) => p.nombre === nombre)
                  return `${nombre} (${(seg?.porcentaje ?? 0).toFixed(0)} %)`
                }}
                wrapperStyle={{ fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </>
      )}
      {nota && <p className="mt-2 text-xs text-gray-400">{nota}</p>}
    </div>
  )
}
