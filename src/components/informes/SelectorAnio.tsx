import { useTranslation } from '../../hooks/useTranslation'

interface SelectorAnioProps {
  anios: number[]
  anioSel: number
  onCambiar: (anio: number) => void
}

/** Segmented control para elegir el año (solo años con datos). */
export default function SelectorAnio({ anios, anioSel, onCambiar }: SelectorAnioProps) {
  const { t } = useTranslation()
  if (anios.length <= 1) return null
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-tinta-suave">{t.comun.anio}</span>
      <div className="flex rounded-lg border border-borde bg-white p-0.5" role="group" aria-label={t.comun.anio}>
        {anios.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onCambiar(a)}
            aria-pressed={a === anioSel}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors duration-150 ${
              a === anioSel ? 'bg-brand-700 text-white' : 'text-tinta-suave hover:text-brand-900'
            }`}
          >
            {a}
          </button>
        ))}
      </div>
    </div>
  )
}
