import { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import type { DatosRegistro, Externo, RegistroExterno } from '../../types/externos'

interface Props {
  registro: RegistroExterno
  /** Catálogo (para mostrar el nombre del externo; no se re-vincula al editar). */
  externos: Externo[]
  guardando: boolean
  onGuardar: (datos: DatosRegistro) => void
  onCerrar: () => void
}

const aEntero = (texto: string): number => {
  const n = parseInt(texto.replace(/[^0-9]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}
const aNumero = (texto: string): number => {
  const n = Number(texto.replace(',', '.').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** Edición de un registro de producción (cantidades y fecha). */
export default function ModalRegistro({ registro, externos, guardando, onGuardar, onCerrar }: Props) {
  const { t } = useTranslation()
  const r = t.externos.registro
  const externo = externos.find((e) => e.id === registro.externo_id) ?? null

  const [fecha, setFecha] = useState(registro.fecha)
  const [maq, setMaq] = useState(String(registro.maquillada_tallos))
  const [hyd, setHyd] = useState(String(registro.hydratada_tallos))
  const [horas, setHoras] = useState(String(registro.horas))

  const enviar = () =>
    onGuardar({
      externo_id: registro.externo_id,
      fecha,
      maquillada_tallos: aEntero(maq),
      hydratada_tallos: aEntero(hyd),
      horas: aNumero(horas),
    })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={r.editarTitulo}
    >
      <div className="w-full max-w-md rounded-xl border border-borde bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-brand-900">{r.editarTitulo}</h2>
        <p className="mt-1 text-sm text-tinta-suave">
          {externo ? `${externo.codigo} · ${externo.nombre_completo}` : '—'}
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="reg-fecha">
              {r.fecha}
            </label>
            <input
              id="reg-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-tinta-suave" htmlFor="reg-maq">
                {r.maquillada}
              </label>
              <input
                id="reg-maq"
                type="text"
                inputMode="numeric"
                value={maq}
                onChange={(e) => setMaq(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-right text-sm tabular-nums text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-tinta-suave" htmlFor="reg-hyd">
                {r.hydratada}
              </label>
              <input
                id="reg-hyd"
                type="text"
                inputMode="numeric"
                value={hyd}
                onChange={(e) => setHyd(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-right text-sm tabular-nums text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-tinta-suave" htmlFor="reg-horas">
                {r.horas}
              </label>
              <input
                id="reg-horas"
                type="text"
                inputMode="decimal"
                value={horas}
                onChange={(e) => setHoras(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-right text-sm tabular-nums text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
              />
            </div>
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
            {guardando ? r.guardando : r.guardar}
          </button>
        </div>
      </div>
    </div>
  )
}
