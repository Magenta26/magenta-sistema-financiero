import { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { siguienteCodigoExterno, validarCodigoExterno } from '../../lib/externos'
import { nombreMostrado } from '../../lib/natillera'
import type { DatosExterno, Externo } from '../../types/externos'
import type { EmpleadoNatillera } from '../../types/natillera'

interface Props {
  /** null = nuevo externo; con valor = edición. */
  externo: Externo | null
  /** Opciones de natillera (activos) para el vínculo opcional. */
  opcionesNat: EmpleadoNatillera[]
  /** Códigos del catálogo (para autosugerir y validar unicidad). */
  codigosExistentes: string[]
  guardando: boolean
  onGuardar: (datos: DatosExterno) => void
  onCerrar: () => void
}

/**
 * Modal de alta/edición del catálogo de externos. Nombre (requerido), cédula
 * (opcional), código EXT-### (autosugerido, editable) y un toggle
 * "¿Ahorra en la natillera?" que, al activarse, muestra el dropdown de externos
 * de la natillera para vincular (`natillera_empleado_id`). Al editar agrega el
 * toggle de estado activo/inactivo.
 */
export default function ModalExterno({
  externo,
  opcionesNat,
  codigosExistentes,
  guardando,
  onGuardar,
  onCerrar,
}: Props) {
  const { t } = useTranslation()
  const x = t.externos.modal
  const esEdicion = externo != null

  const [codigo, setCodigo] = useState(
    externo?.codigo ?? siguienteCodigoExterno(codigosExistentes)
  )
  const [nombre, setNombre] = useState(externo?.nombre_completo ?? '')
  const [cedula, setCedula] = useState(externo?.cedula ?? '')
  const [activo, setActivo] = useState(externo?.activo ?? true)
  const [ahorra, setAhorra] = useState(externo?.natillera_empleado_id != null)
  const [natId, setNatId] = useState(externo?.natillera_empleado_id ?? '')

  const [errorNombre, setErrorNombre] = useState(false)
  const [errorCodigo, setErrorCodigo] = useState<'requerido' | 'duplicado' | null>(null)
  const [errorNat, setErrorNat] = useState(false)

  const enviar = () => {
    const codigoLimpio = codigo.trim()
    const nombreLimpio = nombre.trim()

    const errCod = validarCodigoExterno(codigoLimpio, codigosExistentes, externo?.codigo)
    if (errCod) return setErrorCodigo(errCod)
    if (nombreLimpio === '') return setErrorNombre(true)
    if (ahorra && natId === '') return setErrorNat(true)

    onGuardar({
      codigo: codigoLimpio,
      nombre_completo: nombreLimpio,
      cedula: cedula.trim() === '' ? null : cedula.trim(),
      activo,
      natillera_empleado_id: ahorra ? natId : null,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={esEdicion ? x.editarTitulo : x.nuevoTitulo}
    >
      <div className="w-full max-w-md rounded-xl border border-borde bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-brand-900">
          {esEdicion ? x.editarTitulo : x.nuevoTitulo}
        </h2>

        <div className="mt-4 space-y-4">
          {/* Código */}
          <div>
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="ext-codigo">
              {x.codigo}
            </label>
            <input
              id="ext-codigo"
              type="text"
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value)
                if (errorCodigo) setErrorCodigo(null)
              }}
              placeholder="EXT-001"
              className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 font-mono text-sm text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            />
            {errorCodigo === 'requerido' && (
              <p className="mt-1 text-xs text-red-600">{x.errorCodigoRequerido}</p>
            )}
            {errorCodigo === 'duplicado' && (
              <p className="mt-1 text-xs text-red-600">{x.errorCodigoDuplicado(codigo.trim())}</p>
            )}
          </div>

          {/* Nombre completo */}
          <div>
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="ext-nombre">
              {x.nombre}
            </label>
            <input
              id="ext-nombre"
              type="text"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value)
                if (errorNombre) setErrorNombre(false)
              }}
              placeholder={x.nombrePlaceholder}
              className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            />
            {errorNombre && <p className="mt-1 text-xs text-red-600">{x.errorNombre}</p>}
          </div>

          {/* Cédula (opcional) */}
          <div>
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="ext-cedula">
              {x.cedula}
            </label>
            <input
              id="ext-cedula"
              type="text"
              inputMode="numeric"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder={x.cedulaPlaceholder}
              className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            />
          </div>

          {/* ¿Ahorra en la natillera? */}
          <div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={ahorra}
                onChange={(e) => {
                  setAhorra(e.target.checked)
                  if (!e.target.checked) {
                    setNatId('')
                    setErrorNat(false)
                  }
                }}
                className="h-4 w-4 rounded border-borde text-brand-700 focus:ring-brand-700"
              />
              <span className="text-sm font-medium text-tinta">{x.ahorra}</span>
            </label>

            {ahorra && (
              <div className="mt-2">
                {opcionesNat.length === 0 ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {x.sinNatillera}
                  </p>
                ) : (
                  <>
                    <select
                      value={natId}
                      onChange={(e) => {
                        setNatId(e.target.value)
                        if (errorNat) setErrorNat(false)
                      }}
                      aria-label={x.vinculoLabel}
                      className="block w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
                    >
                      <option value="">{x.seleccionaNatillera}</option>
                      {opcionesNat.map((n) => (
                        <option key={n.id} value={n.id}>
                          {(n.codigo ?? '—') + ' · ' + nombreMostrado(n)}
                        </option>
                      ))}
                    </select>
                    {errorNat && <p className="mt-1 text-xs text-red-600">{x.errorNatillera}</p>}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Estado activo (solo al editar) */}
          {esEdicion && (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="h-4 w-4 rounded border-borde text-brand-700 focus:ring-brand-700"
              />
              <span className="text-sm font-medium text-tinta">{x.activo}</span>
            </label>
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
            {guardando ? x.guardando : x.guardar}
          </button>
        </div>
      </div>
    </div>
  )
}
