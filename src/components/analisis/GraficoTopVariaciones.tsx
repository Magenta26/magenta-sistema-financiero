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
    <div className="max-w-72 rounded-lg border border-borde bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-brand-900">
        {v.cuenta} {v.nombre}
      </p>
      <p className="text-tinta-suave">{v.rubro}</p>
      <p className="mt-1 text-tinta">
        Anterior: <span className="tabular-nums">{moneda(v.anterior)}</span>
      </p>
      <p className="text-tinta">
        Actual: <span className="tabular-nums">{moneda(v.actual)}</span>
      </p>
      <p className={v.delta >= 0 ? 'mt-1 font-semibold text-brand-700' : 'mt-1 font-semibold text-exito'}>
        Variación: <span className="tabular-nums">{moneda(v.delta)}</span>
      </p>
    </div>
  )
}

interface GraficoTopVariacionesProps {
  variaciones: VariacionCuenta[]
  /** 'mes' | 'trimestre' | 'año' según la vista activa. */
  sustantivoPeriodo: string
}

/** Top cuentas por cambio absoluto vs el período anterior: barras divergentes. */
export default function GraficoTopVariaciones({
  variaciones,
  sustantivoPeriodo,
}: GraficoTopVariacionesProps) {
  const datos = variaciones.map((v) => ({
    ...v,
    etiqueta: `${v.cuenta} ${v.nombre.length > 22 ? v.nombre.slice(0, 22) + '…' : v.nombre}`,
  }))

  return (
    <div className="rounded-2xl border border-borde bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-brand-900">
        ¿Qué movió el resultado este {sustantivoPeriodo}?
      </h2>
      <p className="mb-2 text-xs text-tinta-suave">
        Top {datos.length} cuentas por variación absoluta vs el {sustantivoPeriodo} anterior —{' '}
        <span className="font-semibold text-brand-700">aumentos</span> /{' '}
        <span className="font-semibold text-exito">disminuciones</span>
      </p>
      {datos.length === 0 ? (
        <p className="py-16 text-center text-xs text-tinta-suave">
          No hay {sustantivoPeriodo} anterior para comparar.
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
              tick={{ fill: '#1f2430', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine x={0} stroke={COLORES.ejes} />
            <Tooltip content={<TooltipVariacion />} cursor={{ fill: 'rgba(122,27,92,0.05)' }} />
            <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
              {datos.map((v, i) => (
                <Cell key={i} fill={v.delta >= 0 ? COLORES.principal : COLORES.exito} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
