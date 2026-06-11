import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { moneda, monedaCompacta } from '../../lib/formato'
import { PALETA_DONUT } from './colores'

export interface PorcionDonut {
  nombre: string
  valor: number
  topCuentas: { nombre: string; valor: number }[]
}

interface PropsTooltipDonut {
  active?: boolean
  payload?: Array<{ payload?: PorcionDonut; value?: number | string }>
}

function TooltipDonut({ active, payload }: PropsTooltipDonut) {
  const porcion = payload?.[0]?.payload
  if (!active || !porcion) return null
  return (
    <div className="max-w-72 rounded-lg border border-borde bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-brand-900">
        {porcion.nombre}: <span className="tabular-nums">{moneda(porcion.valor)}</span>
      </p>
      {porcion.topCuentas.length > 0 && (
        <>
          <p className="mt-1.5 text-tinta-suave">Principales cuentas:</p>
          <ul className="mt-0.5 space-y-0.5">
            {porcion.topCuentas.map((c) => (
              <li key={c.nombre} className="text-tinta">
                {c.nombre}: <span className="tabular-nums">{monedaCompacta(c.valor)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

interface DonutComposicionProps {
  titulo: string
  porciones: PorcionDonut[]
}

/** Donut por rubro con detalle de las top cuentas al pasar el mouse. */
export default function DonutComposicion({ titulo, porciones }: DonutComposicionProps) {
  const conDatos = porciones.filter((p) => Math.abs(p.valor) > 0.005)
  const total = conDatos.reduce((acc, p) => acc + Math.abs(p.valor), 0)

  return (
    <div className="rounded-2xl border border-borde bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-brand-900">{titulo}</h2>
      {conDatos.length === 0 ? (
        <p className="py-16 text-center text-xs text-tinta-suave">Sin datos para el mes seleccionado.</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-tinta-suave">
            Total: <span className="tabular-nums text-tinta">{moneda(total)}</span>
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={conDatos}
                dataKey="valor"
                nameKey="nombre"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                stroke="#ffffff"
              >
                {conDatos.map((_, i) => (
                  <Cell key={i} fill={PALETA_DONUT[i % PALETA_DONUT.length]} />
                ))}
              </Pie>
              <Tooltip content={<TooltipDonut />} />
              <Legend
                formatter={(nombre: string) => {
                  const porcion = conDatos.find((p) => p.nombre === nombre)
                  const pct = porcion && total > 0 ? ((Math.abs(porcion.valor) / total) * 100).toFixed(0) : '0'
                  return `${nombre} (${pct} %)`
                }}
                wrapperStyle={{ fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
