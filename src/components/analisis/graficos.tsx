/** Tooltips compartidos de los gráficos del análisis. */
import { moneda, porcentaje } from '../../lib/formato'

interface EntradaTooltip {
  name?: string | number
  value?: number | string
  color?: string
}

interface PropsTooltip {
  active?: boolean
  label?: string | number
  payload?: EntradaTooltip[]
}

/** Tooltip genérico en pesos (formato es-CO). */
export function TooltipPesos({ active, label, payload }: PropsTooltip) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-borde bg-white px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <p className="mb-1 font-semibold text-brand-900">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? '#1f2430' }}>
          {p.name}: <span className="tabular-nums">{moneda(Number(p.value ?? 0))}</span>
        </p>
      ))}
    </div>
  )
}

/** Tooltip genérico en porcentaje. */
export function TooltipPorcentaje({ active, label, payload }: PropsTooltip) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-borde bg-white px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <p className="mb-1 font-semibold text-brand-900">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? '#1f2430' }}>
          {p.name}: <span className="tabular-nums">{porcentaje(Number(p.value ?? 0))}</span>
        </p>
      ))}
    </div>
  )
}
