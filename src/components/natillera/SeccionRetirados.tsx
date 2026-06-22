import { useTranslation } from '../../hooks/useTranslation'
import { contable, fecha, moneda } from '../../lib/formato'
import type { EmpleadoNatillera, RetiroNatillera } from '../../types/natillera'

/** Empleado inactivo sin retiro registrado en el año (con su total del año). */
export interface InactivoSinRetiro {
  empleado: EmpleadoNatillera
  total: number
}

interface Props {
  retiros: RetiroNatillera[]
  inactivosSinRetiro: InactivoSinRetiro[]
  nombreEmpleado: (id: string) => string
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

/** Sección "Retirados": retiros del año + empleados inactivos sin retiro. */
export default function SeccionRetirados({
  retiros,
  inactivosSinRetiro,
  nombreEmpleado,
  esEditor,
  onVerComprobante,
  onMarcarPagado,
  onReactivar,
}: Props) {
  const { t } = useTranslation()

  if (retiros.length === 0 && inactivosSinRetiro.length === 0) {
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
            <th className="px-3 py-2.5 text-left text-xs font-semibold">{t.natillera.columnaEmpleado}</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold">{t.natillera.columnaFechaRetiro}</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold">{t.natillera.columnaMontoRetirado}</th>
            <th className="px-3 py-2.5 text-center text-xs font-semibold">{t.natillera.columnaEstado}</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold" />
          </tr>
        </thead>
        <tbody>
          {retiros.map((r) => (
            <tr key={r.id} className="border-t border-borde hover:bg-brand-50">
              <td className="px-3 py-2 text-xs font-medium text-tinta">{nombreEmpleado(r.empleado_id)}</td>
              <td className="px-3 py-2 text-xs tabular-nums text-tinta-suave">{fecha(r.fecha_retiro)}</td>
              <td className="px-3 py-2 text-right text-xs font-bold tabular-nums text-brand-900">
                {moneda(r.monto_total)}
              </td>
              <td className="px-3 py-2 text-center">
                <BadgeEstado estado={r.estado} />
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => onVerComprobante(r)}
                  aria-label={t.natillera.verComprobanteAria(nombreEmpleado(r.empleado_id))}
                  className="mr-3 text-xs font-semibold text-brand-700 transition-colors duration-150 hover:text-brand-900"
                >
                  {t.natillera.verComprobante}
                </button>
                {esEditor && r.estado === 'pendiente' && (
                  <button
                    type="button"
                    onClick={() => onMarcarPagado(r)}
                    className="mr-3 text-xs font-semibold text-exito transition-colors duration-150 hover:underline"
                  >
                    {t.natillera.marcarPagado}
                  </button>
                )}
                {esEditor && (
                  <button
                    type="button"
                    onClick={() => onReactivar(r.empleado_id)}
                    className="text-xs font-semibold text-tinta-suave transition-colors duration-150 hover:text-brand-700"
                  >
                    {t.natillera.marcarActivo}
                  </button>
                )}
              </td>
            </tr>
          ))}

          {/* Empleados inactivos que no tienen un retiro registrado en el año */}
          {inactivosSinRetiro.map(({ empleado, total }) => (
            <tr key={empleado.id} className="border-t border-borde hover:bg-brand-50">
              <td className="px-3 py-2 text-xs font-medium text-tinta">{empleado.nombre}</td>
              <td className="px-3 py-2 text-xs text-tinta-suave">—</td>
              <td className="px-3 py-2 text-right text-xs tabular-nums text-tinta">{contable(total)}</td>
              <td className="px-3 py-2 text-center">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-tinta-suave">
                  {t.natillera.inactivo}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right">
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
