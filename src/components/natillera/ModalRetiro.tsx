import { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { moneda } from '../../lib/formato'
import type { EmpleadoNatillera } from '../../types/natillera'

export interface DatosRetiro {
  fecha_retiro: string
  motivo: string | null
}

interface Props {
  empleado: EmpleadoNatillera
  /** Total ahorrado calculado (snapshot que se guardará). */
  totalAhorrado: number
  guardando: boolean
  onConfirmar: (datos: DatosRetiro) => void
  onCerrar: () => void
}

/** Hoy en formato YYYY-MM-DD (para el valor inicial del input date). */
function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Modal para registrar el retiro de un empleado (snapshot del total ahorrado). */
export default function ModalRetiro({
  empleado,
  totalAhorrado,
  guardando,
  onConfirmar,
  onCerrar,
}: Props) {
  const { t } = useTranslation()
  const [fechaRetiro, setFechaRetiro] = useState(hoyISO())
  const [motivo, setMotivo] = useState('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.natillera.modalRetiroTitulo(empleado.nombre)}
    >
      <div className="w-full max-w-md rounded-xl border border-borde bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-brand-900">
          {t.natillera.modalRetiroTitulo(empleado.nombre)}
        </h2>

        <div className="mt-4 space-y-4">
          {/* Total ahorrado (calculado, no editable) */}
          <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
            <p className="text-xs font-semibold text-tinta-suave">{t.natillera.totalAhorrado}</p>
            <p className="text-2xl font-bold tabular-nums text-brand-900">{moneda(totalAhorrado)}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="nat-fecha-retiro">
              {t.natillera.fechaRetiro}
            </label>
            <input
              id="nat-fecha-retiro"
              type="date"
              value={fechaRetiro}
              onChange={(e) => setFechaRetiro(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="nat-motivo">
              {t.natillera.motivo}
            </label>
            <textarea
              id="nat-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={t.natillera.motivoPlaceholder}
              rows={3}
              className="mt-1 block w-full resize-y rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            />
          </div>

          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {t.natillera.avisoInactivo}
          </p>
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
            onClick={() =>
              onConfirmar({ fecha_retiro: fechaRetiro, motivo: motivo.trim() === '' ? null : motivo.trim() })
            }
            disabled={guardando || fechaRetiro === ''}
            className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? t.natillera.guardando : t.natillera.confirmarRetiro}
          </button>
        </div>
      </div>
    </div>
  )
}
