import { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { contable, moneda, parsearNumero } from '../../lib/formato'
import { nombreMes } from '../../types/balance'
import type {
  DatosDeduccion,
  DeduccionExterno,
  Externo,
  Quincena,
  TipoDeduccion,
} from '../../types/externos'

interface Props {
  externo: Externo
  anio: number
  mes: number
  quincena: Quincena
  /** Deducciones de ESTE externo en ESTA quincena. */
  deducciones: DeduccionExterno[]
  guardando: boolean
  onCrear: (datos: DatosDeduccion) => void
  onEditar: (id: string, datos: DatosDeduccion) => void
  onBorrar: (id: string) => void
  onCerrar: () => void
}

/**
 * Panel de gestión de deducciones manuales (préstamo / otras) de un externo en
 * una quincena: listar + agregar + editar + borrar. La (anio, quincena) la fija
 * el período activo; aquí no se elige.
 */
export default function ModalDeducciones({
  externo,
  anio,
  mes,
  quincena,
  deducciones,
  guardando,
  onCrear,
  onEditar,
  onBorrar,
  onCerrar,
}: Props) {
  const { t } = useTranslation()
  const d = t.externos.deducciones

  const [editId, setEditId] = useState<string | null>(null)
  const [tipo, setTipo] = useState<TipoDeduccion>('prestamo')
  const [valor, setValor] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState(false)

  const limpiar = () => {
    setEditId(null)
    setTipo('prestamo')
    setValor('')
    setNota('')
    setError(false)
  }

  const enviar = () => {
    const v = parsearNumero(valor) ?? 0
    if (v <= 0) return setError(true)
    const datos: DatosDeduccion = { tipo, valor: v, nota: nota.trim() === '' ? null : nota.trim() }
    if (editId) onEditar(editId, datos)
    else onCrear(datos)
    limpiar()
  }

  const empezarEdicion = (ded: DeduccionExterno) => {
    setEditId(ded.id)
    setTipo(ded.tipo === 'otro' ? 'otro' : 'prestamo')
    setValor(contable(ded.valor, { decimales: 0 }))
    setNota(ded.nota ?? '')
    setError(false)
  }

  const inputCls =
    'mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={d.titulo}
    >
      <div className="w-full max-w-lg rounded-xl border border-borde bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-brand-900">{d.titulo}</h2>
        <p className="mt-1 text-sm text-tinta-suave">
          {externo.codigo} · {externo.nombre_completo} — {nombreMes(mes)} {anio},{' '}
          {quincena === 1 ? t.externos.quincena.primera : t.externos.quincena.segunda}
        </p>

        {/* Lista actual */}
        <div className="mt-4 overflow-hidden rounded-lg border border-borde">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-borde bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-tinta-suave">
                <th className="px-3 py-2">{d.tipo}</th>
                <th className="px-3 py-2">{d.nota}</th>
                <th className="px-3 py-2 text-right">{d.valor}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {deducciones.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-tinta-suave">
                    {d.sinDeducciones}
                  </td>
                </tr>
              ) : (
                deducciones.map((ded) => (
                  <tr key={ded.id} className="border-b border-borde/60 last:border-0">
                    <td className="px-3 py-2 text-tinta">
                      {ded.tipo === 'otro' ? d.tipoOtro : d.tipoPrestamo}
                    </td>
                    <td className="px-3 py-2 text-tinta-suave">{ded.nota || '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-tinta">
                      {moneda(ded.valor, { decimales: 0 })}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => empezarEdicion(ded)}
                          className="text-xs font-semibold text-brand-700 hover:underline"
                        >
                          {t.externos.editar}
                        </button>
                        <button
                          type="button"
                          onClick={() => onBorrar(ded.id)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          {d.borrar}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Alta / edición */}
        <div className="mt-4 rounded-lg border border-borde bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-brand-900">
            {editId ? d.editarTitulo : d.agregarTitulo}
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-tinta-suave" htmlFor="ded-tipo">
                {d.tipo}
              </label>
              <select
                id="ded-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoDeduccion)}
                className={inputCls}
              >
                <option value="prestamo">{d.tipoPrestamo}</option>
                <option value="otro">{d.tipoOtro}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-tinta-suave" htmlFor="ded-valor">
                {d.valor}
              </label>
              <input
                id="ded-valor"
                type="text"
                inputMode="decimal"
                value={valor}
                onChange={(e) => {
                  setValor(e.target.value)
                  if (error) setError(false)
                }}
                placeholder="0"
                className={`${inputCls} text-right tabular-nums`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-tinta-suave" htmlFor="ded-nota">
                {d.nota}
              </label>
              <input
                id="ded-nota"
                type="text"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder={d.notaPlaceholder}
                className={inputCls}
              />
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{d.errorValor}</p>}
          <div className="mt-3 flex justify-end gap-2">
            {editId && (
              <button
                type="button"
                onClick={limpiar}
                className="rounded-lg border border-borde bg-white px-3 py-1.5 text-xs font-semibold text-tinta-suave transition-colors duration-150 hover:border-brand-700 hover:text-brand-700"
              >
                {t.comun.cancelar}
              </button>
            )}
            <button
              type="button"
              onClick={enviar}
              disabled={guardando}
              className="rounded-lg bg-brand-700 px-4 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editId ? d.guardarEdicion : d.agregar}
            </button>
          </div>
        </div>

        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{d.notaPrestamo}</p>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-borde bg-white px-4 py-2 text-sm font-semibold text-tinta-suave transition-colors duration-150 hover:border-brand-700 hover:text-brand-700"
          >
            {d.cerrar}
          </button>
        </div>
      </div>
    </div>
  )
}
