import { useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useTranslation } from '../hooks/useTranslation'
import { useRol } from '../hooks/useRol'
import { useAuth } from '../hooks/useAuth'
import { usePeriodoActual } from '../hooks/usePeriodoActual'
import {
  useEmpleadosNatillera,
  useNovedadesNatillera,
  useRetirosNatillera,
  useSaldosInicialesNatillera,
} from '../hooks/useNatillera'
import { anioNatilleraPorDefecto, aniosNatillera, saldoInicialDe } from '../lib/natillera'
import { resolverReporteEmpleado } from '../lib/natilleraReporte'
import type { ReporteEmpleado } from '../lib/natilleraReporte'
import type { EmpleadoNatillera, NovedadNatillera, RetiroNatillera } from '../types/natillera'
import SelectorAnio from '../components/informes/SelectorAnio'
import Toast from '../components/Toast'
import type { DatosToast } from '../components/Toast'
import TablaAportes from '../components/natillera/TablaAportes'
import ModalEmpleado from '../components/natillera/ModalEmpleado'
import type { DatosEmpleado } from '../components/natillera/ModalEmpleado'
import ModalNovedad from '../components/natillera/ModalNovedad'
import type { DatosNovedad } from '../components/natillera/ModalNovedad'
import PanelNovedades from '../components/natillera/PanelNovedades'
import ModalPago from '../components/natillera/ModalPago'
import ComprobanteRetiro from '../components/natillera/ComprobanteRetiro'
import SeccionRetirados from '../components/natillera/SeccionRetirados'
import type { RetiradoFila } from '../components/natillera/SeccionRetirados'

const dosDigitos = (n: number) => String(n).padStart(2, '0')

export default function Natillera() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { esEditor } = useRol()
  const { sesion } = useAuth()
  const periodoActual = usePeriodoActual()

  const [anioElegido, setAnioElegido] = useState<number | null>(null)
  const [toast, setToast] = useState<DatosToast | null>(null)
  const temporizadorToast = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Modales
  const [modalEmpleado, setModalEmpleado] = useState<{ empleado: EmpleadoNatillera | null } | null>(null)
  const [novedadAbierta, setNovedadAbierta] = useState(false)
  const [panelPara, setPanelPara] = useState<EmpleadoNatillera | null>(null)
  const [pagoPara, setPagoPara] = useState<RetiroNatillera | null>(null)
  const [comprobante, setComprobante] = useState<RetiroNatillera | null>(null)

  const avisar = (datos: DatosToast) => {
    if (temporizadorToast.current) clearTimeout(temporizadorToast.current)
    setToast(datos)
    temporizadorToast.current = setTimeout(() => setToast(null), 4000)
  }

  const empleados = useEmpleadosNatillera()
  const novedades = useNovedadesNatillera()
  const retiros = useRetirosNatillera()
  const saldosQuery = useSaldosInicialesNatillera()

  const listaEmpleados = useMemo(() => empleados.data ?? [], [empleados.data])
  const listaNovedades = useMemo(() => novedades.data ?? [], [novedades.data])
  const listaRetiros = useMemo(() => retiros.data ?? [], [retiros.data])
  const saldos = useMemo(() => saldosQuery.data ?? new Map<string, number>(), [saldosQuery.data])

  // "Hoy" controla qué meses se consideran futuros (sin cron: es la fecha real).
  // Memo con referencia estable para no recalcular los reportes en cada render.
  const hoy = useMemo(() => {
    const ahora = new Date()
    return { anio: ahora.getFullYear(), mes: ahora.getMonth() + 1 }
  }, [])

  // Años disponibles (ingreso/retiro + novedades + saldos + año en curso).
  const anios = useMemo(() => {
    const saldoAnios = [...saldos.keys()].map((k) => ({ anio: Number(k.split(':')[1]) }))
    return aniosNatillera(listaEmpleados, listaNovedades, saldoAnios, hoy.anio)
  }, [listaEmpleados, listaNovedades, saldos, hoy.anio])
  const anio = anioNatilleraPorDefecto(anioElegido, anios, periodoActual.data?.anio ?? null) ?? hoy.anio

  // Novedades indexadas por empleado.
  const novedadesPorEmpleado = useMemo(() => {
    const m = new Map<string, NovedadNatillera[]>()
    for (const n of listaNovedades) {
      const arr = m.get(n.empleado_id)
      if (arr) arr.push(n)
      else m.set(n.empleado_id, [n])
    }
    return m
  }, [listaNovedades])

  const activos = useMemo(() => listaEmpleados.filter((e) => e.activo), [listaEmpleados])

  // Reporte calculado (año activo) por empleado ACTIVO.
  const reportes = useMemo(() => {
    const m = new Map<string, ReporteEmpleado>()
    for (const e of activos) {
      m.set(
        e.id,
        resolverReporteEmpleado(
          e,
          novedadesPorEmpleado.get(e.id) ?? [],
          saldoInicialDe(saldos, e.id, anio),
          anio,
          hoy
        )
      )
    }
    return m
  }, [activos, novedadesPorEmpleado, saldos, anio, hoy])

  // Último snapshot de retiro por empleado (para comprobante/estado).
  const retiroPorEmpleado = useMemo(() => {
    const m = new Map<string, RetiroNatillera>()
    for (const r of listaRetiros) {
      const prev = m.get(r.empleado_id)
      if (!prev || r.consecutivo > prev.consecutivo) m.set(r.empleado_id, r)
    }
    return m
  }, [listaRetiros])

  // Filas de retirados: empleados inactivos, con total congelado en su año de retiro.
  const filasRetirados: RetiradoFila[] = useMemo(() => {
    return listaEmpleados
      .filter((e) => !e.activo)
      .map((empleado) => {
        const anioRetiro = empleado.fecha_retiro
          ? Number(empleado.fecha_retiro.split('-')[0])
          : anio
        const rep = resolverReporteEmpleado(
          empleado,
          novedadesPorEmpleado.get(empleado.id) ?? [],
          saldoInicialDe(saldos, empleado.id, anioRetiro),
          anioRetiro,
          hoy
        )
        return { empleado, total: rep.total, retiro: retiroPorEmpleado.get(empleado.id) ?? null }
      })
  }, [listaEmpleados, novedadesPorEmpleado, saldos, anio, hoy, retiroPorEmpleado])

  const codigosExistentes = useMemo(
    () => listaEmpleados.map((e) => e.codigo ?? '').filter((c) => c !== ''),
    [listaEmpleados]
  )
  const nombrePorId = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of listaEmpleados) m.set(e.id, e.nombre)
    return m
  }, [listaEmpleados])
  const codigoPorId = useMemo(() => {
    const m = new Map<string, string | null>()
    for (const e of listaEmpleados) m.set(e.id, e.codigo)
    return m
  }, [listaEmpleados])

  // ── Mutaciones ───────────────────────────────────────────────
  const guardarEmpleado = useMutation({
    mutationFn: async ({ id, datos }: { id: string | null; datos: DatosEmpleado }) => {
      if (id) {
        const { error } = await supabase
          .from('natillera_empleados')
          .update({
            codigo: datos.codigo,
            nombre: datos.nombre,
            cuota_mensual: datos.cuota_mensual,
            fecha_ingreso: datos.fecha_ingreso,
          })
          .eq('id', id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('natillera_empleados').insert({
          codigo: datos.codigo,
          nombre: datos.nombre,
          cuota_mensual: datos.cuota_mensual,
          fecha_ingreso: datos.fecha_ingreso,
          activo: true,
        })
        if (error) throw new Error(error.message)
      }
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: t.natillera.errorEmpleado(e.message) }),
    onSuccess: () => {
      avisar({ tipo: 'exito', mensaje: t.natillera.empleadoGuardado })
      setModalEmpleado(null)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['natillera_empleados'] }),
  })

  const guardarNovedad = useMutation({
    mutationFn: async ({
      empleado,
      datos,
    }: {
      empleado: EmpleadoNatillera
      datos: DatosNovedad
    }): Promise<RetiroNatillera | null> => {
      // 1) Insertar la novedad.
      const { error } = await supabase.from('natillera_novedades').insert({
        empleado_id: empleado.id,
        anio: datos.anio,
        mes: datos.mes,
        tipo: datos.tipo,
        valor: datos.valor,
        nota: datos.nota,
        creado_por: sesion?.user.id ?? null,
      })
      if (error) throw new Error(error.message)

      if (datos.tipo !== 'retiro') return null

      // 2) Retiro: marcar inactivo + fecha_retiro, y generar el snapshot del
      //    comprobante con el total congelado (incluyendo este retiro).
      const fechaRetiro = `${datos.anio}-${dosDigitos(datos.mes)}-01`
      const ahoraIso = new Date().toISOString()
      const novsConRetiro: NovedadNatillera[] = [
        ...(novedadesPorEmpleado.get(empleado.id) ?? []),
        {
          id: 'tmp-retiro',
          empleado_id: empleado.id,
          anio: datos.anio,
          mes: datos.mes,
          tipo: 'retiro',
          valor: null,
          nota: datos.nota,
          creado_en: ahoraIso,
        },
      ]
      const rep = resolverReporteEmpleado(
        empleado,
        novsConRetiro,
        saldoInicialDe(saldos, empleado.id, datos.anio),
        datos.anio,
        hoy
      )

      const { error: e2 } = await supabase
        .from('natillera_empleados')
        .update({ activo: false, fecha_retiro: fechaRetiro })
        .eq('id', empleado.id)
      if (e2) throw new Error(e2.message)

      const { data, error: e3 } = await supabase
        .from('natillera_retiros')
        .insert({
          empleado_id: empleado.id,
          anio: datos.anio,
          fecha_retiro: fechaRetiro,
          monto_total: rep.total,
          motivo: datos.nota,
          generado_por: sesion?.user.id ?? null,
        })
        .select(
          'id, empleado_id, consecutivo, fecha_retiro, anio, monto_total, motivo, estado, fecha_pago'
        )
        .single()
      if (e3) throw new Error(e3.message)
      return { ...data, consecutivo: Number(data.consecutivo), monto_total: Number(data.monto_total) } as RetiroNatillera
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: t.natillera.novedades.error(e.message) }),
    onSuccess: (retiro) => {
      setNovedadAbierta(false)
      if (retiro) {
        avisar({ tipo: 'exito', mensaje: t.natillera.retiroRegistrado })
        setComprobante(retiro)
      } else {
        avisar({ tipo: 'exito', mensaje: t.natillera.novedades.guardada })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['natillera_novedades'] })
      queryClient.invalidateQueries({ queryKey: ['natillera_empleados'] })
      queryClient.invalidateQueries({ queryKey: ['natillera_retiros'] })
    },
  })

  const marcarPagado = useMutation({
    mutationFn: async ({ retiro, fechaPago }: { retiro: RetiroNatillera; fechaPago: string }) => {
      const { error } = await supabase
        .from('natillera_retiros')
        .update({ estado: 'pagado', fecha_pago: fechaPago })
        .eq('id', retiro.id)
      if (error) throw new Error(error.message)
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: t.natillera.errorPago(e.message) }),
    onSuccess: () => {
      avisar({ tipo: 'exito', mensaje: t.natillera.pagoRegistrado })
      setPagoPara(null)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['natillera_retiros'] }),
  })

  const reactivar = useMutation({
    mutationFn: async (empleadoId: string) => {
      // Reactivar = volver a Activo, limpiar fecha_retiro y borrar las novedades
      // de retiro (si no, la resolución seguiría cortando los meses).
      const { error } = await supabase
        .from('natillera_empleados')
        .update({ activo: true, fecha_retiro: null })
        .eq('id', empleadoId)
      if (error) throw new Error(error.message)
      const { error: e2 } = await supabase
        .from('natillera_novedades')
        .delete()
        .eq('empleado_id', empleadoId)
        .eq('tipo', 'retiro')
      if (e2) throw new Error(e2.message)
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: t.natillera.errorEmpleado(e.message) }),
    onSuccess: () => avisar({ tipo: 'exito', mensaje: t.natillera.empleadoGuardado }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['natillera_empleados'] })
      queryClient.invalidateQueries({ queryKey: ['natillera_novedades'] })
    },
  })

  const cargando =
    empleados.isLoading || novedades.isLoading || retiros.isLoading || saldosQuery.isLoading
  const error = empleados.error ?? novedades.error ?? retiros.error ?? saldosQuery.error

  // Mes por defecto del modal de novedad: el mes actual si el año activo es el de
  // hoy; si no, enero.
  const mesPorDefectoNovedad = anio === hoy.anio ? hoy.mes : 1

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">{t.natillera.titulo}</h1>
          <p className="mt-1 max-w-2xl text-sm text-tinta-suave">{t.natillera.descripcion}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SelectorAnio anios={anios} anioSel={anio} onCambiar={setAnioElegido} />
          {esEditor && (
            <>
              <button
                type="button"
                onClick={() => setNovedadAbierta(true)}
                disabled={activos.length === 0}
                className="rounded-lg border border-brand-700 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition-colors duration-150 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + {t.natillera.novedades.registrar}
              </button>
              <button
                type="button"
                onClick={() => setModalEmpleado({ empleado: null })}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900"
              >
                + {t.natillera.agregarEmpleado}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t.natillera.error(error.message)}
        </p>
      )}
      {cargando && <p className="mt-6 text-sm text-tinta-suave">{t.natillera.cargando}</p>}

      {!cargando && !error && (
        <>
          {/* Reporte mensual (empleados activos) — SOLO LECTURA, calculado */}
          <section className="mt-6">
            <h2 className="mb-3 text-lg font-semibold text-brand-900">{t.natillera.aportesTitulo}</h2>
            {activos.length === 0 ? (
              <p className="rounded-xl border border-dashed border-borde bg-white p-6 text-center text-sm text-tinta-suave">
                {t.natillera.sinEmpleados}
              </p>
            ) : (
              <>
                <TablaAportes
                  empleados={activos}
                  reportes={reportes}
                  esEditor={esEditor}
                  onVerNovedades={(empleado) => setPanelPara(empleado)}
                />
                <p className="mt-2 text-xs text-tinta-suave">{t.natillera.notaPie}</p>
              </>
            )}
          </section>

          {/* Retirados */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-brand-900">{t.natillera.retiradosTitulo}</h2>
            <SeccionRetirados
              filas={filasRetirados}
              esEditor={esEditor}
              onVerComprobante={(retiro) => setComprobante(retiro)}
              onMarcarPagado={(retiro) => setPagoPara(retiro)}
              onReactivar={(empleadoId) => reactivar.mutate(empleadoId)}
            />
          </section>
        </>
      )}

      {/* Modales */}
      {modalEmpleado && (
        <ModalEmpleado
          empleado={modalEmpleado.empleado}
          codigosExistentes={codigosExistentes}
          guardando={guardarEmpleado.isPending}
          onGuardar={(datos) =>
            guardarEmpleado.mutate({ id: modalEmpleado.empleado?.id ?? null, datos })
          }
          onCerrar={() => setModalEmpleado(null)}
        />
      )}

      {novedadAbierta && (
        <ModalNovedad
          empleados={activos}
          empleadoInicial={null}
          novedadesPorEmpleado={novedadesPorEmpleado}
          anio={anio}
          mesPorDefecto={mesPorDefectoNovedad}
          guardando={guardarNovedad.isPending}
          onConfirmar={(empleado, datos) => guardarNovedad.mutate({ empleado, datos })}
          onCerrar={() => setNovedadAbierta(false)}
        />
      )}

      {panelPara && (
        <PanelNovedades
          empleado={panelPara}
          novedades={novedadesPorEmpleado.get(panelPara.id) ?? []}
          onCerrar={() => setPanelPara(null)}
        />
      )}

      {pagoPara && (
        <ModalPago
          retiro={pagoPara}
          guardando={marcarPagado.isPending}
          onConfirmar={(fechaPago) => marcarPagado.mutate({ retiro: pagoPara, fechaPago })}
          onCerrar={() => setPagoPara(null)}
        />
      )}

      {comprobante && (
        <ComprobanteRetiro
          retiro={comprobante}
          nombreEmpleado={nombrePorId.get(comprobante.empleado_id) ?? '—'}
          codigoEmpleado={codigoPorId.get(comprobante.empleado_id) ?? null}
          onCerrar={() => setComprobante(null)}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}
