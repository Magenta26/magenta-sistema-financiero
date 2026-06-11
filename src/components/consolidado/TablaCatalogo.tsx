import { Fragment, useState } from 'react'
import { moneda } from '../../lib/formato'
import type { CuentaCatalogo, MovimientoResumen, RubroEr } from '../../types/catalogo'
import DetalleCuenta from './DetalleCuenta'

export type CampoOrden = 'cuenta' | 'valor'

export interface CambioCuenta {
  cuenta: string
  campos: Partial<Pick<CuentaCatalogo, 'rubro_codigo' | 'incluir_er' | 'incluir_bg'>>
}

const ESTILO_ORIGEN: Record<CuentaCatalogo['origen'], string> = {
  seed: 'bg-ciruela-800 text-ciruela-300',
  auto: 'bg-amber-900/70 text-amber-300',
  manual: 'bg-magenta-600/25 text-magenta-300',
}

interface TablaCatalogoProps {
  cuentas: CuentaCatalogo[]
  valores: Map<string, number>
  rubros: RubroEr[]
  movimientos: MovimientoResumen[]
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
  orden,
  onOrdenar,
  onCambiar,
  guardando,
}: TablaCatalogoProps) {
  const [expandida, setExpandida] = useState<string | null>(null)

  const flecha = (campo: CampoOrden) =>
    orden.campo === campo ? (orden.ascendente ? ' ↑' : ' ↓') : ''

  return (
    <div className="overflow-x-auto rounded-xl border border-ciruela-800">
      <table className="w-full text-sm">
        <thead className="bg-ciruela-900 text-left text-ciruela-400">
          <tr>
            <th className="w-8 px-2 py-2.5"></th>
            <th className="px-3 py-2.5 font-medium">
              <button
                type="button"
                onClick={() => onOrdenar('cuenta')}
                className="hover:text-magenta-300"
              >
                Cuenta{flecha('cuenta')}
              </button>
            </th>
            <th className="px-3 py-2.5 font-medium">Nombre</th>
            <th className="px-3 py-2.5 text-center font-medium">Clase</th>
            <th className="px-3 py-2.5 text-center font-medium">Nat.</th>
            <th className="px-3 py-2.5 font-medium">Rubro</th>
            <th className="px-3 py-2.5 text-center font-medium">ER</th>
            <th className="px-3 py-2.5 text-center font-medium">BG</th>
            <th className="px-3 py-2.5 text-right font-medium">
              <button
                type="button"
                onClick={() => onOrdenar('valor')}
                className="hover:text-magenta-300"
              >
                Valor{flecha('valor')}
              </button>
            </th>
            <th className="px-3 py-2.5 text-center font-medium">Origen</th>
          </tr>
        </thead>
        <tbody>
          {cuentas.map((c) => {
            const abierta = expandida === c.cuenta
            return (
              <Fragment key={c.cuenta}>
                <tr
                  className={`border-t border-ciruela-800/70 transition-colors hover:bg-ciruela-900/60 ${
                    abierta ? 'bg-ciruela-900/80' : 'bg-ciruela-950/40'
                  }`}
                >
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      aria-label={abierta ? 'Cerrar detalle' : 'Ver detalle mes a mes'}
                      onClick={() => setExpandida(abierta ? null : c.cuenta)}
                      className="text-ciruela-400 hover:text-magenta-300"
                    >
                      {abierta ? '▾' : '▸'}
                    </button>
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2 font-mono text-white"
                    onClick={() => setExpandida(abierta ? null : c.cuenta)}
                  >
                    {c.cuenta}
                  </td>
                  <td
                    className="max-w-64 cursor-pointer truncate px-3 py-2 text-ciruela-200"
                    title={c.nombre}
                    onClick={() => setExpandida(abierta ? null : c.cuenta)}
                  >
                    {c.nombre}
                  </td>
                  <td className="px-3 py-2 text-center text-ciruela-300">{c.cuenta[0]}</td>
                  <td className="px-3 py-2 text-center text-ciruela-300">{c.naturaleza}</td>
                  <td className="px-3 py-2">
                    <select
                      aria-label={`Rubro de ${c.cuenta}`}
                      value={c.rubro_codigo ?? ''}
                      disabled={guardando}
                      onChange={(e) =>
                        onCambiar({
                          cuenta: c.cuenta,
                          campos: { rubro_codigo: e.target.value || null },
                        })
                      }
                      className="w-full max-w-56 rounded-lg border border-ciruela-700 bg-ciruela-950 px-2 py-1 text-xs text-white focus:border-magenta-500 focus:outline-none disabled:opacity-60"
                    >
                      <option value="">Sin rubro</option>
                      {rubros.map((r) => (
                        <option key={r.codigo} value={r.codigo}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Incluir ${c.cuenta} en el Estado de Resultados`}
                      checked={c.incluir_er}
                      disabled={guardando}
                      onChange={(e) =>
                        onCambiar({ cuenta: c.cuenta, campos: { incluir_er: e.target.checked } })
                      }
                      className="h-4 w-4 accent-magenta-500"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Incluir ${c.cuenta} en el Balance General`}
                      checked={c.incluir_bg}
                      disabled={guardando}
                      onChange={(e) =>
                        onCambiar({ cuenta: c.cuenta, campos: { incluir_bg: e.target.checked } })
                      }
                      className="h-4 w-4 accent-magenta-500"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-white">
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
                  <tr className="border-t border-ciruela-800/40 bg-ciruela-900/40">
                    <td colSpan={10}>
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
        <p className="px-4 py-6 text-center text-sm text-ciruela-400">
          Ninguna cuenta coincide con los filtros.
        </p>
      )}
    </div>
  )
}
