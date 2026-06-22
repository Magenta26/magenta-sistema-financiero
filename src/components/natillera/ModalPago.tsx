import { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import type { RetiroNatillera } from '../../types/natillera'

interface Props {
  retiro: RetiroNatillera
  guardando: boolean
  onConfirmar: (fechaPago: string) => void
  onCerrar: () => void
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Modal para marcar un retiro como pagado (registra la fecha de pago). */
export default function ModalPago({ retiro, guardando, onConfirmar, onCerrar }: Props) {
  const { t } = useTranslation()
  const [fechaPago, setFechaPago] = useState(retiro.fecha_pago ?? hoyISO())

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.natillera.modalPagoTitulo}
    >
      <div className="w-full max-w-sm rounded-xl border border-borde bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-brand-900">{t.natillera.modalPagoTitulo}</h2>

        <div className="mt-4">
          <label className="block text-xs font-semibold text-tinta-suave" htmlFor="nat-fecha-pago">
            {t.natillera.fechaPago}
          </label>
          <input
            id="nat-fecha-pago"
            type="date"
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-borde bg-white px-4 py-2 text-sm font-semibold text-tinta-suave transition-colors duration-150 hover:border-brand-700 hover:text-brand-700"
          >
            {t.comun.cancelar}
          </button>
          <button
            type="button"
            onClick={() => onConfirmar(fechaPago)}
            disabled={guardando || fechaPago === ''}
            className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? t.natillera.guardando : t.natillera.confirmarPago}
          </button>
        </div>
      </div>
    </div>
  )
}
