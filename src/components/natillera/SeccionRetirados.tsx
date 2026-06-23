import { useTranslation } from '../../hooks/useTranslation'
import { contable, fecha } from '../../lib/formato'
import type { EmpleadoNatillera, RetiroNatillera } from '../../types/natillera'

/** Fila de un empleado retirado (activo=false) con su total congelado y snapshot. */
export interface RetiradoFila {
  empleado: EmpleadoNatillera
  /** Total ahorrado congelado al mes de retiro (calculado). */
  total: number
  /** Snapshot de natillera_retiros (para comprobante/estado); null si no hay. */
  retiro: RetiroNatillera | null
}

interface Props {
  filas: RetiradoFila[]
  esEditor: boolean
  onVerComprobante: (retiro: RetiroNatillera) => void
  onMarcarPagado: (retiro: RetiroNatillera) => void
  onReactivar: (empleadoId: string) => void
}

function BadgeEstado({ estado }: { estado: 'pendiente' | 'pagado' }) {
  const { t } = useTranslation()
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        estado === 'pagado' ? 'bg-green-100 text-exito' : 'bg-amber-100 text-amber-800'
      }`}
    >
      {t.natillera.estados[estado] ?? estado}
    </span>
  )
}

/** Sección "Retirados": empleados con activo=false, total congelado y comprobante. */
export default function SeccionRetirados({
  filas,
  esEditor,
  onVerComprobante,
  onMarcarPagado,
  onReactivar,
}: Props) {
  const { t } = useTranslation()

  if (filas.length === 0) {
    return (
      <p className="mt-3 rounded-xl border border-dashed border-borde bg-white p-6 text-center text-sm text-tinta-suave">
        {t.natillera.sinRetirados}
      </p>
    )
  }

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-borde bg-white shadow-sm">
      <table className="w-full">
        <thead className="bg-gray-50 text-brand-900">
          <tr>
            <th className="px-3 py-2.5 text-left text-xs font-semibold">{t.natillera.columnaCodigo}</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold">{t.natillera.columnaEmpleado}</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold">{t.natillera.columnaFechaRetiro}</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold">{t.natillera.columnaMontoRetirado}</th>
            <th className="px-3 py-2.5 text-center text-xs font-semibold">{t.natillera.columnaEstado}</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold" />
          </tr>
        </thead>
        <tbody>
          {filas.map(({ empleado, total, retiro }) => (
            <tr key={empleado.id} className="border-t border-borde hover:bg-brand-50">
              <td className="px-3 py-2 font-mono text-xs text-tinta-suave">{empleado.codigo ?? '—'}</td>
              <td className="px-3 py-2 text-xs font-medium text-tinta">{empleado.nombre}</td>
              <td className="px-3 py-2 text-xs tabular-nums text-tinta-suave">
                {empleado.fecha_retiro ? fecha(empleado.fecha_retiro) : '—'}
              </td>
              <td className="px-3 py-2 text-right text-xs font-bold tabular-nums text-brand-900">
                {contable(total)}
              </td>
              <td className="px-3 py-2 text-center">
                {retiro ? (
                  <BadgeEstado estado={retiro.estado} />
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-tinta-suave">
                    {t.natillera.inactivo}
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right">
                {retiro && (
                  <button
                    type="button"
                    onClick={() => onVerComprobante(retiro)}
                    aria-label={t.natillera.verComprobanteAria(empleado.nombre)}
                    className="mr-3 text-xs font-semibold text-brand-700 transition-colors duration-150 hover:text-brand-900"
                  >
                    {t.natillera.verComprobante}
                  </button>
                )}
                {esEditor && retiro && retiro.estado === 'pendiente' && (
                  <button
                    type="button"
                    onClick={() => onMarcarPagado(retiro)}
                    className="mr-3 text-xs font-semibold text-exito transition-colors duration-150 hover:underline"
                  >
                    {t.natillera.marcarPagado}
                  </button>
                )}
                {esEditor && (
                  <button
                    type="button"
                    onClick={() => onReactivar(empleado.id)}
                    className="text-xs font-semibold text-tinta-suave transition-colors duration-150 hover:text-brand-700"
                  >
                    {t.natillera.marcarActivo}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
