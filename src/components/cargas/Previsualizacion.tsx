import type { FilaBalance, Periodo, Validacion } from '../../types/balance'
import { nombreMes } from '../../types/balance'
import { entero, fechaHora, moneda } from '../../lib/formato'
import { useTranslation } from '../../hooks/useTranslation'

const ICONO_VALIDACION = { bloqueante: '⛔', advertencia: '⚠️', info: 'ℹ️' } as const

interface PrevisualizacionProps {
  nombreArchivo: string
  filas: FilaBalance[]
  periodoDetectado: Periodo | null
  periodoEfectivo: Periodo | null
  onPeriodoManual: (periodo: Periodo) => void
  validaciones: Validacion[]
  /** Carga activa existente para el período efectivo, si la hay. */
  cargaExistente: { creada_en: string } | null
}

export default function Previsualizacion({
  nombreArchivo,
  filas,
  periodoDetectado,
  periodoEfectivo,
  onPeriodoManual,
  validaciones,
  cargaExistente,
}: PrevisualizacionProps) {
  const { t } = useTranslation()
  const transaccionales = filas.filter((f) => f.transaccional)

  const clasesPresentes = [...new Set(transaccionales.map((f) => f.clase))].sort()
  const totalesPorClase = clasesPresentes.map((clase) => {
    const deClase = transaccionales.filter((f) => f.clase === clase)
    return {
      clase,
      nombre: t.clases[clase] ?? `${clase}`,
      cuentas: deClase.length,
      saldoFinal: deClase.reduce((acc, f) => acc + f.saldo_final, 0),
    }
  })

  return (
    <div className="mt-6 rounded-2xl border border-borde bg-white p-6 shadow-sm">
      <p className="text-sm text-tinta-suave">
        {t.cargas.archivo} <span className="font-mono text-tinta">{nombreArchivo}</span>
      </p>

      {/* Período en grande + selector manual */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        {periodoDetectado ? (
          <p className="text-2xl font-bold text-brand-900">
            {t.cargas.detecte}{' '}
            <span className="text-brand-700">
              {nombreMes(periodoDetectado.mes)} {periodoDetectado.anio}
            </span>
          </p>
        ) : (
          <p className="text-2xl font-bold text-amber-600">{t.cargas.periodoNoDetectado}</p>
        )}

        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="mes-manual" className="text-tinta-suave">
            {periodoDetectado ? t.cargas.corregir : t.cargas.seleccionalo}
          </label>
          <select
            id="mes-manual"
            value={periodoEfectivo?.mes ?? ''}
            onChange={(e) =>
              onPeriodoManual({
                mes: parseInt(e.target.value, 10),
                anio: periodoEfectivo?.anio ?? new Date().getFullYear(),
              })
            }
            className="rounded-lg border border-borde bg-white px-2 py-1.5 text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
          >
            <option value="" disabled>
              {t.cargas.mesPlaceholder}
            </option>
            {t.meses.map((nombre, i) => (
              <option key={nombre} value={i + 1}>
                {nombre}
              </option>
            ))}
          </select>
          <input
            type="number"
            aria-label={t.cargas.anioAria}
            value={periodoEfectivo?.anio ?? new Date().getFullYear()}
            onChange={(e) =>
              onPeriodoManual({
                mes: periodoEfectivo?.mes ?? 1,
                anio: parseInt(e.target.value, 10) || new Date().getFullYear(),
              })
            }
            className="w-24 rounded-lg border border-borde bg-white px-2 py-1.5 text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
          />
        </div>
      </div>

      {/* Aviso de reemplazo */}
      {cargaExistente && periodoEfectivo && (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          ⚠️{' '}
          {t.cargas.avisoReemplazo(
            `${nombreMes(periodoEfectivo.mes)} ${periodoEfectivo.anio}`,
            fechaHora(cargaExistente.creada_en)
          )}
          <span className="font-bold">{t.cargas.reemplazara}</span>.
        </p>
      )}

      {/* Conteos y totales por clase */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-borde bg-fondo p-4">
          <p className="text-sm text-tinta-suave">{t.cargas.filas}</p>
          <p className="mt-1 text-tinta">
            <span className="text-xl font-bold text-brand-900">{entero(filas.length)}</span>{' '}
            {t.cargas.totales} ·{' '}
            <span className="text-xl font-bold text-brand-700">{entero(transaccionales.length)}</span>{' '}
            {t.cargas.transaccionales}
          </p>
        </div>
        <div className="rounded-xl border border-borde bg-fondo p-4">
          <p className="mb-2 text-sm text-tinta-suave">{t.cargas.saldosPorClase}</p>
          <table className="w-full text-sm">
            <tbody>
              {totalesPorClase.map((fila) => (
                <tr key={fila.clase} className="border-t border-borde first:border-t-0">
                  <td className="py-1 pr-2 text-tinta">
                    {fila.clase} · {fila.nombre}
                  </td>
                  <td className="py-1 pr-2 text-right text-tinta-suave">
                    {fila.cuentas} {t.cargas.cuentasAbrev}
                  </td>
                  <td className="py-1 text-right tabular-nums text-tinta">{moneda(fila.saldoFinal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validaciones */}
      <div className="mt-5">
        <p className="mb-2 text-sm font-semibold text-brand-900">{t.cargas.validaciones}</p>
        <ul className="space-y-2">
          {validaciones.map((v, i) => (
            <li
              key={i}
              className={`rounded-lg border px-3 py-2 text-sm ${
                v.tipo === 'bloqueante'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : v.tipo === 'advertencia'
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-borde bg-fondo text-tinta'
              }`}
            >
              <span className="mr-1.5">{ICONO_VALIDACION[v.tipo]}</span>
              {v.mensaje}
              {v.detalle && <span className="mt-0.5 block text-xs opacity-75">{v.detalle}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
