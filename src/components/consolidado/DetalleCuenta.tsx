import { detallePorMes } from '../../lib/consolidado'
import { moneda } from '../../lib/formato'
import { nombreMes } from '../../types/balance'
import type { MovimientoResumen } from '../../types/catalogo'

interface DetalleCuentaProps {
  cuenta: string
  movimientos: MovimientoResumen[]
}

/** Detalle mes a mes de una cuenta (agregando sus auxiliares si es un prefijo). */
export default function DetalleCuenta({ cuenta, movimientos }: DetalleCuentaProps) {
  const detalle = detallePorMes(cuenta, movimientos)

  if (detalle.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-ciruela-400">
        Sin movimientos transaccionales para el prefijo {cuenta}.
      </p>
    )
  }

  return (
    <div className="px-4 py-3">
      <table className="w-full text-xs">
        <thead className="text-left text-ciruela-400">
          <tr>
            <th className="py-1.5 pr-3 font-medium">Mes</th>
            <th className="py-1.5 pr-3 text-right font-medium">Auxiliares</th>
            <th className="py-1.5 pr-3 text-right font-medium">Saldo inicial</th>
            <th className="py-1.5 pr-3 text-right font-medium">Débitos</th>
            <th className="py-1.5 pr-3 text-right font-medium">Créditos</th>
            <th className="py-1.5 text-right font-medium">Saldo final</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {detalle.map((d) => (
            <tr key={`${d.anio}-${d.mes}`} className="border-t border-ciruela-800/50">
              <td className="py-1.5 pr-3 font-sans text-ciruela-200">
                {nombreMes(d.mes)} {d.anio}
              </td>
              <td className="py-1.5 pr-3 text-right text-ciruela-400">{d.auxiliares}</td>
              <td className="py-1.5 pr-3 text-right text-ciruela-300">{moneda(d.saldo_inicial)}</td>
              <td className="py-1.5 pr-3 text-right text-ciruela-300">{moneda(d.mov_debito)}</td>
              <td className="py-1.5 pr-3 text-right text-ciruela-300">{moneda(d.mov_credito)}</td>
              <td className="py-1.5 text-right text-white">{moneda(d.saldo_final)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
