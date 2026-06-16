import { Fragment, useState } from 'react'
import { moneda } from '../../lib/formato'
import { nombreCuenta } from '../../lib/nombreCuenta'
import type { MapaTraducciones } from '../../lib/nombreCuenta'
import type { CuentaCatalogo, MovimientoResumen, RubroEr } from '../../types/catalogo'
import DetalleCuenta from './DetalleCuenta'
import { useTranslation } from '../../hooks/useTranslation'
import type { Diccionario } from '../../i18n/es'

export type CampoOrden = 'cuenta' | 'valor'

export interface CambioCuenta {
  cuenta: string
  campos: Partial<Pick<CuentaCatalogo, 'rubro_codigo' | 'incluir_er' | 'incluir_bg'>>
}

/** Celda editable del nombre en inglés (gestión de traducciones). */
function CeldaTraduccion({
  cuenta,
  nombreEn,
  editable,
  onGuardar,
  t,
}: {
  cuenta: string
  nombreEn: string
  editable: boolean
  onGuardar: (cuenta: string, nombreEn: string) => void
  t: Diccionario
}) {
  const pendiente = nombreEn.trim() === ''
  return (
    <div className="flex flex-col gap-1">
      {editable ? (
        <input
          // key: reinicia el valor no controlado cuando cambia la traducción guardada
          key={nombreEn}
          defaultValue={nombreEn}
          aria-label={t.consolidado.nombreEnAria(cuenta)}
          placeholder={t.consolidado.placeholderEn}
          onBlur={(e) => {
            const v = e.target.value.trim()
            if (v !== nombreEn.trim()) onGuardar(cuenta, v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          className="w-full max-w-56 rounded-lg border border-borde bg-white px-2 py-1 text-xs text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
        />
      ) : (
        !pendiente && <span className="text-tinta">{nombreEn}</span>
      )}
      {pendiente && (
        <span className="self-start rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          {t.consolidado.enPendiente}
        </span>
      )}
    </div>
  )
}

const ESTILO_ORIGEN: Record<CuentaCatalogo['origen'], string> = {
  seed: 'bg-gray-100 text-gray-600',
  auto: 'bg-amber-100 text-amber-700',
  manual: 'bg-brand-200/40 text-brand-700',
}

interface TablaCatalogoProps {
  cuentas: CuentaCatalogo[]
  valores: Map<string, number>
  rubros: RubroEr[]
  movimientos: MovimientoResumen[]
  traducciones: MapaTraducciones
  puedeEditarTraduccion: boolean
  onTraducir: (cuenta: string, nombreEn: string) => void
  orden: { campo: CampoOrden; ascendente: boolean }
  onOrdenar: (campo: CampoOrden) => void
  onCambiar: (cambio: CambioCuenta) => void
  guardando: boolean
}

export default function TablaCatalogo({
  cuentas,
  valores,
  rubros,
  movimientos,
  traducciones,
  puedeEditarTraduccion,
  onTraducir,
  orden,
  onOrdenar,
  onCambiar,
  guardando,
}: TablaCatalogoProps) {
  const { t } = useTranslation()
  const [expandida, setExpandida] = useState<string | null>(null)

  const flecha = (campo: CampoOrden) =>
    orden.campo === campo ? (orden.ascendente ? ' ↑' : ' ↓') : ''

  return (
    <div className="overflow-x-auto rounded-xl border border-borde bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-50 text-left text-brand-900">
          <tr>
            <th className="w-8 px-2 py-2.5"></th>
            <th className="px-3 py-2.5 font-semibold">
              <button
                type="button"
                onClick={() => onOrdenar('cuenta')}
                className="transition-colors duration-150 hover:text-brand-700"
              >
                {t.consolidado.encabezados.cuenta}
                {flecha('cuenta')}
              </button>
            </th>
            <th className="px-3 py-2.5 font-semibold">{t.consolidado.encabezados.nombre}</th>
            <th className="px-3 py-2.5 font-semibold">{t.consolidado.encabezados.nombreEn}</th>
            <th className="px-3 py-2.5 text-center font-semibold">{t.consolidado.encabezados.clase}</th>
            <th className="px-3 py-2.5 text-center font-semibold">{t.consolidado.encabezados.naturaleza}</th>
            <th className="px-3 py-2.5 font-semibold">{t.consolidado.encabezados.rubro}</th>
            <th className="px-3 py-2.5 text-center font-semibold">ER</th>
            <th className="px-3 py-2.5 text-center font-semibold">BG</th>
            <th className="px-3 py-2.5 text-right font-semibold">
              <button
                type="button"
                onClick={() => onOrdenar('valor')}
                className="transition-colors duration-150 hover:text-brand-700"
              >
                {t.consolidado.encabezados.valor}
                {flecha('valor')}
              </button>
            </th>
            <th className="px-3 py-2.5 text-center font-semibold">{t.consolidado.encabezados.origen}</th>
          </tr>
        </thead>
        <tbody>
          {cuentas.map((c) => {
            const abierta = expandida === c.cuenta
            return (
              <Fragment key={c.cuenta}>
                <tr
                  className={`border-t border-borde transition-colors duration-150 even:bg-gray-50/60 hover:bg-brand-50 ${
                    abierta ? 'bg-brand-50' : ''
                  }`}
                >
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      aria-label={abierta ? t.consolidado.cerrarDetalle : t.consolidado.abrirDetalle}
                      onClick={() => setExpandida(abierta ? null : c.cuenta)}
                      className="text-tinta-suave transition-colors duration-150 hover:text-brand-700"
                    >
                      {abierta ? '▾' : '▸'}
                    </button>
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2 font-mono text-tinta"
                    onClick={() => setExpandida(abierta ? null : c.cuenta)}
                  >
                    {c.cuenta}
                  </td>
                  <td
                    className="max-w-64 cursor-pointer truncate px-3 py-2 text-tinta"
                    title={nombreCuenta(traducciones, c.cuenta, c.nombre).sinTraducir ? 'Untranslated' : c.nombre}
                    onClick={() => setExpandida(abierta ? null : c.cuenta)}
                  >
                    {nombreCuenta(traducciones, c.cuenta, c.nombre).texto}
                  </td>
                  <td className="max-w-56 px-3 py-2">
                    <CeldaTraduccion
                      cuenta={c.cuenta}
                      nombreEn={traducciones.get(c.cuenta) ?? ''}
                      editable={puedeEditarTraduccion}
                      onGuardar={onTraducir}
                      t={t}
                    />
                  </td>
                  <td className="px-3 py-2 text-center text-tinta-suave">{c.cuenta[0]}</td>
                  <td className="px-3 py-2 text-center text-tinta-suave">{c.naturaleza}</td>
                  <td className="px-3 py-2">
                    <select
                      aria-label={t.consolidado.rubroAria(c.cuenta)}
                      value={c.rubro_codigo ?? ''}
                      disabled={guardando}
                      onChange={(e) =>
                        onCambiar({
                          cuenta: c.cuenta,
                          campos: { rubro_codigo: e.target.value || null },
                        })
                      }
                      className="w-full max-w-56 rounded-lg border border-borde bg-white px-2 py-1 text-xs text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none disabled:opacity-60"
                    >
                      <option value="">{t.consolidado.sinRubro}</option>
                      {rubros.map((r) => (
                        <option key={r.codigo} value={r.codigo}>
                          {t.rubros[r.codigo] ?? r.nombre}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={t.consolidado.incluirErAria(c.cuenta)}
                      checked={c.incluir_er}
                      disabled={guardando}
                      onChange={(e) =>
                        onCambiar({ cuenta: c.cuenta, campos: { incluir_er: e.target.checked } })
                      }
                      className="h-4 w-4 accent-brand-700"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={t.consolidado.incluirBgAria(c.cuenta)}
                      checked={c.incluir_bg}
                      disabled={guardando}
                      onChange={(e) =>
                        onCambiar({ cuenta: c.cuenta, campos: { incluir_bg: e.target.checked } })
                      }
                      className="h-4 w-4 accent-brand-700"
                    />
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      (valores.get(c.cuenta) ?? 0) < 0 ? 'text-red-600' : 'text-tinta'
                    }`}
                  >
                    {moneda(valores.get(c.cuenta) ?? 0)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTILO_ORIGEN[c.origen]}`}
                    >
                      {c.origen}
                    </span>
                  </td>
                </tr>
                {abierta && (
                  <tr className="border-t border-borde bg-brand-50/60">
                    <td colSpan={11}>
                      <DetalleCuenta cuenta={c.cuenta} movimientos={movimientos} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      {cuentas.length === 0 && (
        <p className="px-4 py-6 text-center text-sm text-tinta-suave">
          {t.consolidado.sinCoincidencias}
        </p>
      )}
    </div>
  )
}
