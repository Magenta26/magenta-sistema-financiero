import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { fechaHora } from '../../lib/formato'
import { nombreMes } from '../../types/balance'
import type { Validacion } from '../../types/balance'
import { useTranslation } from '../../hooks/useTranslation'
import { useRol } from '../../hooks/useRol'
import Toast from '../Toast'
import type { DatosToast } from '../Toast'

export interface CargaHistorial {
  id: string
  anio: number
  mes: number
  nombre_archivo: string
  storage_path: string
  estado: 'activa' | 'reemplazada'
  filas_importadas: number | null
  validaciones: Validacion[] | null
  creada_en: string
  usuario_email: string | null
}

function resumenValidaciones(validaciones: Validacion[] | null): string {
  if (!validaciones || validaciones.length === 0) return '—'
  const conteo = { bloqueante: 0, advertencia: 0, info: 0 }
  for (const v of validaciones) conteo[v.tipo] += 1
  const partes: string[] = []
  if (conteo.bloqueante) partes.push(`⛔ ${conteo.bloqueante}`)
  if (conteo.advertencia) partes.push(`⚠️ ${conteo.advertencia}`)
  if (conteo.info) partes.push(`ℹ️ ${conteo.info}`)
  return partes.join(' ')
}

export default function HistorialCargas() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { esEditor } = useRol()
  const [descargando, setDescargando] = useState<string | null>(null)
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null)
  const [aEliminar, setAEliminar] = useState<CargaHistorial | null>(null)
  const [toast, setToast] = useState<DatosToast | null>(null)
  const temporizadorToast = useRef<ReturnType<typeof setTimeout> | null>(null)

  const avisar = (datos: DatosToast) => {
    if (temporizadorToast.current) clearTimeout(temporizadorToast.current)
    setToast(datos)
    temporizadorToast.current = setTimeout(() => setToast(null), 4000)
  }

  const { data: cargas, isLoading, error } = useQuery({
    queryKey: ['v_cargas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_cargas')
        .select('*')
        .order('creada_en', { ascending: false })
      if (error) throw new Error(error.message)
      return data as CargaHistorial[]
    },
  })

  const descargar = async (carga: CargaHistorial) => {
    setDescargando(carga.id)
    setErrorDescarga(null)
    const { data, error } = await supabase.storage
      .from('balances')
      .createSignedUrl(carga.storage_path, 60)
    setDescargando(null)
    if (error || !data?.signedUrl) {
      setErrorDescarga(t.cargas.errorDescarga(carga.nombre_archivo, error?.message ?? t.cargas.sinUrl))
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  const eliminar = useMutation({
    mutationFn: async (carga: CargaHistorial) => {
      const { error } = await supabase.rpc('eliminar_carga', { p_carga_id: carga.id })
      if (error) throw new Error(error.message)
    },
    onSuccess: (_datos, carga) => {
      setAEliminar(null)
      avisar({ tipo: 'exito', mensaje: t.cargas.eliminar.exito(`${nombreMes(carga.mes)} ${carga.anio}`) })
      // El borrado afecta movimientos, catálogo, periodo_actual y todas las vistas
      // (ER, BG, Análisis): refrescamos todo lo activo.
      queryClient.invalidateQueries()
    },
    onError: (e) => {
      avisar({ tipo: 'error', mensaje: t.cargas.eliminar.error(e.message) })
    },
  })

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-brand-900">{t.cargas.historial}</h2>

      {isLoading && <p className="mt-3 text-sm text-tinta-suave">{t.cargas.cargandoHistorial}</p>}
      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t.cargas.errorHistorial(error.message)}
        </p>
      )}
      {errorDescarga && (
        <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorDescarga}
        </p>
      )}

      {cargas && cargas.length === 0 && (
        <p className="mt-3 rounded-xl border border-dashed border-borde bg-white p-6 text-center text-sm text-tinta-suave">
          {t.cargas.sinCargas}
        </p>
      )}

      {cargas && cargas.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-borde bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 text-left text-brand-900">
              <tr>
                <th className="px-4 py-2.5 font-semibold">{t.cargas.encabezados.periodo}</th>
                <th className="px-4 py-2.5 font-semibold">{t.cargas.encabezados.archivo}</th>
                <th className="px-4 py-2.5 font-semibold">{t.cargas.encabezados.fecha}</th>
                <th className="px-4 py-2.5 font-semibold">{t.cargas.encabezados.usuario}</th>
                <th className="px-4 py-2.5 font-semibold">{t.cargas.encabezados.estado}</th>
                <th className="px-4 py-2.5 font-semibold">{t.cargas.encabezados.filas}</th>
                <th className="px-4 py-2.5 font-semibold">{t.cargas.encabezados.validaciones}</th>
                <th className="px-4 py-2.5 text-right font-semibold">
                  {esEditor ? t.cargas.encabezados.acciones : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {cargas.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-borde transition-colors duration-150 even:bg-gray-50/60 hover:bg-brand-50"
                >
                  <td className="px-4 py-2.5 font-medium text-brand-900">
                    {nombreMes(c.mes)} {c.anio}
                  </td>
                  <td className="max-w-56 truncate px-4 py-2.5 font-mono text-xs text-tinta-suave" title={c.nombre_archivo}>
                    {c.nombre_archivo}
                  </td>
                  <td className="px-4 py-2.5 text-tinta-suave">{fechaHora(c.creada_en)}</td>
                  <td className="px-4 py-2.5 text-tinta-suave">{c.usuario_email ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        c.estado === 'activa'
                          ? 'bg-green-100 text-exito'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {t.cargas.estados[c.estado] ?? c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-tinta">{c.filas_importadas ?? '—'}</td>
                  <td className="px-4 py-2.5 text-tinta-suave">{resumenValidaciones(c.validaciones)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => descargar(c)}
                        disabled={descargando === c.id}
                        className="rounded-lg border border-borde bg-white px-2.5 py-1 text-xs text-tinta-suave transition-colors duration-150 hover:border-brand-700 hover:text-brand-700 disabled:opacity-50"
                      >
                        {descargando === c.id ? t.cargas.generando : t.cargas.descargar}
                      </button>
                      {esEditor && (
                        <button
                          type="button"
                          onClick={() => setAEliminar(c)}
                          aria-label={t.cargas.eliminar.aria(`${nombreMes(c.mes)} ${c.anio}`)}
                          title={t.cargas.eliminar.aria(`${nombreMes(c.mes)} ${c.anio}`)}
                          className="rounded-lg border border-borde bg-white p-1.5 text-tinta-suave transition-colors duration-150 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                            aria-hidden="true"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {aEliminar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-eliminar-carga"
          onClick={() => {
            if (!eliminar.isPending) setAEliminar(null)
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-borde bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="titulo-eliminar-carga" className="text-lg font-semibold text-brand-900">
              {t.cargas.eliminar.titulo}
            </h3>
            <p className="mt-3 text-sm text-tinta-suave">
              {aEliminar.estado === 'reemplazada'
                ? t.cargas.eliminar.cuerpoReemplazada(`${nombreMes(aEliminar.mes)} ${aEliminar.anio}`)
                : t.cargas.eliminar.cuerpoActiva(`${nombreMes(aEliminar.mes)} ${aEliminar.anio}`)}
            </p>

            {eliminar.isError && (
              <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {t.cargas.eliminar.error(eliminar.error.message)}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAEliminar(null)}
                disabled={eliminar.isPending}
                className="text-sm text-tinta-suave underline-offset-2 transition-colors duration-150 hover:text-brand-700 hover:underline disabled:opacity-50"
              >
                {t.comun.cancelar}
              </button>
              <button
                type="button"
                onClick={() => eliminar.mutate(aEliminar)}
                disabled={eliminar.isPending}
                className="rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white transition-colors duration-150 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {eliminar.isPending ? t.cargas.eliminar.eliminando : t.cargas.eliminar.confirmar}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </section>
  )
}
