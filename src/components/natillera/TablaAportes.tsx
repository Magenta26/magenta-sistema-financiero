import { useTranslation } from '../../hooks/useTranslation'
import { contable, moneda, parsearNumero } from '../../lib/formato'
import { nombreMes } from '../../types/balance'
import { totalAhorradoEmpleado, totalDelMes, totalGeneral } from '../../lib/natillera'
import type { AportesMes } from '../../lib/natillera'
import type { EmpleadoNatillera } from '../../types/natillera'

interface Props {
  empleados: EmpleadoNatillera[]
  indice: Map<string, AportesMes>
  esEditor: boolean
  onGuardarAporte: (empleadoId: string, mes: number, monto: number) => void
  onEditar: (empleado: EmpleadoNatillera) => void
  onRetirar: (empleado: EmpleadoNatillera) => void
}

/**
 * Celda de aporte de un (empleado, mes). Editable solo por admin/contadora.
 * Pre-llena con la cuota mensual al enfocar una celda vacía (atajo de captura);
 * el valor guardado puede ser menor o 0. type=text para no mostrar spinners.
 */
function CeldaAporte({
  monto,
  cuota,
  aria,
  onGuardar,
}: {
  monto: number
  cuota: number
  aria: string
  onGuardar: (monto: number) => void
}) {
  return (
    <td className="px-1 py-1">
      <input
        type="text"
        inputMode="decimal"
        key={monto}
        defaultValue={monto === 0 ? '' : contable(monto)}
        placeholder={cuota === 0 ? '0' : contable(cuota)}
        aria-label={aria}
        onFocus={(e) => {
          if (e.target.value === '' && cuota !== 0) e.target.value = contable(cuota)
        }}
        onBlur={(e) => {
          const n = parsearNumero(e.target.value) ?? 0
          if (n !== monto) onGuardar(n)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className="w-24 rounded border border-borde bg-white px-1.5 py-1 text-right text-xs tabular-nums text-tinta placeholder-gray-300 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
      />
    </td>
  )
}

/** Celda de aporte de solo lectura (cuando no es editor). */
function CeldaAporteLectura({ monto }: { monto: number }) {
  return (
    <td className="px-2 py-1.5 text-right text-xs tabular-nums text-tinta">
      {monto === 0 ? <span className="text-gray-300">—</span> : contable(monto)}
    </td>
  )
}

export default function TablaAportes({
  empleados,
  indice,
  esEditor,
  onGuardarAporte,
  onEditar,
  onRetirar,
}: Props) {
  const { t } = useTranslation()
  const meses = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="overflow-x-auto rounded-xl border border-borde bg-white shadow-sm">
      <table className="w-full">
        <thead className="bg-gray-50 text-brand-900">
          <tr>
            <th className="sticky left-0 z-10 min-w-44 bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold">
              {t.natillera.columnaEmpleado}
            </th>
            <th className="px-2 py-2.5 text-right text-xs font-semibold">{t.natillera.columnaCuota}</th>
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
            const porMes = indice.get(emp.id)
            const total = totalAhorradoEmpleado(porMes)
            return (
              <tr key={emp.id} className="border-t border-borde hover:bg-brand-50">
                <td className="sticky left-0 z-10 min-w-44 bg-white px-3 py-2 text-xs font-medium text-tinta">
                  {emp.nombre}
                </td>
                <td className="px-2 py-2 text-right text-xs tabular-nums text-tinta-suave">
                  {emp.cuota_mensual === 0 ? '—' : contable(emp.cuota_mensual)}
                </td>
                {meses.map((mes) => {
                  const monto = porMes?.get(mes) ?? 0
                  return esEditor ? (
                    <CeldaAporte
                      key={mes}
                      monto={monto}
                      cuota={emp.cuota_mensual}
                      aria={t.natillera.aporteAria(emp.nombre, nombreMes(mes))}
                      onGuardar={(valor) => onGuardarAporte(emp.id, mes, valor)}
                    />
                  ) : (
                    <CeldaAporteLectura key={mes} monto={monto} />
                  )
                })}
                <td className="px-3 py-2 text-right text-xs font-bold tabular-nums text-brand-900">
                  {contable(total)}
                </td>
                {esEditor && (
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onEditar(emp)}
                      aria-label={t.natillera.editarAria(emp.nombre)}
                      className="mr-2 text-xs font-semibold text-brand-700 transition-colors duration-150 hover:text-brand-900"
                    >
                      {t.natillera.editar}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRetirar(emp)}
                      aria-label={t.natillera.registrarRetiroAria(emp.nombre)}
                      className="text-xs font-semibold text-tinta-suave transition-colors duration-150 hover:text-brand-700"
                    >
                      {t.natillera.registrarRetiro}
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          {/* Total del mes (todos los empleados activos) */}
          <tr className="border-t-2 border-brand-200 bg-brand-50">
            <td className="sticky left-0 z-10 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-900">
              {t.natillera.totalMes}
            </td>
            <td className="px-2 py-2" />
            {meses.map((mes) => (
              <td key={mes} className="px-2 py-2 text-right text-xs font-semibold tabular-nums text-brand-900">
                {contable(totalDelMes(indice, mes))}
              </td>
            ))}
            <td className="px-3 py-2 text-right text-xs font-bold tabular-nums text-brand-900">
              {moneda(totalGeneral(indice))}
            </td>
            {esEditor && <td />}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
