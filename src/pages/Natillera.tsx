import { useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useTranslation } from '../hooks/useTranslation'
import { useRol } from '../hooks/useRol'
import { useAuth } from '../hooks/useAuth'
import { usePeriodoActual } from '../hooks/usePeriodoActual'
import {
  useAniosAportes,
  useAportesNatillera,
  useEmpleadosNatillera,
  useRetirosNatillera,
} from '../hooks/useNatillera'
import {
  anioNatilleraPorDefecto,
  aniosNatillera,
  indexarAportes,
  totalAhorradoEmpleado,
} from '../lib/natillera'
import type { AporteNatillera, EmpleadoNatillera, RetiroNatillera } from '../types/natillera'
import SelectorAnio from '../components/informes/SelectorAnio'
import Toast from '../components/Toast'
import type { DatosToast } from '../components/Toast'
import TablaAportes from '../components/natillera/TablaAportes'
import ModalEmpleado from '../components/natillera/ModalEmpleado'
import type { DatosEmpleado } from '../components/natillera/ModalEmpleado'
import ModalRetiro from '../components/natillera/ModalRetiro'
import type { DatosRetiro } from '../components/natillera/ModalRetiro'
import ModalPago from '../components/natillera/ModalPago'
import ComprobanteRetiro from '../components/natillera/ComprobanteRetiro'
import SeccionRetirados from '../components/natillera/SeccionRetirados'
import type { InactivoSinRetiro } from '../components/natillera/SeccionRetirados'

export default function Natillera() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { esEditor } = useRol()
  const { sesion } = useAuth()
  const periodoActual = usePeriodoActual()

  const [anioElegido, setAnioElegido] = useState<number | null>(null)
  const [toast, setToast] = useState<DatosToast | null>(null)
  const temporizadorToast = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Estados de los modales
  const [modalEmpleado, setModalEmpleado] = useState<{ empleado: EmpleadoNatillera | null } | null>(null)
  const [retiroPara, setRetiroPara] = useState<EmpleadoNatillera | null>(null)
  const [pagoPara, setPagoPara] = useState<RetiroNatillera | null>(null)
  const [comprobante, setComprobante] = useState<RetiroNatillera | null>(null)

  const avisar = (datos: DatosToast) => {
    if (temporizadorToast.current) clearTimeout(temporizadorToast.current)
    setToast(datos)
    temporizadorToast.current = setTimeout(() => setToast(null), 4000)
  }

  const empleados = useEmpleadosNatillera()
  const aniosAportes = useAniosAportes()

  // Años: los que tienen aportes + el año en curso (aunque no tenga aportes aún).
  const anioEnCurso = new Date().getFullYear()
  const anios = useMemo(
    () => aniosNatillera((aniosAportes.data ?? []).map((anio) => ({ anio })), anioEnCurso),
    [aniosAportes.data, anioEnCurso]
  )
  const anio =
    anioNatilleraPorDefecto(anioElegido, anios, periodoActual.data?.anio ?? null) ?? anioEnCurso

  const aportes = useAportesNatillera(anio)
  const retiros = useRetirosNatillera(anio)

  const indice = useMemo(() => indexarAportes(aportes.data ?? [], anio), [aportes.data, anio])

  const listaEmpleados = useMemo(() => empleados.data ?? [], [empleados.data])
  const activos = useMemo(() => listaEmpleados.filter((e) => e.activo), [listaEmpleados])
  const nombrePorId = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of listaEmpleados) m.set(e.id, e.nombre)
    return m
  }, [listaEmpleados])

  // Índice limitado a empleados activos: los totales del pie cuadran con las filas.
  const indiceActivos = useMemo(() => {
    const m = new Map(activos.filter((e) => indice.has(e.id)).map((e) => [e.id, indice.get(e.id)!]))
    return m
  }, [activos, indice])

  // Empleados inactivos sin un retiro en el año (para la sección Retirados).
  const listaRetiros = useMemo(() => retiros.data ?? [], [retiros.data])
  const inactivosSinRetiro: InactivoSinRetiro[] = useMemo(() => {
    const conRetiro = new Set(listaRetiros.map((r) => r.empleado_id))
    return listaEmpleados
      .filter((e) => !e.activo && !conRetiro.has(e.id))
      .map((empleado) => ({ empleado, total: totalAhorradoEmpleado(indice.get(empleado.id)) }))
  }, [listaEmpleados, listaRetiros, indice])

  // ── Mutaciones ───────────────────────────────────────────────
  const guardarEmpleado = useMutation({
    mutationFn: async ({ id, datos }: { id: string | null; datos: DatosEmpleado }) => {
      if (id) {
        const { error } = await supabase
          .from('natillera_empleados')
          .update({
            nombre: datos.nombre,
            cuota_mensual: datos.cuota_mensual,
            fecha_ingreso: datos.fecha_ingreso,
            activo: datos.activo,
          })
          .eq('id', id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('natillera_empleados').insert({
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

  const guardarAporte = useMutation({
    mutationFn: async ({ empleadoId, mes, monto }: { empleadoId: string; mes: number; monto: number }) => {
      const { error } = await supabase.from('natillera_aportes').upsert(
        {
          empleado_id: empleadoId,
          anio,
          mes,
          monto,
          actualizado_por: sesion?.user.id ?? null,
          actualizado_en: new Date().toISOString(),
        },
        { onConflict: 'empleado_id,anio,mes' }
      )
      if (error) throw new Error(error.message)
    },
    onMutate: async ({ empleadoId, mes, monto }) => {
      await queryClient.cancelQueries({ queryKey: ['natillera_aportes', anio] })
      const previo = queryClient.getQueryData<AporteNatillera[]>(['natillera_aportes', anio])
      queryClient.setQueryData<AporteNatillera[]>(['natillera_aportes', anio], (actual) => {
        const copia = actual ? [...actual] : []
        const i = copia.findIndex((a) => a.empleado_id === empleadoId && a.mes === mes)
        if (i >= 0) copia[i] = { ...copia[i], monto }
        else
          copia.push({ id: `opt-${empleadoId}-${mes}`, empleado_id: empleadoId, anio, mes, monto })
        return copia
      })
      return { previo }
    },
    onError: (e, _v, contexto) => {
      if (contexto?.previo) queryClient.setQueryData(['natillera_aportes', anio], contexto.previo)
      avisar({ tipo: 'error', mensaje: t.natillera.errorAporte(e.message) })
    },
    onSuccess: () => avisar({ tipo: 'exito', mensaje: t.natillera.aporteGuardado }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['natillera_aportes', anio] }),
  })

  const registrarRetiro = useMutation({
    mutationFn: async ({
      empleado,
      totalAhorrado,
      datos,
    }: {
      empleado: EmpleadoNatillera
      totalAhorrado: number
      datos: DatosRetiro
    }): Promise<RetiroNatillera> => {
      // 1) Insertar el retiro con el SNAPSHOT del total ahorrado.
      const { data, error } = await supabase
        .from('natillera_retiros')
        .insert({
          empleado_id: empleado.id,
          anio,
          fecha_retiro: datos.fecha_retiro,
          monto_total: totalAhorrado,
          motivo: datos.motivo,
          generado_por: sesion?.user.id ?? null,
        })
        .select(
          'id, empleado_id, consecutivo, fecha_retiro, anio, monto_total, motivo, estado, fecha_pago'
        )
        .single()
      if (error) throw new Error(error.message)
      // 2) Marcar al empleado como inactivo.
      const { error: e2 } = await supabase
        .from('natillera_empleados')
        .update({ activo: false })
        .eq('id', empleado.id)
      if (e2) throw new Error(e2.message)
      return { ...data, consecutivo: Number(data.consecutivo), monto_total: Number(data.monto_total) } as RetiroNatillera
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: t.natillera.errorRetiro(e.message) }),
    onSuccess: (retiro) => {
      avisar({ tipo: 'exito', mensaje: t.natillera.retiroRegistrado })
      setRetiroPara(null)
      setComprobante(retiro) // Abre el comprobante para ver/imprimir.
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['natillera_empleados'] })
      queryClient.invalidateQueries({ queryKey: ['natillera_retiros', anio] })
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
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['natillera_retiros', anio] }),
  })

  const reactivar = useMutation({
    mutationFn: async (empleadoId: string) => {
      const { error } = await supabase
        .from('natillera_empleados')
        .update({ activo: true })
        .eq('id', empleadoId)
      if (error) throw new Error(error.message)
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: t.natillera.errorEmpleado(e.message) }),
    onSuccess: () => avisar({ tipo: 'exito', mensaje: t.natillera.empleadoGuardado }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['natillera_empleados'] }),
  })

  const cargando = empleados.isLoading || aportes.isLoading || retiros.isLoading
  const error = empleados.error ?? aportes.error ?? retiros.error

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
            <button
              type="button"
              onClick={() => setModalEmpleado({ empleado: null })}
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900"
            >
              + {t.natillera.agregarEmpleado}
            </button>
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
          {/* Aportes mensuales (empleados activos × meses) */}
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
                  indice={indiceActivos}
                  esEditor={esEditor}
                  onGuardarAporte={(empleadoId, mes, monto) =>
                    guardarAporte.mutate({ empleadoId, mes, monto })
                  }
                  onEditar={(empleado) => setModalEmpleado({ empleado })}
                  onRetirar={(empleado) => setRetiroPara(empleado)}
                />
                <p className="mt-2 text-xs text-tinta-suave">{t.natillera.notaPie}</p>
              </>
            )}
          </section>

          {/* Retirados */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-brand-900">{t.natillera.retiradosTitulo}</h2>
            <SeccionRetirados
              retiros={listaRetiros}
              inactivosSinRetiro={inactivosSinRetiro}
              nombreEmpleado={(id) => nombrePorId.get(id) ?? '—'}
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
          guardando={guardarEmpleado.isPending}
          onGuardar={(datos) =>
            guardarEmpleado.mutate({ id: modalEmpleado.empleado?.id ?? null, datos })
          }
          onCerrar={() => setModalEmpleado(null)}
        />
      )}

      {retiroPara && (
        <ModalRetiro
          empleado={retiroPara}
          totalAhorrado={totalAhorradoEmpleado(indice.get(retiroPara.id))}
          guardando={registrarRetiro.isPending}
          onConfirmar={(datos) =>
            registrarRetiro.mutate({
              empleado: retiroPara,
              totalAhorrado: totalAhorradoEmpleado(indice.get(retiroPara.id)),
              datos,
            })
          }
          onCerrar={() => setRetiroPara(null)}
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
          onCerrar={() => setComprobante(null)}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}
