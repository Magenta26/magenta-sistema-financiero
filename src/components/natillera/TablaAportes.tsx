import { useTranslation } from '../../hooks/useTranslation'
import { contable, moneda } from '../../lib/formato'
import { nombreMes } from '../../types/balance'
import { totalGeneralReporte, totalMesReporte } from '../../lib/natilleraReporte'
import type { ReporteEmpleado } from '../../lib/natilleraReporte'
import type { EmpleadoNatillera } from '../../types/natillera'

interface Props {
  empleados: EmpleadoNatillera[]
  /** Reporte calculado por empleado (id -> reporte del año activo). */
  reportes: Map<string, ReporteEmpleado>
  esEditor: boolean
  onRegistrarNovedad: (empleado: EmpleadoNatillera) => void
  onVerNovedades: (empleado: EmpleadoNatillera) => void
}

/** Celda de monto resuelto: vacía (—) si no aplica o es futuro. */
function CeldaMonto({ valor }: { valor: number | null }) {
  return (
    <td className="px-2 py-2 text-right text-xs tabular-nums text-tinta">
      {valor == null ? <span className="text-gray-300">—</span> : contable(valor)}
    </td>
  )
}

/**
 * Reporte mensual de la natillera (SOLO LECTURA). Los montos se calculan al
 * vuelo (ver natilleraReporte). Sin edición de celdas.
 */
export default function TablaAportes({
  empleados,
  reportes,
  esEditor,
  onRegistrarNovedad,
  onVerNovedades,
}: Props) {
  const { t } = useTranslation()
  const meses = Array.from({ length: 12 }, (_, i) => i + 1)
  const listaReportes = empleados.map((e) => reportes.get(e.id)).filter(Boolean) as ReporteEmpleado[]
  const totalSaldos = listaReportes.reduce((acc, r) => acc + r.saldoInicial, 0)

  return (
    <div className="overflow-x-auto rounded-xl border border-borde bg-white shadow-sm">
      <table className="w-full">
        <thead className="bg-gray-50 text-brand-900">
          <tr>
            <th className="sticky left-0 z-10 w-24 bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold">
              {t.natillera.columnaCodigo}
            </th>
            <th className="sticky left-24 z-10 min-w-44 bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold">
              {t.natillera.columnaEmpleado}
            </th>
            <th className="px-2 py-2.5 text-right text-xs font-semibold">{t.natillera.columnaCuota}</th>
            <th className="px-2 py-2.5 text-right text-xs font-semibold">
              {t.natillera.columnaSaldoInicial}
            </th>
            {meses.map((mes) => (
              <th key={mes} className="px-2 py-2.5 text-right text-xs font-semibold">
                {nombreMes(mes)}
              </th>
            ))}
            <th className="px-3 py-2.5 text-right text-xs font-bold">{t.natillera.columnaTotal}</th>
            {esEditor && <th className="px-3 py-2.5 text-right text-xs font-semibold" />}
          </tr>
        </thead>
        <tbody>
          {empleados.map((emp) => {
            const r = reportes.get(emp.id)
            if (!r) return null
            return (
              <tr key={emp.id} className="border-t border-borde hover:bg-brand-50">
                <td className="sticky left-0 z-10 w-24 bg-white px-3 py-2 font-mono text-xs text-tinta-suave">
                  {emp.codigo ?? '—'}
                </td>
                <td className="sticky left-24 z-10 min-w-44 bg-white px-3 py-2 text-xs font-medium text-tinta">
                  {emp.nombre}
                </td>
                <td className="px-2 py-2 text-right text-xs tabular-nums text-tinta-suave">
                  {r.cuotaVigente === 0 ? '—' : contable(r.cuotaVigente)}
                </td>
                <td className="px-2 py-2 text-right text-xs tabular-nums text-tinta-suave">
                  {r.saldoInicial === 0 ? '—' : contable(r.saldoInicial)}
                </td>
                {meses.map((mes) => (
                  <CeldaMonto key={mes} valor={r.meses[mes - 1]} />
                ))}
                <td className="px-3 py-2 text-right text-xs font-bold tabular-nums text-brand-900">
                  {contable(r.total)}
                </td>
                {esEditor && (
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onRegistrarNovedad(emp)}
                      aria-label={t.natillera.novedades.registrarAria(emp.nombre)}
                      className="mr-2 text-xs font-semibold text-brand-700 transition-colors duration-150 hover:text-brand-900"
                    >
                      {t.natillera.novedades.registrar}
                    </button>
                    <button
                      type="button"
                      onClick={() => onVerNovedades(emp)}
                      aria-label={t.natillera.novedades.verAria(emp.nombre)}
                      className="text-xs font-semibold text-tinta-suave transition-colors duration-150 hover:text-brand-700"
                    >
                      {t.natillera.novedades.ver}
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-brand-200 bg-brand-50">
            <td className="sticky left-0 z-10 w-24 bg-brand-50 px-3 py-2" />
            <td className="sticky left-24 z-10 min-w-44 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-900">
              {t.natillera.totalMes}
            </td>
            <td className="px-2 py-2" />
            <td className="px-2 py-2 text-right text-xs font-semibold tabular-nums text-brand-900">
              {contable(totalSaldos)}
            </td>
            {meses.map((mes) => (
              <td key={mes} className="px-2 py-2 text-right text-xs font-semibold tabular-nums text-brand-900">
                {contable(totalMesReporte(listaReportes, mes - 1))}
              </td>
            ))}
            <td className="px-3 py-2 text-right text-xs font-bold tabular-nums text-brand-900">
              {moneda(totalGeneralReporte(listaReportes))}
            </td>
            {esEditor && <td />}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
