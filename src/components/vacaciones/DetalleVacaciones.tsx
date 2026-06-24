import type { ReactNode } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { contable, fecha as fechaFmt, moneda } from '../../lib/formato'
import { nombreMes } from '../../types/balance'
import { lineasMensualesVacaciones } from '../../lib/vacaciones'
import type { FechaYMD, ResumenVacaciones } from '../../lib/vacaciones'
import type { Empleado } from '../../types/empleados'
import type { PeriodoVacaciones } from '../../types/vacaciones'
import SelectorAnio from '../informes/SelectorAnio'

interface Props {
  empleado: Empleado
  periodos: PeriodoVacaciones[]
  resumen: ResumenVacaciones
  anios: number[]
  anioSel: number
  hoy: FechaYMD
  esEditor: boolean
  onCambiarAnio: (anio: number) => void
  onVolver: () => void
  onRegistrar: () => void
  onEliminar: (periodoId: string) => void
}

const SIN_DEC = { decimales: 0 }
const cop0 = (v: number) => moneda(v, SIN_DEC)
const dias = (v: number) => contable(v, { decimales: 2 })

/** Tarjeta de resumen (etiqueta + valor). */
function Tarjeta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-borde bg-white p-4 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-wide text-tinta-suave">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums text-brand-900">{children}</div>
    </div>
  )
}

/** Detalle de vacaciones de un empleado: resumen, timeline mensual e historial. */
export default function DetalleVacaciones({
  empleado,
  periodos,
  resumen,
  anios,
  anioSel,
  hoy,
  esEditor,
  onCambiarAnio,
  onVolver,
  onRegistrar,
  onEliminar,
}: Props) {
  const { t } = useTranslation()
  const v = t.vacaciones

  const lineas = lineasMensualesVacaciones(empleado, periodos, anioSel, hoy)
  const periodosOrden = [...periodos].sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio))

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onVolver}
          className="text-[13px] font-medium text-brand-700 transition-opacity duration-150 hover:opacity-70"
        >
          {v.volver}
        </button>
        {esEditor && (
          <button
            type="button"
            onClick={onRegistrar}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900"
          >
            + {v.registrar}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-3">
        <h2 className="text-xl font-bold text-brand-900">{v.detalleTitulo(empleado.nombre_completo)}</h2>
        <span className="font-mono text-sm text-tinta-suave">{empleado.codigo}</span>
        {empleado.fecha_ingreso && (
          <span className="text-sm text-tinta-suave">{fechaFmt(empleado.fecha_ingreso)}</span>
        )}
      </div>

      {/* Resumen */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Tarjeta label={v.resumenAcumulados}>{dias(resumen.diasAcumulados)}</Tarjeta>
        <Tarjeta label={v.resumenTomados}>{dias(resumen.diasTomados)}</Tarjeta>
        <Tarjeta label={v.resumenSaldo}>{dias(resumen.saldoDias)}</Tarjeta>
        <Tarjeta label={v.resumenValorSaldo}>{cop0(resumen.valorSaldo)}</Tarjeta>
        <Tarjeta label={v.resumenProvisionMensual}>{cop0(resumen.provisionMensual)}</Tarjeta>
        <Tarjeta label={v.resumenProvisionAcumulada}>{cop0(resumen.valorProvisionAcumulada)}</Tarjeta>
      </div>

      {/* Timeline mensual */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-brand-900">{v.timelineTitulo}</h3>
        <SelectorAnio anios={anios} anioSel={anioSel} onCambiar={onCambiarAnio} />
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl border border-borde bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50 text-brand-900">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold">{v.colMes}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">{v.colCausado}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">{v.colTomadoMes}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">{v.colAcumuladoMes}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">{v.colSaldoMes}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">{v.colProvisionMes}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">{v.colValorAcumulado}</th>
            </tr>
          </thead>
          <tbody>
            {lineas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-tinta-suave">
                  {v.sinPeriodos}
                </td>
              </tr>
            ) : (
              lineas.map((l) => (
                <tr key={l.mes} className="border-t border-borde">
                  <td className="px-3 py-1.5 text-xs text-tinta">{nombreMes(l.mes)}</td>
                  <td className="px-3 py-1.5 text-right text-xs tabular-nums text-tinta-suave">{dias(l.causado)}</td>
                  <td className="px-3 py-1.5 text-right text-xs tabular-nums text-tinta-suave">
                    {l.tomado === 0 ? <span className="text-gray-300">—</span> : dias(l.tomado)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-xs tabular-nums text-tinta">{dias(l.acumulado)}</td>
                  <td className="px-3 py-1.5 text-right text-xs font-semibold tabular-nums text-brand-900">{dias(l.saldo)}</td>
                  <td className="px-3 py-1.5 text-right text-xs tabular-nums text-tinta-suave">{cop0(l.valorProvisionMes)}</td>
                  <td className="px-3 py-1.5 text-right text-xs font-bold tabular-nums text-brand-900">{cop0(l.valorAcumulado)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Historial de períodos tomados */}
      <h3 className="mt-8 text-lg font-semibold text-brand-900">{v.periodosTitulo}</h3>
      <div className="mt-3 overflow-x-auto rounded-xl border border-borde bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50 text-brand-900">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold">{v.colPeriodo}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">{v.colDias}</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">{v.colNota}</th>
              {esEditor && <th className="w-10 px-2 py-2" />}
            </tr>
          </thead>
          <tbody>
            {periodosOrden.length === 0 ? (
              <tr>
                <td colSpan={esEditor ? 4 : 3} className="px-3 py-6 text-center text-sm text-tinta-suave">
                  {v.sinPeriodos}
                </td>
              </tr>
            ) : (
              periodosOrden.map((p) => (
                <tr key={p.id} className="border-t border-borde">
                  <td className="whitespace-nowrap px-3 py-1.5 text-xs tabular-nums text-tinta">
                    {fechaFmt(p.fecha_inicio)}
                    {p.fecha_fin ? ` – ${fechaFmt(p.fecha_fin)}` : ''}
                  </td>
                  <td className="px-3 py-1.5 text-right text-xs tabular-nums text-tinta">{dias(p.dias_habiles)}</td>
                  <td className="px-3 py-1.5 text-xs text-tinta-suave">{p.nota?.trim() ? p.nota : '—'}</td>
                  {esEditor && (
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => onEliminar(p.id)}
                        aria-label={v.eliminarAria}
                        title={v.eliminar}
                        className="inline-flex items-center justify-center rounded-md p-1 text-tinta-suave transition-colors duration-150 hover:bg-red-50 hover:text-red-600"
                      >
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
                          <path d="M4 7h16" />
                          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-tinta-suave">{v.notaPie}</p>
    </div>
  )
}
