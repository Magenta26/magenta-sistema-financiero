import { useTranslation } from '../hooks/useTranslation'

export default function Nomina() {
  const { t } = useTranslation()
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900">{t.nomina.titulo}</h1>
      <p className="mt-2 max-w-2xl text-sm text-tinta-suave">{t.nomina.descripcion}</p>
      <div className="mt-8 rounded-2xl border border-dashed border-brand-200 bg-white p-14 text-center shadow-sm">
        <p className="text-4xl" aria-hidden="true">
          🚧
        </p>
        <p className="mt-4 text-lg font-semibold text-brand-900">{t.nomina.enConstruccion}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-tinta-suave">{t.nomina.detalle}</p>
        <span className="mt-5 inline-block rounded-full bg-brand-200/40 px-3 py-1 text-xs font-semibold text-brand-700">
          {t.nomina.proximamente}
        </span>
      </div>
    </div>
  )
}
