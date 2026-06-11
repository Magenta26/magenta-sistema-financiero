import type { FilaBalance, Periodo, Validacion } from '../../types/balance'
import { MESES_ES, nombreMes } from '../../types/balance'
import { entero, fechaHora, moneda } from '../../lib/formato'

const NOMBRES_CLASE: Record<string, string> = {
  '1': 'Activo',
  '2': 'Pasivo',
  '3': 'Patrimonio',
  '4': 'Ingresos',
  '5': 'Gastos',
  '6': 'Costos',
  '7': 'Costos de producción',
}

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
  const transaccionales = filas.filter((f) => f.transaccional)

  const clasesPresentes = [...new Set(transaccionales.map((f) => f.clase))].sort()
  const totalesPorClase = clasesPresentes.map((clase) => {
    const deClase = transaccionales.filter((f) => f.clase === clase)
    return {
      clase,
      nombre: NOMBRES_CLASE[clase] ?? `Clase ${clase}`,
      cuentas: deClase.length,
      saldoFinal: deClase.reduce((acc, f) => acc + f.saldo_final, 0),
    }
  })

  return (
    <div className="mt-6 rounded-2xl border border-ciruela-700 bg-ciruela-900 p-6">
      <p className="text-sm text-ciruela-400">
        Archivo: <span className="font-mono text-ciruela-200">{nombreArchivo}</span>
      </p>

      {/* Período en grande + selector manual */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        {periodoDetectado ? (
          <p className="text-2xl font-bold text-white">
            Detecté:{' '}
            <span className="text-magenta-400">
              {nombreMes(periodoDetectado.mes)} {periodoDetectado.anio}
            </span>
          </p>
        ) : (
          <p className="text-2xl font-bold text-amber-300">Período no detectado</p>
        )}

        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="mes-manual" className="text-ciruela-400">
            {periodoDetectado ? 'Corregir:' : 'Selecciónalo:'}
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
            className="rounded-lg border border-ciruela-700 bg-ciruela-950 px-2 py-1.5 text-white focus:border-magenta-500 focus:outline-none"
          >
            <option value="" disabled>
              Mes…
            </option>
            {MESES_ES.map((nombre, i) => (
              <option key={nombre} value={i + 1}>
                {nombre}
              </option>
            ))}
          </select>
          <input
            type="number"
            aria-label="Año"
            value={periodoEfectivo?.anio ?? new Date().getFullYear()}
            onChange={(e) =>
              onPeriodoManual({
                mes: periodoEfectivo?.mes ?? 1,
                anio: parseInt(e.target.value, 10) || new Date().getFullYear(),
              })
            }
            className="w-24 rounded-lg border border-ciruela-700 bg-ciruela-950 px-2 py-1.5 text-white focus:border-magenta-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Aviso de reemplazo */}
      {cargaExistente && periodoEfectivo && (
        <p className="mt-4 rounded-lg border border-amber-700 bg-amber-950/50 px-4 py-3 text-sm font-medium text-amber-300">
          ⚠️ {nombreMes(periodoEfectivo.mes)} {periodoEfectivo.anio} ya fue cargado el{' '}
          {fechaHora(cargaExistente.creada_en)}. Esta carga lo{' '}
          <span className="font-bold">REEMPLAZARÁ</span>.
        </p>
      )}

      {/* Conteos y totales por clase */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-ciruela-800 bg-ciruela-950/60 p-4">
          <p className="text-sm text-ciruela-400">Filas</p>
          <p className="mt-1 text-white">
            <span className="text-xl font-bold">{entero(filas.length)}</span> totales ·{' '}
            <span className="text-xl font-bold text-magenta-400">{entero(transaccionales.length)}</span>{' '}
            transaccionales
          </p>
        </div>
        <div className="rounded-xl border border-ciruela-800 bg-ciruela-950/60 p-4">
          <p className="mb-2 text-sm text-ciruela-400">Saldos finales por clase (transaccionales)</p>
          <table className="w-full text-sm">
            <tbody>
              {totalesPorClase.map((t) => (
                <tr key={t.clase} className="border-t border-ciruela-800/60 first:border-t-0">
                  <td className="py-1 pr-2 text-ciruela-300">
                    {t.clase} · {t.nombre}
                  </td>
                  <td className="py-1 pr-2 text-right text-ciruela-400">{t.cuentas} ctas.</td>
                  <td className="py-1 text-right font-mono text-white">{moneda(t.saldoFinal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validaciones */}
      <div className="mt-5">
        <p className="mb-2 text-sm font-semibold text-ciruela-300">Validaciones</p>
        <ul className="space-y-2">
          {validaciones.map((v, i) => (
            <li
              key={i}
              className={`rounded-lg border px-3 py-2 text-sm ${
                v.tipo === 'bloqueante'
                  ? 'border-red-800 bg-red-950/50 text-red-200'
                  : v.tipo === 'advertencia'
                    ? 'border-amber-700 bg-amber-950/40 text-amber-200'
                    : 'border-ciruela-700 bg-ciruela-950/60 text-ciruela-200'
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
