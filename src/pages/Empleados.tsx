import { useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useTranslation } from '../hooks/useTranslation'
import { useRol } from '../hooks/useRol'
import { useAuth } from '../hooks/useAuth'
import { useEmpleados, useFotosFirmadas } from '../hooks/useEmpleados'
import {
  useEmpleadosNatillera,
  useNovedadesNatillera,
  useSaldosInicialesNatillera,
} from '../hooks/useNatillera'
import { resolverReporteEmpleado } from '../lib/natilleraReporte'
import { saldoInicialDe } from '../lib/natillera'
import { resumenNatillera } from '../lib/empleados'
import type { ResumenNatillera } from '../lib/empleados'
import type { NovedadNatillera } from '../types/natillera'
import type { DatosEmpleado, Empleado } from '../types/empleados'
import Toast from '../components/Toast'
import type { DatosToast } from '../components/Toast'
import ModalEmpleado from '../components/empleados/ModalEmpleado'
import FichaEmpleado from '../components/empleados/FichaEmpleado'
import ListaEmpleados from '../components/empleados/ListaEmpleados'

const BUCKET = 'empleados-fotos'

export default function Empleados() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { esEditorNomina: esEditor } = useRol()
  const { sesion } = useAuth()

  const empleados = useEmpleados()
  const lista = useMemo(() => empleados.data ?? [], [empleados.data])

  const [seleccionId, setSeleccionId] = useState<string | null>(null)
  const [modal, setModal] = useState<{ empleado: Empleado | null } | null>(null)
  const [toast, setToast] = useState<DatosToast | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  const avisar = (datos: DatosToast) => {
    if (temporizador.current) clearTimeout(temporizador.current)
    setToast(datos)
    temporizador.current = setTimeout(() => setToast(null), 4000)
  }

  // Fotos firmadas (bucket privado).
  const fotos = useFotosFirmadas(lista.map((e) => e.foto_url))
  const fotoUrlDe = (e: Empleado) => (e.foto_url ? fotos.data?.get(e.foto_url) ?? null : null)

  // ── Resumen de natillera por persona (vínculo empleado_id) ──
  const natEmps = useEmpleadosNatillera()
  const novedades = useNovedadesNatillera()
  const saldosQuery = useSaldosInicialesNatillera()
  const hoy = useMemo(() => {
    const ahora = new Date()
    return { anio: ahora.getFullYear(), mes: ahora.getMonth() + 1 }
  }, [])

  const resumenPorPersona = useMemo(() => {
    const novPorEmp = new Map<string, NovedadNatillera[]>()
    for (const n of novedades.data ?? []) {
      const arr = novPorEmp.get(n.empleado_id)
      if (arr) arr.push(n)
      else novPorEmp.set(n.empleado_id, [n])
    }
    const saldos = saldosQuery.data ?? new Map<string, number>()
    const m = new Map<string, ResumenNatillera>()
    for (const ne of natEmps.data ?? []) {
      if (!ne.empleado_id) continue
      const rep = resolverReporteEmpleado(
        ne,
        novPorEmp.get(ne.id) ?? [],
        saldoInicialDe(saldos, ne.id, hoy.anio),
        hoy.anio,
        hoy
      )
      const resumen = resumenNatillera(ne, rep)
      if (resumen) m.set(ne.empleado_id, resumen)
    }
    return m
  }, [natEmps.data, novedades.data, saldosQuery.data, hoy])

  const codigosExistentes = useMemo(() => lista.map((e) => e.codigo), [lista])

  const seleccionado = seleccionId ? lista.find((e) => e.id === seleccionId) ?? null : null

  // ── Mutaciones ──
  const guardarEmpleado = useMutation({
    mutationFn: async ({ id, datos }: { id: string | null; datos: DatosEmpleado }) => {
      const fila = {
        ...datos,
        actualizado_en: new Date().toISOString(),
        actualizado_por: sesion?.user.id ?? null,
      }
      if (id) {
        const { error } = await supabase.from('empleados').update(fila).eq('id', id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('empleados').insert(fila)
        if (error) throw new Error(error.message)
      }
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: t.empleados.errorGuardar(e.message) }),
    onSuccess: () => {
      avisar({ tipo: 'exito', mensaje: t.empleados.guardado })
      setModal(null)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['empleados'] }),
  })

  const subirFoto = useMutation({
    mutationFn: async ({ empleado, archivo }: { empleado: Empleado; archivo: File }) => {
      const ext = (archivo.name.split('.').pop() || 'jpg').toLowerCase()
      const ruta = `${empleado.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(ruta, archivo, { upsert: true, contentType: archivo.type })
      if (upErr) throw new Error(upErr.message)
      const { error } = await supabase
        .from('empleados')
        .update({
          foto_url: ruta,
          actualizado_en: new Date().toISOString(),
          actualizado_por: sesion?.user.id ?? null,
        })
        .eq('id', empleado.id)
      if (error) throw new Error(error.message)
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: t.empleados.foto.error(e.message) }),
    onSuccess: () => avisar({ tipo: 'exito', mensaje: t.empleados.foto.actualizada }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] })
      queryClient.invalidateQueries({ queryKey: ['empleados-fotos'] })
    },
  })

  const onSubirFoto = (empleado: Empleado, archivo: File) => {
    if (!archivo.type.startsWith('image/')) {
      avisar({ tipo: 'error', mensaje: t.empleados.foto.noImagen })
      return
    }
    subirFoto.mutate({ empleado, archivo })
  }

  // ── Vista ficha individual ──
  if (seleccionado) {
    return (
      <div>
        <FichaEmpleado
          empleado={seleccionado}
          fotoUrl={fotoUrlDe(seleccionado)}
          natillera={resumenPorPersona.get(seleccionado.id) ?? null}
          esEditor={esEditor}
          subiendoFoto={subirFoto.isPending}
          onEditar={() => setModal({ empleado: seleccionado })}
          onVolver={() => setSeleccionId(null)}
          onSubirFoto={(archivo) => onSubirFoto(seleccionado, archivo)}
        />
        {modal && (
          <ModalEmpleado
            empleado={modal.empleado}
            codigosExistentes={codigosExistentes}
            guardando={guardarEmpleado.isPending}
            onGuardar={(datos) => guardarEmpleado.mutate({ id: modal.empleado?.id ?? null, datos })}
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
      {empleados.error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t.empleados.error(empleados.error.message)}
        </p>
      )}

      {!empleados.isLoading && !empleados.error && lista.length === 0 ? (
        <>
          <div>
            <h1 className="text-2xl font-bold text-brand-900">{t.empleados.titulo}</h1>
            <p className="mt-1 max-w-2xl text-sm text-tinta-suave">{t.empleados.descripcion}</p>
          </div>
          <p className="mt-6 rounded-xl border border-dashed border-borde bg-white p-6 text-center text-sm text-tinta-suave">
            {t.empleados.sinEmpleados}
          </p>
        </>
      ) : (
        <ListaEmpleados
          empleados={lista}
          fotoUrlDe={fotoUrlDe}
          esEditor={esEditor}
          cargando={empleados.isLoading}
          onAgregar={() => setModal({ empleado: null })}
          onAbrir={(id) => setSeleccionId(id)}
        />
      )}

      {modal && (
        <ModalEmpleado
          empleado={modal.empleado}
          codigosExistentes={codigosExistentes}
          guardando={guardarEmpleado.isPending}
          onGuardar={(datos) => guardarEmpleado.mutate({ id: modal.empleado?.id ?? null, datos })}
          onCerrar={() => setModal(null)}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}
