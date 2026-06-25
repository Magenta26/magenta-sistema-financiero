import { useMemo, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { contable, parsearNumero } from '../../lib/formato'
import { siguienteCodigoExterno } from '../../lib/natillera'
import type { EmpleadoNatillera } from '../../types/natillera'
import type { Empleado } from '../../types/empleados'

export interface DatosEmpleado {
  /** id de la ficha central `empleados` (planta) o null (externo). */
  empleado_id: string | null
  codigo: string
  nombre: string
  cuota_mensual: number
  fecha_ingreso: string | null
}

/** Alta por empleado de planta (de la lista) o externo (manual). */
type Tipo = 'empleado' | 'externo'

interface Props {
  /** null = nuevo empleado; con valor = edición. */
  empleado: EmpleadoNatillera | null
  /** Empleados de la ficha central, para el alta por empleado de planta. */
  empleadosFicha: Empleado[]
  /** IDs de empleados ya vinculados a la natillera (se excluyen de la lista). */
  empleadoIdsEnNatillera: string[]
  /** Códigos de TODOS los empleados de la natillera (para autosugerir y validar unicidad). */
  codigosExistentes: string[]
  guardando: boolean
  onGuardar: (datos: DatosEmpleado) => void
  onCerrar: () => void
}

/**
 * Modal para crear o editar un empleado de la natillera.
 * - Crear: selector de TIPO «Empleado» (elegido de la ficha central, código
 *   heredado) o «Externo» (nombre/código manual, EXT-### autosugerido).
 * - Editar: formulario manual de los campos de la fila (sin re-vincular).
 */
export default function ModalEmpleado({
  empleado,
  empleadosFicha,
  empleadoIdsEnNatillera,
  codigosExistentes,
  guardando,
  onGuardar,
  onCerrar,
}: Props) {
  const { t } = useTranslation()
  const esEdicion = empleado != null

  // Empleados de planta que todavía NO están en la natillera (no duplicar vínculo).
  const disponibles = useMemo(
    () => empleadosFicha.filter((e) => !empleadoIdsEnNatillera.includes(e.id)),
    [empleadosFicha, empleadoIdsEnNatillera]
  )

  const [tipo, setTipo] = useState<Tipo>('empleado')
  const [empleadoSelId, setEmpleadoSelId] = useState('')
  // Externo: código autosugerido EXT-### (editable) y nombre manual.
  const [codigo, setCodigo] = useState(
    empleado?.codigo ?? siguienteCodigoExterno(codigosExistentes)
  )
  const [nombre, setNombre] = useState(empleado?.nombre ?? '')
  const [cuota, setCuota] = useState(
    empleado && empleado.cuota_mensual !== 0 ? contable(empleado.cuota_mensual) : ''
  )
  const [fechaIngreso, setFechaIngreso] = useState(empleado?.fecha_ingreso ?? '')

  const [errorEmpleado, setErrorEmpleado] = useState(false)
  const [errorNombre, setErrorNombre] = useState(false)
  const [errorCuota, setErrorCuota] = useState(false)
  const [errorCodigo, setErrorCodigo] = useState<'requerido' | 'duplicado' | null>(null)

  const seleccionado = disponibles.find((e) => e.id === empleadoSelId) ?? null

  const enviar = () => {
    const cuotaNum = parsearNumero(cuota) ?? 0

    // ── Edición: campos manuales (sin re-vincular), como antes. ──
    if (esEdicion) {
      const codigoLimpio = codigo.trim()
      const nombreLimpio = nombre.trim()
      const otros = codigosExistentes.filter(
        (c) => c.toLowerCase() !== (empleado?.codigo ?? '').toLowerCase()
      )
      if (codigoLimpio === '') return setErrorCodigo('requerido')
      if (otros.some((c) => c.toLowerCase() === codigoLimpio.toLowerCase()))
        return setErrorCodigo('duplicado')
      if (nombreLimpio === '') return setErrorNombre(true)
      if (cuotaNum <= 0) return setErrorCuota(true)
      onGuardar({
        empleado_id: empleado?.empleado_id ?? null,
        codigo: codigoLimpio,
        nombre: nombreLimpio,
        cuota_mensual: cuotaNum,
        fecha_ingreso: fechaIngreso === '' ? null : fechaIngreso,
      })
      return
    }

    // ── Alta por empleado de planta: hereda id, código y nombre de la ficha. ──
    if (tipo === 'empleado') {
      if (!seleccionado) return setErrorEmpleado(true)
      if (cuotaNum <= 0) return setErrorCuota(true)
      onGuardar({
        empleado_id: seleccionado.id,
        codigo: seleccionado.codigo,
        nombre: seleccionado.nombre_completo,
        cuota_mensual: cuotaNum,
        fecha_ingreso: fechaIngreso === '' ? null : fechaIngreso,
      })
      return
    }

    // ── Alta externo: nombre/código manuales, sin vínculo. ──
    const codigoLimpio = codigo.trim()
    const nombreLimpio = nombre.trim()
    if (codigoLimpio === '') return setErrorCodigo('requerido')
    if (codigosExistentes.some((c) => c.toLowerCase() === codigoLimpio.toLowerCase()))
      return setErrorCodigo('duplicado')
    if (nombreLimpio === '') return setErrorNombre(true)
    if (cuotaNum <= 0) return setErrorCuota(true)
    onGuardar({
      empleado_id: null,
      codigo: codigoLimpio,
      nombre: nombreLimpio,
      cuota_mensual: cuotaNum,
      fecha_ingreso: fechaIngreso === '' ? null : fechaIngreso,
    })
  }

  const a = t.natillera.alta
  // El bloque manual (nombre + código) se muestra al editar o al crear un externo.
  const mostrarManual = esEdicion || tipo === 'externo'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={esEdicion ? t.natillera.editarEmpleadoTitulo : t.natillera.nuevoEmpleado}
    >
      <div className="w-full max-w-md rounded-xl border border-borde bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-brand-900">
          {esEdicion ? t.natillera.editarEmpleadoTitulo : t.natillera.nuevoEmpleado}
        </h2>

        <div className="mt-4 space-y-4">
          {/* Selector de TIPO (solo al crear) */}
          {!esEdicion && (
            <div>
              <span className="block text-xs font-semibold text-tinta-suave">{a.tipo}</span>
              <div className="mt-1 inline-flex rounded-lg border border-borde bg-gray-50 p-0.5">
                {(['empleado', 'externo'] as const).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setTipo(tp)}
                    className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors duration-150 ${
                      tipo === tp
                        ? 'bg-brand-700 text-white'
                        : 'text-tinta-suave hover:text-brand-700'
                    }`}
                  >
                    {tp === 'empleado' ? a.tipoEmpleado : a.tipoExterno}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Alta por empleado de planta: dropdown de la ficha central */}
          {!esEdicion && tipo === 'empleado' && (
            <div>
              <label className="block text-xs font-semibold text-tinta-suave" htmlFor="nat-empleado">
                {a.empleadoLabel}
              </label>
              {disponibles.length === 0 ? (
                <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {a.sinDisponibles}
                </p>
              ) : (
                <>
                  <select
                    id="nat-empleado"
                    value={empleadoSelId}
                    onChange={(e) => {
                      setEmpleadoSelId(e.target.value)
                      if (errorEmpleado) setErrorEmpleado(false)
                    }}
                    className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
                  >
                    <option value="">{a.seleccionaEmpleado}</option>
                    {disponibles.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.codigo} · {e.nombre_completo}
                      </option>
                    ))}
                  </select>
                  {seleccionado && (
                    <p className="mt-1 text-xs text-tinta-suave">
                      {a.codigoVinculado(seleccionado.codigo)}
                    </p>
                  )}
                  {errorEmpleado && (
                    <p className="mt-1 text-xs text-red-600">{a.errorEmpleadoRequerido}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Nombre + código manuales (editar o externo) */}
          {mostrarManual && (
            <>
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
                {errorNombre && (
                  <p className="mt-1 text-xs text-red-600">{t.natillera.errorNombre}</p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="nat-cuota">
              {t.natillera.cuotaMensual}
            </label>
            <input
              id="nat-cuota"
              type="text"
              inputMode="decimal"
              value={cuota}
              onChange={(e) => {
                setCuota(e.target.value)
                if (errorCuota) setErrorCuota(false)
              }}
              placeholder="0"
              className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-right text-sm tabular-nums text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            />
            {errorCuota && <p className="mt-1 text-xs text-red-600">{a.errorCuota}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="nat-ingreso">
              {a.fechaIngresoNatillera}
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
            disabled={guardando || (!esEdicion && tipo === 'empleado' && disponibles.length === 0)}
            className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? t.natillera.guardando : t.natillera.guardar}
          </button>
        </div>
      </div>
    </div>
  )
}
