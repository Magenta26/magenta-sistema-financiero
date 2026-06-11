import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { fechaHora } from '../../lib/formato'
import { nombreMes } from '../../types/balance'
import type { Validacion } from '../../types/balance'

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
  const [descargando, setDescargando] = useState<string | null>(null)
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null)

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
      setErrorDescarga(`No se pudo descargar "${carga.nombre_archivo}": ${error?.message ?? 'sin URL'}`)
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-white">Historial de cargas</h2>

      {isLoading && <p className="mt-3 text-sm text-ciruela-400">Cargando historial…</p>}
      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-red-800 bg-red-950/60 px-3 py-2 text-sm text-red-300">
          No se pudo consultar el historial: {error.message}
        </p>
      )}
      {errorDescarga && (
        <p role="alert" className="mt-3 rounded-lg border border-red-800 bg-red-950/60 px-3 py-2 text-sm text-red-300">
          {errorDescarga}
        </p>
      )}

      {cargas && cargas.length === 0 && (
        <p className="mt-3 rounded-xl border border-dashed border-ciruela-700 bg-ciruela-900/40 p-6 text-center text-sm text-ciruela-400">
          Aún no hay cargas. Sube el primer balance arriba.
        </p>
      )}

      {cargas && cargas.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-ciruela-800">
          <table className="w-full text-sm">
            <thead className="bg-ciruela-900 text-left text-ciruela-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Período</th>
                <th className="px-4 py-2.5 font-medium">Archivo</th>
                <th className="px-4 py-2.5 font-medium">Fecha</th>
                <th className="px-4 py-2.5 font-medium">Usuario</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5 font-medium">Filas</th>
                <th className="px-4 py-2.5 font-medium">Validaciones</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {cargas.map((c) => (
                <tr key={c.id} className="border-t border-ciruela-800/70 bg-ciruela-950/40">
                  <td className="px-4 py-2.5 font-medium text-white">
                    {nombreMes(c.mes)} {c.anio}
                  </td>
                  <td className="max-w-56 truncate px-4 py-2.5 font-mono text-xs text-ciruela-300" title={c.nombre_archivo}>
                    {c.nombre_archivo}
                  </td>
                  <td className="px-4 py-2.5 text-ciruela-300">{fechaHora(c.creada_en)}</td>
                  <td className="px-4 py-2.5 text-ciruela-300">{c.usuario_email ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        c.estado === 'activa'
                          ? 'bg-emerald-900/60 text-emerald-300'
                          : 'bg-ciruela-800 text-ciruela-400'
                      }`}
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-ciruela-300">{c.filas_importadas ?? '—'}</td>
                  <td className="px-4 py-2.5 text-ciruela-300">{resumenValidaciones(c.validaciones)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => descargar(c)}
                      disabled={descargando === c.id}
                      className="rounded-lg border border-ciruela-700 px-2.5 py-1 text-xs text-ciruela-300 transition-colors hover:border-magenta-500 hover:text-magenta-300 disabled:opacity-50"
                    >
                      {descargando === c.id ? 'Generando…' : 'Descargar .xlsx'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
