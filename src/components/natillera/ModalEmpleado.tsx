import { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { contable, parsearNumero } from '../../lib/formato'
import { siguienteCodigoEmpleado } from '../../lib/natillera'
import type { EmpleadoNatillera } from '../../types/natillera'

export interface DatosEmpleado {
  codigo: string
  nombre: string
  cuota_mensual: number
  fecha_ingreso: string | null
}

interface Props {
  /** null = nuevo empleado; con valor = edición. */
  empleado: EmpleadoNatillera | null
  /** Códigos de TODOS los empleados (para autosugerir y validar unicidad). */
  codigosExistentes: string[]
  guardando: boolean
  onGuardar: (datos: DatosEmpleado) => void
  onCerrar: () => void
}

/** Modal para crear o editar un empleado de la natillera. */
export default function ModalEmpleado({
  empleado,
  codigosExistentes,
  guardando,
  onGuardar,
  onCerrar,
}: Props) {
  const { t } = useTranslation()
  // Al crear, autosugiere el siguiente EMP-### (editable). Al editar, el actual.
  const [codigo, setCodigo] = useState(
    empleado?.codigo ?? siguienteCodigoEmpleado(codigosExistentes)
  )
  const [nombre, setNombre] = useState(empleado?.nombre ?? '')
  const [cuota, setCuota] = useState(
    empleado && empleado.cuota_mensual !== 0 ? contable(empleado.cuota_mensual) : ''
  )
  const [fechaIngreso, setFechaIngreso] = useState(empleado?.fecha_ingreso ?? '')
  const [errorNombre, setErrorNombre] = useState(false)
  const [errorCodigo, setErrorCodigo] = useState<'requerido' | 'duplicado' | null>(null)

  const enviar = () => {
    const codigoLimpio = codigo.trim()
    const nombreLimpio = nombre.trim()
    // Unicidad: comparar (sin distinguir mayúsculas) contra los OTROS empleados.
    const otros = codigosExistentes.filter(
      (c) => c.toLowerCase() !== (empleado?.codigo ?? '').toLowerCase()
    )
    if (codigoLimpio === '') {
      setErrorCodigo('requerido')
      return
    }
    if (otros.some((c) => c.toLowerCase() === codigoLimpio.toLowerCase())) {
      setErrorCodigo('duplicado')
      return
    }
    if (nombreLimpio === '') {
      setErrorNombre(true)
      return
    }
    onGuardar({
      codigo: codigoLimpio,
      nombre: nombreLimpio,
      cuota_mensual: parsearNumero(cuota) ?? 0,
      fecha_ingreso: fechaIngreso === '' ? null : fechaIngreso,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={empleado ? t.natillera.editarEmpleadoTitulo : t.natillera.nuevoEmpleado}
    >
      <div className="w-full max-w-md rounded-xl border border-borde bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-brand-900">
          {empleado ? t.natillera.editarEmpleadoTitulo : t.natillera.nuevoEmpleado}
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="nat-codigo">
              {t.natillera.codigo}
            </label>
            <input
              id="nat-codigo"
              type="text"
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value)
                if (errorCodigo) setErrorCodigo(null)
              }}
              placeholder={t.natillera.codigoPlaceholder}
              className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 font-mono text-sm text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            />
            {errorCodigo === 'requerido' && (
              <p className="mt-1 text-xs text-red-600">{t.natillera.errorCodigoRequerido}</p>
            )}
            {errorCodigo === 'duplicado' && (
              <p className="mt-1 text-xs text-red-600">
                {t.natillera.errorCodigoDuplicado(codigo.trim())}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="nat-nombre">
              {t.natillera.nombre}
            </label>
            <input
              id="nat-nombre"
              type="text"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value)
                if (errorNombre) setErrorNombre(false)
              }}
              placeholder={t.natillera.nombrePlaceholder}
              className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            />
            {errorNombre && <p className="mt-1 text-xs text-red-600">{t.natillera.errorNombre}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="nat-cuota">
              {t.natillera.cuotaMensual}
            </label>
            <input
              id="nat-cuota"
              type="text"
              inputMode="decimal"
              value={cuota}
              onChange={(e) => setCuota(e.target.value)}
              placeholder="0"
              className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-right text-sm tabular-nums text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="nat-ingreso">
              {t.natillera.fechaIngreso}
            </label>
            <input
              id="nat-ingreso"
              type="date"
              value={fechaIngreso}
              onChange={(e) => setFechaIngreso(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            />
          </div>
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
