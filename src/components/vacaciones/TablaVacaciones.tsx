import { useTranslation } from '../../hooks/useTranslation'
import { contable, fecha as fechaFmt, moneda } from '../../lib/formato'
import type { ResumenVacaciones } from '../../lib/vacaciones'
import type { Empleado } from '../../types/empleados'

export interface FilaVacaciones {
  empleado: Empleado
  resumen: ResumenVacaciones
}

interface Props {
  /** Empleados cuyo contrato causa vacaciones (incluye los que no tienen fecha). */
  filas: FilaVacaciones[]
  /** Empleados cuyo contrato NO causa vacaciones. */
  noAplican: Empleado[]
  onVerDetalle: (empleado: Empleado) => void
}

// Montos sin decimales, como en la natillera. Días con 2 decimales (1,25).
const SIN_DEC = { decimales: 0 }
const cop0 = (v: number) => moneda(v, SIN_DEC)
const dias = (v: number) => contable(v, { decimales: 2 })

/** Icono lineal (lista) para el botón "Ver detalle". */
function IconoDetalle() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 5h11" />
      <path d="M9 12h11" />
      <path d="M9 19h11" />
      <path d="M4 5h.01" />
      <path d="M4 12h.01" />
      <path d="M4 19h.01" />
    </svg>
  )
}

/** Tabla de seguimiento de vacaciones (solo lectura; el detalle se abre aparte). */
export default function TablaVacaciones({ filas, noAplican, onVerDetalle }: Props) {
  const { t } = useTranslation()
  const v = t.vacaciones

  const ok = filas.filter((f) => f.resumen.estado === 'ok')
  const totalSaldoDias = ok.reduce((acc, f) => acc + f.resumen.saldoDias, 0)
  const totalValorSaldo = ok.reduce((acc, f) => acc + f.resumen.valorSaldo, 0)

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-xl border border-borde bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50 text-brand-900">
            <tr>
              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold">{v.colCodigo}</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">{v.colNombre}</th>
              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold">{v.colFechaIngreso}</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">{v.colContrato}</th>
              <th className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold">{v.colAcumulados}</th>
              <th className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold">{v.colTomados}</th>
              <th className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold">{v.colSaldo}</th>
              <th className="whitespace-nowrap px-3 py-2 text-right text-xs font-bold">{v.colValorSaldo}</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {filas.map(({ empleado: e, resumen: r }) => (
              <tr key={e.id} className="border-t border-borde hover:bg-brand-50">
                <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px] text-tinta-suave">
                  {e.codigo}
                </td>
                <td className="px-3 py-1.5 text-xs font-medium text-tinta">{e.nombre_completo}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-xs tabular-nums text-tinta-suave">
                  {e.fecha_ingreso ? fechaFmt(e.fecha_ingreso) : '—'}
                </td>
                <td className="px-3 py-1.5 text-xs text-tinta-suave">{e.tipo_contrato ?? '—'}</td>
                {r.estado === 'sin_fecha' ? (
                  <td colSpan={4} className="px-3 py-1.5 text-center text-xs font-medium text-amber-700">
                    {v.sinFecha}
                  </td>
                ) : (
                  <>
                    <td className="px-3 py-1.5 text-right text-xs tabular-nums text-tinta">{dias(r.diasAcumulados)}</td>
                    <td className="px-3 py-1.5 text-right text-xs tabular-nums text-tinta-suave">{dias(r.diasTomados)}</td>
                    <td className="px-3 py-1.5 text-right text-xs font-semibold tabular-nums text-brand-900">{dias(r.saldoDias)}</td>
                    <td className="px-3 py-1.5 text-right text-xs font-bold tabular-nums text-brand-900">{cop0(r.valorSaldo)}</td>
                  </>
                )}
                <td className="px-2 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => onVerDetalle(e)}
                    aria-label={v.verDetalleAria(e.nombre_completo)}
                    title={v.verDetalle}
                    className="inline-flex items-center justify-center rounded-md p-1 text-tinta-suave transition-colors duration-150 hover:bg-brand-100 hover:text-brand-700"
                  >
                    <IconoDetalle />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-brand-200 bg-brand-50">
              <td className="px-3 py-1.5 text-xs font-bold text-brand-900" colSpan={6}>
                {v.totalLabel}
              </td>
              <td className="px-3 py-1.5 text-right text-xs font-bold tabular-nums text-brand-900">
                {dias(totalSaldoDias)}
              </td>
              <td className="px-3 py-1.5 text-right text-xs font-bold tabular-nums text-brand-900">
                {cop0(totalValorSaldo)}
              </td>
              <td className="w-10 px-2 py-1.5" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Empleados que no causan vacaciones */}
      {noAplican.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-brand-900">{v.noAplicanTitulo}</h3>
          <p className="mb-2 text-xs text-tinta-suave">{v.noAplicanDescripcion}</p>
          <div className="overflow-x-auto rounded-xl border border-borde bg-white shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50 text-brand-900">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold">{v.colCodigo}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">{v.colNombre}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">{v.colContrato}</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold">{v.colSaldo}</th>
                </tr>
              </thead>
              <tbody>
                {noAplican.map((e) => (
                  <tr key={e.id} className="border-t border-borde">
                    <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px] text-tinta-suave">{e.codigo}</td>
                    <td className="px-3 py-1.5 text-xs font-medium text-tinta">{e.nombre_completo}</td>
                    <td className="px-3 py-1.5 text-xs text-tinta-suave">{e.tipo_contrato ?? '—'}</td>
                    <td className="px-3 py-1.5 text-right text-xs font-medium text-tinta-suave">{v.noAplica}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
