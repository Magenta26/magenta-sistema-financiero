import { useMemo } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { nombreMostrado } from '../../lib/natillera'
import type { ReporteEmpleado } from '../../lib/natilleraReporte'
import type { EmpleadoNatillera, RetiroNatillera } from '../../types/natillera'
import TablaAportes from './TablaAportes'

/** Fila de un empleado retirado (activo=false) con su reporte congelado y snapshot. */
export interface RetiradoFila {
  empleado: EmpleadoNatillera
  /** Reporte calculado al año de retiro (meses resueltos hasta el retiro, total congelado). */
  reporte: ReporteEmpleado
  /** Snapshot de natillera_retiros (para comprobante/estado); null si no hay. */
  retiro: RetiroNatillera | null
}

interface Props {
  filas: RetiradoFila[]
  esEditor: boolean
  onVerComprobante: (retiro: RetiroNatillera) => void
  onMarcarPagado: (retiro: RetiroNatillera) => void
  onReactivar: (empleadoId: string) => void
  onVerNovedades: (empleado: EmpleadoNatillera) => void
}

function BadgeEstado({ estado }: { estado: 'pendiente' | 'pagado' }) {
  const { t } = useTranslation()
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        estado === 'pagado' ? 'bg-green-100 text-exito' : 'bg-amber-100 text-amber-800'
      }`}
    >
      {t.natillera.estados[estado] ?? estado}
    </span>
  )
}

/**
 * Sección "Retirados": misma tabla mensual que los activos (vía TablaAportes) con
 * la columna "Fecha de retiro" y las acciones de comprobante / pagado / reactivar.
 */
export default function SeccionRetirados({
  filas,
  esEditor,
  onVerComprobante,
  onMarcarPagado,
  onReactivar,
  onVerNovedades,
}: Props) {
  const { t } = useTranslation()

  const empleados = useMemo(() => filas.map((f) => f.empleado), [filas])
  const reportes = useMemo(() => {
    const m = new Map<string, ReporteEmpleado>()
    for (const f of filas) m.set(f.empleado.id, f.reporte)
    return m
  }, [filas])
  const retiroPorEmpleado = useMemo(() => {
    const m = new Map<string, RetiroNatillera | null>()
    for (const f of filas) m.set(f.empleado.id, f.retiro)
    return m
  }, [filas])

  if (filas.length === 0) {
    return (
      <p className="mt-3 rounded-xl border border-dashed border-borde bg-white p-6 text-center text-sm text-tinta-suave">
        {t.natillera.sinRetirados}
      </p>
    )
  }

  return (
    <div className="mt-3">
      <TablaAportes
        empleados={empleados}
        reportes={reportes}
        esEditor={esEditor}
        onVerNovedades={onVerNovedades}
        mostrarFechaRetiro
        renderAccionesExtra={(emp) => {
          const retiro = retiroPorEmpleado.get(emp.id) ?? null
          return (
            <>
              {retiro ? (
                <BadgeEstado estado={retiro.estado} />
              ) : (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-tinta-suave">
                  {t.natillera.inactivo}
                </span>
              )}
              {retiro && (
                <button
                  type="button"
                  onClick={() => onVerComprobante(retiro)}
                  aria-label={t.natillera.verComprobanteAria(nombreMostrado(emp))}
                  className="text-xs font-semibold text-brand-700 transition-colors duration-150 hover:text-brand-900"
                >
                  {t.natillera.verComprobante}
                </button>
              )}
              {esEditor && retiro && retiro.estado === 'pendiente' && (
                <button
                  type="button"
                  onClick={() => onMarcarPagado(retiro)}
                  className="text-xs font-semibold text-exito transition-colors duration-150 hover:underline"
                >
                  {t.natillera.marcarPagado}
                </button>
              )}
              {esEditor && (
                <button
                  type="button"
                  onClick={() => onReactivar(emp.id)}
                  className="text-xs font-semibold text-tinta-suave transition-colors duration-150 hover:text-brand-700"
                >
                  {t.natillera.marcarActivo}
                </button>
              )}
            </>
          )
        }}
      />
    </div>
  )
}
