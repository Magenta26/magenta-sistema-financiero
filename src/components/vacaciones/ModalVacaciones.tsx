import { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { parsearNumero } from '../../lib/formato'
import type { DatosPeriodoVacaciones } from '../../types/vacaciones'
import type { Empleado } from '../../types/empleados'

interface Props {
  /** Empleados que causan vacaciones (entre los que se puede elegir). */
  empleados: Empleado[]
  /** Empleado preseleccionado (si se abre desde el detalle); null = se elige aquí. */
  empleadoInicial: Empleado | null
  guardando: boolean
  onConfirmar: (datos: DatosPeriodoVacaciones) => void
  onCerrar: () => void
}

const claseInput =
  'mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none'

/** Modal para registrar un período de vacaciones tomadas. */
export default function ModalVacaciones({ empleados, empleadoInicial, guardando, onConfirmar, onCerrar }: Props) {
  const { t } = useTranslation()
  const v = t.vacaciones

  const [empleadoId, setEmpleadoId] = useState(empleadoInicial?.id ?? '')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [diasTexto, setDiasTexto] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState<'empleado' | 'fecha' | 'dias' | null>(null)

  const enviar = () => {
    if (empleadoId === '') return setError('empleado')
    if (fechaInicio === '') return setError('fecha')
    const dias = parsearNumero(diasTexto)
    if (dias == null || dias <= 0) return setError('dias')
    onConfirmar({
      empleado_id: empleadoId,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin === '' ? null : fechaFin,
      dias_habiles: dias,
      nota: nota.trim() === '' ? null : nota.trim(),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={v.modalTitulo}
    >
      <div className="w-full max-w-md rounded-xl border border-borde bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-brand-900">{v.modalTitulo}</h2>

        <div className="mt-4 space-y-4">
          {!empleadoInicial && (
            <div>
              <label className="block text-xs font-semibold text-tinta-suave" htmlFor="vac-empleado">
                {v.campoEmpleado}
              </label>
              <select
                id="vac-empleado"
                value={empleadoId}
                onChange={(e) => {
                  setEmpleadoId(e.target.value)
                  if (error === 'empleado') setError(null)
                }}
                className={claseInput}
              >
                <option value="">{v.placeholderEmpleado}</option>
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.codigo} · {e.nombre_completo}
                  </option>
                ))}
              </select>
              {error === 'empleado' && (
                <p className="mt-1 text-xs text-red-600">{v.placeholderEmpleado}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-tinta-suave" htmlFor="vac-inicio">
                {v.campoFechaInicio}
              </label>
              <input
                id="vac-inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => {
                  setFechaInicio(e.target.value)
                  if (error === 'fecha') setError(null)
                }}
                className={claseInput}
              />
              {error === 'fecha' && <p className="mt-1 text-xs text-red-600">{v.errorFecha}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-tinta-suave" htmlFor="vac-fin">
                {v.campoFechaFin}
              </label>
              <input
                id="vac-fin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className={claseInput}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="vac-dias">
              {v.campoDiasHabiles}
            </label>
            <input
              id="vac-dias"
              type="text"
              inputMode="decimal"
              value={diasTexto}
              onChange={(e) => {
                setDiasTexto(e.target.value)
                if (error === 'dias') setError(null)
              }}
              placeholder="0"
              className={`${claseInput} text-right tabular-nums`}
            />
            {error === 'dias' && <p className="mt-1 text-xs text-red-600">{v.errorDias}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="vac-nota">
              {v.campoNota}
            </label>
            <textarea
              id="vac-nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder={v.notaPlaceholder}
              rows={2}
              className={`${claseInput} resize-y`}
            />
          </div>
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
            onClick={enviar}
            disabled={guardando}
            className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? v.guardando : v.guardar}
          </button>
        </div>
      </div>
    </div>
  )
}
