import type { ReactNode } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { contable, fecha, moneda } from '../../lib/formato'
import { nombreMes } from '../../types/balance'
import { totalGeneralReporte, totalMesReporte } from '../../lib/natilleraReporte'
import type { ReporteEmpleado } from '../../lib/natilleraReporte'
import type { EmpleadoNatillera } from '../../types/natillera'

interface Props {
  empleados: EmpleadoNatillera[]
  /** Reporte calculado por empleado (id -> reporte del año mostrado). */
  reportes: Map<string, ReporteEmpleado>
  esEditor: boolean
  onVerNovedades: (empleado: EmpleadoNatillera) => void
  /** Agrega la columna "Fecha de retiro" (para la tabla de retirados). */
  mostrarFechaRetiro?: boolean
  /** Botones de acción extra por fila (p. ej. comprobante / pagado / reactivar). */
  renderAccionesExtra?: (empleado: EmpleadoNatillera) => ReactNode
}

// Anchos fijos de las dos columnas fijas (sticky). El offset de Empleado debe
// coincidir exactamente con el ancho de Código para que no se monten.
const COD_W = 72
const NOM_LEFT = COD_W

// Los montos van SIN decimales (redondeo al peso) para ahorrar espacio. El resto
// del sistema (ER/BG/comprobante) sigue con centavos.
const SIN_DECIMALES = { decimales: 0 }
const contable0 = (valor: number) => contable(valor, SIN_DECIMALES)

/** Icono lineal de historial (reloj con flecha) para "Ver novedades". */
function IconoHistorial() {
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
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 4v4h4" />
      <path d="M12 8v4l3 2" />
    </svg>
  )
}

/** Celda de monto resuelto: vacía (—) si no aplica o es futuro. */
function CeldaMonto({ valor }: { valor: number | null }) {
  return (
    <td className="px-1.5 py-1.5 text-right text-xs tabular-nums text-tinta">
      {valor == null ? <span className="text-gray-300">—</span> : contable0(valor)}
    </td>
  )
}

/**
 * Tabla mensual de la natillera (SOLO LECTURA). Reutilizable para activos y
 * retirados: los montos se calculan al vuelo (ver natilleraReporte). Sin edición
 * de celdas. Para retirados se activa la columna "Fecha de retiro" y se pasan
 * acciones extra (comprobante / pagado / reactivar).
 */
export default function TablaAportes({
  empleados,
  reportes,
  esEditor,
  onVerNovedades,
  mostrarFechaRetiro = false,
  renderAccionesExtra,
}: Props) {
  const { t } = useTranslation()
  const meses = Array.from({ length: 12 }, (_, i) => i + 1)
  const listaReportes = empleados.map((e) => reportes.get(e.id)).filter(Boolean) as ReporteEmpleado[]
  const totalSaldos = listaReportes.reduce((acc, r) => acc + r.saldoInicial, 0)

  // La columna de acciones aparece si hay edición o acciones extra (los retirados
  // muestran "Ver comprobante" incluso a no editores).
  const mostrarAcciones = esEditor || !!renderAccionesExtra

  return (
    <div className="overflow-x-auto rounded-xl border border-borde bg-white shadow-sm">
      <table className="w-full border-collapse">
        <thead className="bg-gray-50 text-brand-900">
          <tr>
            <th
              className="sticky left-0 z-10 whitespace-nowrap bg-gray-50 px-2 py-2 text-left text-xs font-semibold"
              style={{ left: 0, width: COD_W, minWidth: COD_W }}
            >
              {t.natillera.columnaCodigo}
            </th>
            <th
              className="sticky z-10 whitespace-nowrap bg-gray-50 px-3 py-2 text-left text-xs font-semibold"
              style={{ left: NOM_LEFT, minWidth: 150 }}
            >
              {t.natillera.columnaEmpleado}
            </th>
            {mostrarFechaRetiro && (
              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold">
                {t.natillera.columnaFechaRetiro}
              </th>
            )}
            <th className="whitespace-nowrap px-2 py-2 text-right text-xs font-semibold">
              {t.natillera.columnaCuota}
            </th>
            <th className="whitespace-nowrap px-2 py-2 text-right text-xs font-semibold">
              {t.natillera.columnaSaldoInicial}
            </th>
            {meses.map((mes) => (
              <th key={mes} className="px-1.5 py-2 text-right text-xs font-semibold">
                {nombreMes(mes)}
              </th>
            ))}
            <th className="whitespace-nowrap px-3 py-2 text-right text-xs font-bold">
              {t.natillera.columnaTotal}
            </th>
            {mostrarAcciones && <th className={renderAccionesExtra ? 'px-2 py-2' : 'w-10 px-2 py-2'} />}
          </tr>
        </thead>
        <tbody>
          {empleados.map((emp) => {
            const r = reportes.get(emp.id)
            if (!r) return null
            return (
              <tr key={emp.id} className="border-t border-borde hover:bg-brand-50">
                <td
                  className="sticky left-0 z-10 whitespace-nowrap bg-white px-2 py-1.5 font-mono text-[11px] text-tinta-suave"
                  style={{ left: 0, width: COD_W, minWidth: COD_W }}
                >
                  {emp.codigo ?? '—'}
                </td>
                <td
                  className="sticky z-10 bg-white px-3 py-1.5 text-xs font-medium text-tinta"
                  style={{ left: NOM_LEFT, minWidth: 150 }}
                >
                  {emp.nombre}
                </td>
                {mostrarFechaRetiro && (
                  <td className="whitespace-nowrap px-3 py-1.5 text-xs tabular-nums text-tinta-suave">
                    {emp.fecha_retiro ? fecha(emp.fecha_retiro) : '—'}
                  </td>
                )}
                <td className="px-2 py-1.5 text-right text-xs tabular-nums text-tinta-suave">
                  {r.cuotaVigente === 0 ? '—' : contable0(r.cuotaVigente)}
                </td>
                <td className="px-2 py-1.5 text-right text-xs tabular-nums text-tinta-suave">
                  {r.saldoInicial === 0 ? '—' : contable0(r.saldoInicial)}
                </td>
                {meses.map((mes) => (
                  <CeldaMonto key={mes} valor={r.meses[mes - 1]} />
                ))}
                <td className="px-3 py-1.5 text-right text-xs font-bold tabular-nums text-brand-900">
                  {contable0(r.total)}
                </td>
                {mostrarAcciones && (
                  <td className="px-2 py-1.5">
                    <div
                      className={`flex items-center gap-2 whitespace-nowrap ${
                        renderAccionesExtra ? 'justify-end' : 'justify-center'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onVerNovedades(emp)}
                        aria-label={t.natillera.novedades.verAria(emp.nombre)}
                        title={t.natillera.novedades.ver}
                        className="inline-flex items-center justify-center rounded-md p-1 text-tinta-suave transition-colors duration-150 hover:bg-brand-100 hover:text-brand-700"
                      >
                        <IconoHistorial />
                      </button>
                      {renderAccionesExtra?.(emp)}
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-brand-200 bg-brand-50">
            <td
              className="sticky left-0 z-10 bg-brand-50 px-2 py-1.5"
              style={{ left: 0, width: COD_W, minWidth: COD_W }}
            />
            <td
              className="sticky z-10 whitespace-nowrap bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-900"
              style={{ left: NOM_LEFT, minWidth: 150 }}
            >
              {t.natillera.totalMes}
            </td>
            {mostrarFechaRetiro && <td className="px-3 py-1.5" />}
            <td className="px-2 py-1.5" />
            <td className="px-2 py-1.5 text-right text-xs font-semibold tabular-nums text-brand-900">
              {contable0(totalSaldos)}
            </td>
            {meses.map((mes) => (
              <td key={mes} className="px-1.5 py-1.5 text-right text-xs font-semibold tabular-nums text-brand-900">
                {contable0(totalMesReporte(listaReportes, mes - 1))}
              </td>
            ))}
            <td className="whitespace-nowrap px-3 py-1.5 text-right text-xs font-bold tabular-nums text-brand-900">
              {moneda(totalGeneralReporte(listaReportes), SIN_DECIMALES)}
            </td>
            {mostrarAcciones && <td className="px-2 py-1.5" />}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
