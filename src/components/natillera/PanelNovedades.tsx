import { useTranslation } from '../../hooks/useTranslation'
import { contable, fechaHora } from '../../lib/formato'
import { nombreMes } from '../../types/balance'
import type { EmpleadoNatillera, NovedadNatillera } from '../../types/natillera'

interface Props {
  empleado: EmpleadoNatillera
  novedades: NovedadNatillera[]
  onCerrar: () => void
}

/** Panel (solo lectura) con el historial de novedades de un empleado. */
export default function PanelNovedades({ empleado, novedades, onCerrar }: Props) {
  const { t } = useTranslation()
  const nv = t.natillera.novedades

  // Más recientes primero (por período y luego por fecha de registro).
  const ordenadas = [...novedades].sort((a, b) => {
    const pa = a.anio * 12 + a.mes
    const pb = b.anio * 12 + b.mes
    if (pa !== pb) return pb - pa
    return b.creado_en.localeCompare(a.creado_en)
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={nv.tituloEmpleado(empleado.nombre)}
    >
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-borde bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-borde px-5 py-3">
          <h2 className="text-base font-semibold text-brand-900">
            <span className="font-mono text-sm text-tinta-suave">{empleado.codigo ?? '—'}</span>{' '}
            {nv.tituloEmpleado(empleado.nombre)}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-borde bg-white px-3 py-1.5 text-xs font-semibold text-tinta-suave transition-colors duration-150 hover:border-brand-700 hover:text-brand-700"
          >
            {nv.cerrar}
          </button>
        </div>

        <div className="overflow-y-auto p-1">
          {ordenadas.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-tinta-suave">{nv.sin}</p>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50 text-brand-900">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold">{nv.colMes}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">{nv.colTipo}</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold">{nv.colValor}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">{nv.colNota}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">{nv.colFecha}</th>
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((n) => (
                  <tr key={n.id} className="border-t border-borde">
                    <td className="px-3 py-2 text-xs tabular-nums text-tinta">
                      {nombreMes(n.mes)} {n.anio}
                    </td>
                    <td className="px-3 py-2 text-xs text-tinta">{nv.tipos[n.tipo]}</td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums text-tinta">
                      {n.valor == null ? '—' : contable(n.valor)}
                    </td>
                    <td className="px-3 py-2 text-xs text-tinta-suave">{n.nota?.trim() ? n.nota : '—'}</td>
                    <td className="px-3 py-2 text-xs text-tinta-suave">{fechaHora(n.creado_en)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
