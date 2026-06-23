import { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { contable, parsearNumero } from '../../lib/formato'
import { nombreMes } from '../../types/balance'
import { cuotaVigenteEn } from '../../lib/natilleraReporte'
import type { EmpleadoNatillera, NovedadNatillera, TipoNovedad } from '../../types/natillera'

export interface DatosNovedad {
  tipo: TipoNovedad
  anio: number
  mes: number
  valor: number | null
  nota: string | null
}

interface Props {
  /** Empleados (activos) entre los que se puede elegir. */
  empleados: EmpleadoNatillera[]
  /** Empleado preseleccionado (si se abre desde una fila); null = se elige aquí. */
  empleadoInicial: EmpleadoNatillera | null
  /** Novedades indexadas por empleado (para pre-llenar el abono con la cuota vigente). */
  novedadesPorEmpleado: Map<string, NovedadNatillera[]>
  /** Año del reporte activo (la novedad aplica a este año). */
  anio: number
  /** Mes por defecto (el mes actual si el año activo es el de hoy; si no, 1). */
  mesPorDefecto: number
  guardando: boolean
  onConfirmar: (empleado: EmpleadoNatillera, datos: DatosNovedad) => void
  onCerrar: () => void
}

const TIPOS: TipoNovedad[] = ['cambio_cuota', 'no_aporto', 'abono', 'retiro']

/** Modal para registrar una novedad (cambio de cuota, no aportó, abono o retiro). */
export default function ModalNovedad({
  empleados,
  empleadoInicial,
  novedadesPorEmpleado,
  anio,
  mesPorDefecto,
  guardando,
  onConfirmar,
  onCerrar,
}: Props) {
  const { t } = useTranslation()
  const nv = t.natillera.novedades
  const [empleadoId, setEmpleadoId] = useState(empleadoInicial?.id ?? '')
  const [tipo, setTipo] = useState<TipoNovedad>('cambio_cuota')
  const [mes, setMes] = useState(mesPorDefecto)
  const [valorTexto, setValorTexto] = useState('')
  const [nota, setNota] = useState('')
  // Para no pisar lo que el usuario escribe, recordamos el último (empleado,tipo,mes)
  // con el que se pre-llenó el valor.
  const [prefillKey, setPrefillKey] = useState('')

  const empleado = empleados.find((e) => e.id === empleadoId) ?? null

  // 'cambio_cuota' y 'abono' usan valor; 'no_aporto' y 'retiro' no.
  const usaValor = tipo === 'cambio_cuota' || tipo === 'abono'

  // Pre-llena el abono con la cuota vigente del mes elegido (ajuste en render).
  const clavePrefill = `${empleadoId}:${tipo}:${mes}`
  if (prefillKey !== clavePrefill) {
    setPrefillKey(clavePrefill)
    if (tipo === 'abono' && empleado) {
      const vigente = cuotaVigenteEn(
        empleado.cuota_mensual,
        novedadesPorEmpleado.get(empleado.id) ?? [],
        anio,
        mes
      )
      setValorTexto(vigente === 0 ? '' : contable(vigente))
    }
  }

  const enviar = () => {
    if (!empleado) return
    onConfirmar(empleado, {
      tipo,
      anio,
      mes,
      valor: usaValor ? parsearNumero(valorTexto) ?? 0 : null,
      nota: nota.trim() === '' ? null : nota.trim(),
    })
  }

  const titulo = empleado ? nv.modalTitulo(empleado.nombre) : nv.modalTituloGeneral

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div className="w-full max-w-md rounded-xl border border-borde bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-brand-900">{titulo}</h2>

        <div className="mt-4 space-y-4">
          {/* Selector de empleado (solo si no viene preseleccionado) */}
          {!empleadoInicial && (
            <div>
              <label className="block text-xs font-semibold text-tinta-suave" htmlFor="nov-empleado">
                {nv.campoEmpleado}
              </label>
              <select
                id="nov-empleado"
                value={empleadoId}
                onChange={(e) => setEmpleadoId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
              >
                <option value="">{nv.placeholderEmpleado}</option>
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.codigo ? `${e.codigo} · ${e.nombre}` : e.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="nov-tipo">
              {nv.campoTipo}
            </label>
            <select
              id="nov-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoNovedad)}
              className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            >
              {TIPOS.map((tp) => (
                <option key={tp} value={tp}>
                  {nv.tipos[tp]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="nov-mes">
              {nv.campoMes} · {anio}
            </label>
            <select
              id="nov-mes"
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {nombreMes(m)}
                </option>
              ))}
            </select>
          </div>

          {usaValor && (
            <div>
              <label className="block text-xs font-semibold text-tinta-suave" htmlFor="nov-valor">
                {nv.etiquetaValor[tipo]}
              </label>
              <input
                id="nov-valor"
                type="text"
                inputMode="decimal"
                value={valorTexto}
                onChange={(e) => setValorTexto(e.target.value)}
                placeholder="0"
                className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-right text-sm tabular-nums text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="nov-nota">
              {nv.campoNota}
            </label>
            <textarea
              id="nov-nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder={nv.notaPlaceholder}
              rows={2}
              className="mt-1 block w-full resize-y rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            />
          </div>

          {tipo === 'retiro' && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {t.natillera.avisoInactivo}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-borde bg-white px-4 py-2 text-sm font-semibold text-tinta-suave transition-colors duration-150 hover:border-brand-700 hover:text-brand-700"
          >
            {t.comun.cancelar}
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={guardando || !empleado}
            className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? t.natillera.guardando : t.natillera.guardar}
          </button>
        </div>
      </div>
    </div>
  )
}
