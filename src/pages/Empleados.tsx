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
import Avatar from '../components/empleados/Avatar'
import ModalEmpleado from '../components/empleados/ModalEmpleado'
import FichaEmpleado from '../components/empleados/FichaEmpleado'

const BUCKET = 'empleados-fotos'

export default function Empleados() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { esEditorNomina: esEditor } = useRol()
  const { sesion } = useAuth()

  const empleados = useEmpleados()
  const lista = useMemo(() => empleados.data ?? [], [empleados.data])

  const [busqueda, setBusqueda] = useState('')
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

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (q === '') return lista
    return lista.filter((e) => e.nombre_completo.toLowerCase().includes(q))
  }, [lista, busqueda])

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">{t.empleados.titulo}</h1>
          <p className="mt-1 max-w-2xl text-sm text-tinta-suave">{t.empleados.descripcion}</p>
        </div>
        {esEditor && (
          <button
            type="button"
            onClick={() => setModal({ empleado: null })}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900"
          >
            + {t.empleados.agregar}
          </button>
        )}
      </div>

      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder={t.empleados.buscar}
        className="mt-5 block w-full max-w-sm rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
      />

      {empleados.error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t.empleados.error(empleados.error.message)}
        </p>
      )}
      {empleados.isLoading && <p className="mt-6 text-sm text-tinta-suave">{t.empleados.cargando}</p>}

      {!empleados.isLoading && !empleados.error && lista.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-borde bg-white p-6 text-center text-sm text-tinta-suave">
          {t.empleados.sinEmpleados}
        </p>
      )}

      {filtrados.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setSeleccionId(e.id)}
              className="flex items-center gap-3 rounded-xl border border-borde bg-white p-4 text-left shadow-sm transition-colors duration-150 hover:border-brand-700 hover:bg-brand-50"
            >
              <Avatar nombre={e.nombre_completo} fotoUrl={fotoUrlDe(e)} tamano={48} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-brand-900">{e.nombre_completo}</p>
                <p className="truncate text-xs text-tinta-suave">
                  <span className="font-mono">{e.codigo}</span>
                  {e.equipo ? ` · ${e.equipo}` : ''}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  e.activo ? 'bg-green-100 text-exito' : 'bg-gray-100 text-tinta-suave'
                }`}
              >
                {e.activo ? t.empleados.activo : t.empleados.inactivo}
              </span>
            </button>
          ))}
        </div>
      )}

      {!empleados.isLoading && lista.length > 0 && filtrados.length === 0 && (
        <p className="mt-6 text-sm text-tinta-suave">{t.empleados.sinResultados}</p>
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
