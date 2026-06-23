import { useTranslation } from '../../hooks/useTranslation'
import { fecha, moneda } from '../../lib/formato'
import { montoEnLetras } from '../../lib/montoEnLetras'
import type { RetiroNatillera } from '../../types/natillera'
import logo from '../../assets/Logo.png'

interface Props {
  retiro: RetiroNatillera
  nombreEmpleado: string
  codigoEmpleado: string | null
  onCerrar: () => void
}

/**
 * Comprobante de Retiro Voluntario imprimible. La hoja lleva id="comprobante-print";
 * el CSS @media print (index.css) oculta el resto de la app para que Ctrl+P /
 * "Imprimir" salgan limpios. Reimprimible desde el registro del retiro.
 */
export default function ComprobanteRetiro({
  retiro,
  nombreEmpleado,
  codigoEmpleado,
  onCerrar,
}: Props) {
  const { t, idioma } = useTranslation()
  const c = t.natillera.comprobante

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={c.titulo}
    >
      <div className="w-full max-w-2xl">
        {/* Barra de acciones (no se imprime) */}
        <div className="no-imprimir mb-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900"
          >
            🖨 {c.imprimir}
          </button>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-borde bg-white px-4 py-2 text-sm font-semibold text-tinta-suave transition-colors duration-150 hover:border-brand-700 hover:text-brand-700"
          >
            {c.cerrar}
          </button>
        </div>

        {/* Hoja imprimible */}
        <div
          id="comprobante-print"
          className="rounded-xl border border-borde bg-white p-8 text-tinta shadow-lg"
        >
          {/* Encabezado */}
          <div className="flex items-center justify-between gap-4 border-b border-borde pb-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Magenta Farms" className="h-14 w-14 object-contain" />
              <div>
                <p className="text-base font-bold text-brand-900">{c.empresa}</p>
                <p className="text-sm text-tinta-suave">{c.titulo}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-tinta-suave">{c.numero}</p>
              <p className="text-2xl font-bold tabular-nums text-brand-700">
                {String(retiro.consecutivo).padStart(5, '0')}
              </p>
            </div>
          </div>

          {/* Datos */}
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-dashed border-borde pb-2">
              <dt className="font-semibold text-tinta-suave">{c.fecha}</dt>
              <dd className="text-right tabular-nums">{fecha(retiro.fecha_retiro)}</dd>
            </div>
            {codigoEmpleado && (
              <div className="flex justify-between gap-4 border-b border-dashed border-borde pb-2">
                <dt className="font-semibold text-tinta-suave">{c.codigo}</dt>
                <dd className="text-right font-mono">{codigoEmpleado}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 border-b border-dashed border-borde pb-2">
              <dt className="font-semibold text-tinta-suave">{c.empleado}</dt>
              <dd className="text-right font-medium">{nombreEmpleado}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-dashed border-borde pb-2">
              <dt className="font-semibold text-tinta-suave">{c.montoNumeros}</dt>
              <dd className="text-right text-lg font-bold tabular-nums text-brand-900">
                {moneda(retiro.monto_total)}
              </dd>
            </div>
            <div className="border-b border-dashed border-borde pb-2">
              <dt className="font-semibold text-tinta-suave">{c.montoLetras}</dt>
              <dd className="mt-0.5 italic text-tinta">{montoEnLetras(retiro.monto_total, idioma)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-dashed border-borde pb-2">
              <dt className="font-semibold text-tinta-suave">{c.motivo}</dt>
              <dd className="text-right">{retiro.motivo?.trim() ? retiro.motivo : c.sinMotivo}</dd>
            </div>
            <div className="flex justify-between gap-4 pb-2">
              <dt className="font-semibold text-tinta-suave">{c.estado}</dt>
              <dd className="text-right">
                {t.natillera.estados[retiro.estado] ?? retiro.estado}
                {retiro.estado === 'pagado' && retiro.fecha_pago
                  ? ` · ${fecha(retiro.fecha_pago)}`
                  : ''}
              </dd>
            </div>
          </dl>

          {/* Firmas */}
          <div className="mt-16 grid grid-cols-2 gap-10">
            <div className="border-t border-tinta pt-2 text-center text-sm">{c.firmaEmpleado}</div>
            <div className="border-t border-tinta pt-2 text-center text-sm">{c.firmaRepresentante}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
