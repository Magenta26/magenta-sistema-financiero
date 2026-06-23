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
  empleado: EmpleadoNatillera
  /** Año del reporte activo (la novedad aplica a este año). */
  anio: number
  /** Mes por defecto (el mes actual si el año activo es el de hoy; si no, 1). */
  mesPorDefecto: number
  /** Novedades del empleado (para pre-llenar el abono con la cuota vigente). */
  novedades: NovedadNatillera[]
  guardando: boolean
  onConfirmar: (datos: DatosNovedad) => void
  onCerrar: () => void
}

const TIPOS: TipoNovedad[] = ['cambio_cuota', 'no_aporto', 'abono', 'retiro']

/** Modal para registrar una novedad (cambio de cuota, no aportó, abono o retiro). */
export default function ModalNovedad({
  empleado,
  anio,
  mesPorDefecto,
  novedades,
  guardando,
  onConfirmar,
  onCerrar,
}: Props) {
  const { t } = useTranslation()
  const nv = t.natillera.novedades
  const [tipo, setTipo] = useState<TipoNovedad>('cambio_cuota')
  const [mes, setMes] = useState(mesPorDefecto)
  const [valorTexto, setValorTexto] = useState('')
  const [nota, setNota] = useState('')
  // Para no pisar lo que el usuario escribe, recordamos el último (tipo,mes)
  // con el que se pre-llenó el valor.
  const [prefillKey, setPrefillKey] = useState('')

  // 'cambio_cuota' y 'abono' usan valor; 'no_aporto' y 'retiro' no.
  const usaValor = tipo === 'cambio_cuota' || tipo === 'abono'

  // Pre-llena el abono con la cuota vigente del mes elegido (ajuste en render).
  const clavePrefill = `${tipo}:${mes}`
  if (tipo === 'abono' && prefillKey !== clavePrefill) {
    setPrefillKey(clavePrefill)
    const vigente = cuotaVigenteEn(empleado.cuota_mensual, novedades, anio, mes)
    setValorTexto(vigente === 0 ? '' : contable(vigente))
  } else if (tipo !== 'abono' && prefillKey !== clavePrefill) {
    setPrefillKey(clavePrefill)
  }

  const enviar = () => {
    onConfirmar({
      tipo,
      anio,
      mes,
      valor: usaValor ? parsearNumero(valorTexto) ?? 0 : null,
      nota: nota.trim() === '' ? null : nota.trim(),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={nv.modalTitulo(empleado.nombre)}
    >
      <div className="w-full max-w-md rounded-xl border border-borde bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-brand-900">{nv.modalTitulo(empleado.nombre)}</h2>

        <div className="mt-4 space-y-4">
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
            disabled={guardando}
            className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? t.natillera.guardando : t.natillera.guardar}
          </button>
        </div>
      </div>
    </div>
  )
}
