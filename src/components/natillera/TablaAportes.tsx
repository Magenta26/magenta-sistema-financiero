import { useTranslation } from '../../hooks/useTranslation'
import { contable, moneda, parsearNumero } from '../../lib/formato'
import { nombreMes } from '../../types/balance'
import { totalAhorradoEmpleado, totalDelMes, totalGeneralEmpleados } from '../../lib/natillera'
import type { AportesMes } from '../../lib/natillera'
import type { EmpleadoNatillera } from '../../types/natillera'

interface Props {
  empleados: EmpleadoNatillera[]
  indice: Map<string, AportesMes>
  /** Saldo inicial por empleado (lo traído del año anterior); ausente = 0. */
  saldos: Map<string, number>
  esEditor: boolean
  onGuardarAporte: (empleadoId: string, mes: number, monto: number) => void
  onGuardarSaldo: (empleadoId: string, saldo: number) => void
  onEditar: (empleado: EmpleadoNatillera) => void
  onRetirar: (empleado: EmpleadoNatillera) => void
}

/**
 * Celda numérica editable (aporte o saldo inicial). type=text para no mostrar
 * spinners; al confirmar se parsea con el locale activo.
 * `prefill` (opcional) rellena una celda vacía al enfocarla (atajo de captura
 * con la cuota mensual en los aportes; no se usa en el saldo inicial).
 */
function CeldaEditable({
  valor,
  prefill,
  placeholder,
  aria,
  onGuardar,
}: {
  valor: number
  prefill?: number
  placeholder: string
  aria: string
  onGuardar: (valor: number) => void
}) {
  return (
    <td className="px-1 py-1">
      <input
        type="text"
        inputMode="decimal"
        key={valor}
        defaultValue={valor === 0 ? '' : contable(valor)}
        placeholder={placeholder}
        aria-label={aria}
        onFocus={(e) => {
          if (e.target.value === '' && prefill && prefill !== 0) e.target.value = contable(prefill)
        }}
        onBlur={(e) => {
          const n = parsearNumero(e.target.value) ?? 0
          if (n !== valor) onGuardar(n)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className="w-24 rounded border border-borde bg-white px-1.5 py-1 text-right text-xs tabular-nums text-tinta placeholder-gray-300 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
      />
    </td>
  )
}

/** Celda numérica de solo lectura (cuando no es editor). */
function CeldaLectura({ valor }: { valor: number }) {
  return (
    <td className="px-2 py-1.5 text-right text-xs tabular-nums text-tinta">
      {valor === 0 ? <span className="text-gray-300">—</span> : contable(valor)}
    </td>
  )
}

export default function TablaAportes({
  empleados,
  indice,
  saldos,
  esEditor,
  onGuardarAporte,
  onGuardarSaldo,
  onEditar,
  onRetirar,
}: Props) {
  const { t } = useTranslation()
  const meses = Array.from({ length: 12 }, (_, i) => i + 1)
  const totalSaldos = empleados.reduce((acc, e) => acc + (saldos.get(e.id) ?? 0), 0)

  return (
    <div className="overflow-x-auto rounded-xl border border-borde bg-white shadow-sm">
      <table className="w-full">
        <thead className="bg-gray-50 text-brand-900">
          <tr>
            <th className="sticky left-0 z-10 min-w-44 bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold">
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
            const porMes = indice.get(emp.id)
            const saldoInicial = saldos.get(emp.id) ?? 0
            const total = totalAhorradoEmpleado(porMes, saldoInicial)
            return (
              <tr key={emp.id} className="border-t border-borde hover:bg-brand-50">
                <td className="sticky left-0 z-10 min-w-44 bg-white px-3 py-2 text-xs font-medium text-tinta">
                  {emp.nombre}
                </td>
                <td className="px-2 py-2 text-right text-xs tabular-nums text-tinta-suave">
                  {emp.cuota_mensual === 0 ? '—' : contable(emp.cuota_mensual)}
                </td>
                {/* Saldo inicial (editable solo admin/contadora) */}
                {esEditor ? (
                  <CeldaEditable
                    valor={saldoInicial}
                    placeholder="0"
                    aria={t.natillera.saldoInicialAria(emp.nombre)}
                    onGuardar={(valor) => onGuardarSaldo(emp.id, valor)}
                  />
                ) : (
                  <CeldaLectura valor={saldoInicial} />
                )}
                {meses.map((mes) => {
                  const monto = porMes?.get(mes) ?? 0
                  return esEditor ? (
                    <CeldaEditable
                      key={mes}
                      valor={monto}
                      prefill={emp.cuota_mensual}
                      placeholder={emp.cuota_mensual === 0 ? '0' : contable(emp.cuota_mensual)}
                      aria={t.natillera.aporteAria(emp.nombre, nombreMes(mes))}
                      onGuardar={(valor) => onGuardarAporte(emp.id, mes, valor)}
                    />
                  ) : (
                    <CeldaLectura key={mes} valor={monto} />
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
          {/* Total del mes (todos los empleados activos). El saldo inicial no es
              un mes: su columna en el pie muestra la suma de saldos iniciales. */}
          <tr className="border-t-2 border-brand-200 bg-brand-50">
            <td className="sticky left-0 z-10 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-900">
              {t.natillera.totalMes}
            </td>
            <td className="px-2 py-2" />
            <td className="px-2 py-2 text-right text-xs font-semibold tabular-nums text-brand-900">
              {contable(totalSaldos)}
            </td>
            {meses.map((mes) => (
              <td key={mes} className="px-2 py-2 text-right text-xs font-semibold tabular-nums text-brand-900">
                {contable(totalDelMes(indice, mes))}
              </td>
            ))}
            <td className="px-3 py-2 text-right text-xs font-bold tabular-nums text-brand-900">
              {moneda(totalGeneralEmpleados(empleados, indice, saldos))}
            </td>
            {esEditor && <td />}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
