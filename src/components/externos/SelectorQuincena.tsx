import { useTranslation } from '../../hooks/useTranslation'
import { nombreMes } from '../../types/balance'
import type { Quincena } from '../../types/externos'

export interface PeriodoQuincena {
  anio: number
  mes: number
  quincena: Quincena
}

interface Props {
  /** Años seleccionables (incluye el año en curso). */
  anios: number[]
  periodo: PeriodoQuincena
  onCambiar: (periodo: PeriodoQuincena) => void
}

/** Selector de quincena: año + mes + quincena (1: 1–15 | 2: 16–fin). */
export default function SelectorQuincena({ anios, periodo, onCambiar }: Props) {
  const { t } = useTranslation()
  const q = t.externos.quincena

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <label className="block text-xs font-semibold text-tinta-suave" htmlFor="quincena-anio">
          {t.comun.anio}
        </label>
        <select
          id="quincena-anio"
          value={periodo.anio}
          onChange={(e) => onCambiar({ ...periodo, anio: Number(e.target.value) })}
          className="mt-1 rounded-lg border border-borde bg-white px-3 py-2 text-sm tabular-nums text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
        >
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-tinta-suave" htmlFor="quincena-mes">
          {q.mes}
        </label>
        <select
          id="quincena-mes"
          value={periodo.mes}
          onChange={(e) => onCambiar({ ...periodo, mes: Number(e.target.value) })}
          className="mt-1 rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {nombreMes(m)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className="block text-xs font-semibold text-tinta-suave">{q.label}</span>
        <div className="mt-1 inline-flex rounded-lg border border-borde bg-white p-0.5" role="group" aria-label={q.label}>
          {([1, 2] as Quincena[]).map((quin) => (
            <button
              key={quin}
              type="button"
              onClick={() => onCambiar({ ...periodo, quincena: quin })}
              aria-pressed={periodo.quincena === quin}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                periodo.quincena === quin
                  ? 'bg-brand-700 text-white'
                  : 'text-tinta-suave hover:text-brand-900'
              }`}
            >
              {quin === 1 ? q.primera : q.segunda}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
