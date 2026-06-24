import { useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useTranslation } from '../hooks/useTranslation'
import { useRol } from '../hooks/useRol'
import { useAuth } from '../hooks/useAuth'
import { useEmpleados } from '../hooks/useEmpleados'
import { usePeriodosVacaciones } from '../hooks/useVacaciones'
import { aniosVacaciones, causaAplica, resumenVacaciones } from '../lib/vacaciones'
import type { ResumenVacaciones } from '../lib/vacaciones'
import type { Empleado } from '../types/empleados'
import type { DatosPeriodoVacaciones, PeriodoVacaciones } from '../types/vacaciones'
import Toast from '../components/Toast'
import type { DatosToast } from '../components/Toast'
import TablaVacaciones from '../components/vacaciones/TablaVacaciones'
import type { FilaVacaciones } from '../components/vacaciones/TablaVacaciones'
import ModalVacaciones from '../components/vacaciones/ModalVacaciones'
import DetalleVacaciones from '../components/vacaciones/DetalleVacaciones'

export default function Vacaciones() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { esEditor } = useRol()
  const { sesion } = useAuth()

  const [seleccionId, setSeleccionId] = useState<string | null>(null)
  const [anioDetalle, setAnioDetalle] = useState<number | null>(null)
  const [modal, setModal] = useState<{ empleadoInicial: Empleado | null } | null>(null)
  const [toast, setToast] = useState<DatosToast | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  const avisar = (datos: DatosToast) => {
    if (temporizador.current) clearTimeout(temporizador.current)
    setToast(datos)
    temporizador.current = setTimeout(() => setToast(null), 4000)
  }

  const empleados = useEmpleados()
  const periodos = usePeriodosVacaciones()

  const lista = useMemo(() => empleados.data ?? [], [empleados.data])
  const listaPeriodos = useMemo(() => periodos.data ?? [], [periodos.data])

  // "Hoy" controla la causación (sin cron: la fecha real). Referencia estable.
  const hoy = useMemo(() => {
    const ahora = new Date()
    return { anio: ahora.getFullYear(), mes: ahora.getMonth() + 1, dia: ahora.getDate() }
  }, [])

  // Períodos indexados por empleado.
  const periodosPorEmpleado = useMemo(() => {
    const m = new Map<string, PeriodoVacaciones[]>()
    for (const p of listaPeriodos) {
      const arr = m.get(p.empleado_id)
      if (arr) arr.push(p)
      else m.set(p.empleado_id, [p])
    }
    return m
  }, [listaPeriodos])

  // Resumen por empleado.
  const resumenPorEmpleado = useMemo(() => {
    const m = new Map<string, ResumenVacaciones>()
    for (const e of lista) {
      m.set(e.id, resumenVacaciones(e, periodosPorEmpleado.get(e.id) ?? [], hoy))
    }
    return m
  }, [lista, periodosPorEmpleado, hoy])

  const filasCausan: FilaVacaciones[] = useMemo(
    () =>
      lista
        .filter((e) => causaAplica(e.tipo_contrato))
        .map((empleado) => ({ empleado, resumen: resumenPorEmpleado.get(empleado.id)! })),
    [lista, resumenPorEmpleado]
  )
  const noAplican = useMemo(() => lista.filter((e) => !causaAplica(e.tipo_contrato)), [lista])

  // Empleados elegibles para registrar (causan vacaciones).
  const elegibles = useMemo(() => filasCausan.map((f) => f.empleado), [filasCausan])

  const seleccionado = seleccionId ? lista.find((e) => e.id === seleccionId) ?? null : null

  // ── Mutaciones ───────────────────────────────────────────────
  const guardarPeriodo = useMutation({
    mutationFn: async (datos: DatosPeriodoVacaciones) => {
      const { error } = await supabase.from('vacaciones_periodos').insert({
        empleado_id: datos.empleado_id,
        fecha_inicio: datos.fecha_inicio,
        fecha_fin: datos.fecha_fin,
        dias_habiles: datos.dias_habiles,
        nota: datos.nota,
        creado_por: sesion?.user.id ?? null,
      })
      if (error) throw new Error(error.message)
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: t.vacaciones.errorGuardar(e.message) }),
    onSuccess: () => {
      avisar({ tipo: 'exito', mensaje: t.vacaciones.guardado })
      setModal(null)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['vacaciones_periodos'] }),
  })

  const eliminarPeriodo = useMutation({
    mutationFn: async (periodoId: string) => {
      const { error } = await supabase.from('vacaciones_periodos').delete().eq('id', periodoId)
      if (error) throw new Error(error.message)
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: t.vacaciones.errorEliminar(e.message) }),
    onSuccess: () => avisar({ tipo: 'exito', mensaje: t.vacaciones.eliminado }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['vacaciones_periodos'] }),
  })

  const pedirEliminar = (periodoId: string) => {
    if (window.confirm(t.vacaciones.confirmarEliminar)) eliminarPeriodo.mutate(periodoId)
  }

  const cargando = empleados.isLoading || periodos.isLoading
  const error = empleados.error ?? periodos.error

  // ── Vista detalle de un empleado ──
  if (seleccionado) {
    const anios = aniosVacaciones(seleccionado.fecha_ingreso, hoy.anio)
    const anioSel = anioDetalle != null && anios.includes(anioDetalle) ? anioDetalle : anios[0]
    return (
      <div>
        <DetalleVacaciones
          empleado={seleccionado}
          periodos={periodosPorEmpleado.get(seleccionado.id) ?? []}
          resumen={resumenPorEmpleado.get(seleccionado.id) ?? resumenVacaciones(seleccionado, [], hoy)}
          anios={anios}
          anioSel={anioSel}
          hoy={hoy}
          esEditor={esEditor}
          onCambiarAnio={setAnioDetalle}
          onVolver={() => setSeleccionId(null)}
          onRegistrar={() => setModal({ empleadoInicial: seleccionado })}
          onEliminar={pedirEliminar}
        />
        {modal && (
          <ModalVacaciones
            empleados={elegibles}
            empleadoInicial={modal.empleadoInicial}
            guardando={guardarPeriodo.isPending}
            onConfirmar={(datos) => guardarPeriodo.mutate(datos)}
            onCerrar={() => setModal(null)}
          />
        )}
        <Toast toast={toast} />
      </div>
    )
  }

  // ── Vista lista ──
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">{t.vacaciones.titulo}</h1>
          <p className="mt-1 max-w-2xl text-sm text-tinta-suave">{t.vacaciones.descripcion}</p>
        </div>
        {esEditor && (
          <button
            type="button"
            onClick={() => setModal({ empleadoInicial: null })}
            disabled={elegibles.length === 0}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + {t.vacaciones.registrar}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t.vacaciones.error(error.message)}
        </p>
      )}
      {cargando && <p className="mt-6 text-sm text-tinta-suave">{t.vacaciones.cargando}</p>}

      {!cargando && !error && (
        <section className="mt-6">
          {filasCausan.length === 0 && noAplican.length === 0 ? (
            <p className="rounded-xl border border-dashed border-borde bg-white p-6 text-center text-sm text-tinta-suave">
              {t.vacaciones.sinEmpleados}
            </p>
          ) : (
            <>
              <TablaVacaciones filas={filasCausan} noAplican={noAplican} onVerDetalle={(e) => setSeleccionId(e.id)} />
              <p className="mt-2 text-xs text-tinta-suave">{t.vacaciones.notaPie}</p>
            </>
          )}
        </section>
      )}

      {modal && (
        <ModalVacaciones
          empleados={elegibles}
          empleadoInicial={modal.empleadoInicial}
          guardando={guardarPeriodo.isPending}
          onConfirmar={(datos) => guardarPeriodo.mutate(datos)}
          onCerrar={() => setModal(null)}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}
