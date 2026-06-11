import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { VariacionCuenta } from '../../lib/analisis'
import { moneda, monedaCompacta } from '../../lib/formato'
import { COLORES } from './colores'

interface PropsTooltipVariacion {
  active?: boolean
  payload?: Array<{ payload?: VariacionCuenta }>
}

function TooltipVariacion({ active, payload }: PropsTooltipVariacion) {
  const v = payload?.[0]?.payload
  if (!active || !v) return null
  return (
    <div className="max-w-72 rounded-lg border border-ciruela-700 bg-ciruela-950 px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-white">
        {v.cuenta} {v.nombre}
      </p>
      <p className="text-ciruela-400">{v.rubro}</p>
      <p className="mt-1 text-ciruela-200">
        Anterior: <span className="font-mono">{moneda(v.anterior)}</span>
      </p>
      <p className="text-ciruela-200">
        Actual: <span className="font-mono">{moneda(v.actual)}</span>
      </p>
      <p className={v.delta >= 0 ? 'mt-1 font-semibold text-magenta-300' : 'mt-1 font-semibold text-teal-300'}>
        Variación: <span className="font-mono">{moneda(v.delta)}</span>
      </p>
    </div>
  )
}

/** Top cuentas por cambio absoluto vs mes anterior: barras divergentes. */
export default function GraficoTopVariaciones({ variaciones }: { variaciones: VariacionCuenta[] }) {
  const datos = variaciones.map((v) => ({
    ...v,
    etiqueta: `${v.cuenta} ${v.nombre.length > 22 ? v.nombre.slice(0, 22) + '…' : v.nombre}`,
  }))

  return (
    <div className="rounded-2xl border border-ciruela-800 bg-ciruela-900/60 p-4">
      <h2 className="mb-1 text-sm font-semibold text-white">¿Qué movió el resultado este mes?</h2>
      <p className="mb-2 text-xs text-ciruela-400">
        Top {datos.length} cuentas por variación absoluta vs el mes anterior —{' '}
        <span className="text-magenta-300">aumentos</span> /{' '}
        <span className="text-teal-300">disminuciones</span>
      </p>
      {datos.length === 0 ? (
        <p className="py-16 text-center text-xs text-ciruela-400">
          No hay mes anterior para comparar.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(240, datos.length * 32)}>
          <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
            <XAxis
              type="number"
              tickFormatter={(v: number) => monedaCompacta(v)}
              tick={{ fill: COLORES.ejes, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="etiqueta"
              width={210}
              tick={{ fill: '#d9c3e0', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine x={0} stroke={COLORES.ejes} />
            <Tooltip content={<TooltipVariacion />} cursor={{ fill: 'rgba(227,33,155,0.06)' }} />
            <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
              {datos.map((v, i) => (
                <Cell key={i} fill={v.delta >= 0 ? COLORES.magenta : COLORES.teal} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
