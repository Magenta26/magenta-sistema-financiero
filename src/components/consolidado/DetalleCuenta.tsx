import { detallePorMes } from '../../lib/consolidado'
import { moneda } from '../../lib/formato'
import { nombreMes } from '../../types/balance'
import type { MovimientoResumen } from '../../types/catalogo'
import { useTranslation } from '../../hooks/useTranslation'

interface DetalleCuentaProps {
  cuenta: string
  movimientos: MovimientoResumen[]
}

/** Detalle mes a mes de una cuenta (agregando sus auxiliares si es un prefijo). */
export default function DetalleCuenta({ cuenta, movimientos }: DetalleCuentaProps) {
  const { t } = useTranslation()
  const detalle = detallePorMes(cuenta, movimientos)

  if (detalle.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-tinta-suave">
        {t.consolidado.detalle.sinMovimientos(cuenta)}
      </p>
    )
  }

  return (
    <div className="px-4 py-3">
      <table className="w-full text-xs">
        <thead className="text-left text-tinta-suave">
          <tr>
            <th className="py-1.5 pr-3 font-medium">{t.consolidado.detalle.mes}</th>
            <th className="py-1.5 pr-3 text-right font-medium">{t.consolidado.detalle.auxiliares}</th>
            <th className="py-1.5 pr-3 text-right font-medium">{t.consolidado.detalle.saldoInicial}</th>
            <th className="py-1.5 pr-3 text-right font-medium">{t.consolidado.detalle.debitos}</th>
            <th className="py-1.5 pr-3 text-right font-medium">{t.consolidado.detalle.creditos}</th>
            <th className="py-1.5 text-right font-medium">{t.consolidado.detalle.saldoFinal}</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {detalle.map((d) => (
            <tr key={`${d.anio}-${d.mes}`} className="border-t border-borde">
              <td className="py-1.5 pr-3 text-tinta">
                {nombreMes(d.mes)} {d.anio}
              </td>
              <td className="py-1.5 pr-3 text-right text-tinta-suave">{d.auxiliares}</td>
              <td className="py-1.5 pr-3 text-right text-tinta-suave">{moneda(d.saldo_inicial)}</td>
              <td className="py-1.5 pr-3 text-right text-tinta-suave">{moneda(d.mov_debito)}</td>
              <td className="py-1.5 pr-3 text-right text-tinta-suave">{moneda(d.mov_credito)}</td>
              <td className={`py-1.5 text-right font-medium ${d.saldo_final < 0 ? 'text-red-600' : 'text-tinta'}`}>
                {moneda(d.saldo_final)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
