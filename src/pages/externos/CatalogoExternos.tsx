import { useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTranslation } from '../../hooks/useTranslation'
import { useRol } from '../../hooks/useRol'
import { useExternos } from '../../hooks/useExternos'
import { useEmpleadosNatillera } from '../../hooks/useNatillera'
import { filtrarExternos, opcionesNatillera } from '../../lib/externos'
import { nombreMostrado } from '../../lib/natillera'
import type { DatosExterno, Externo } from '../../types/externos'
import Toast from '../../components/Toast'
import type { DatosToast } from '../../components/Toast'
import ModalExterno from '../../components/externos/ModalExterno'
import { IconoBuscar, IconoLapiz } from '../../components/empleados/iconos'

/** Pestaña Catálogo: CRUD del catálogo de externos. */
export default function CatalogoExternos() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { esEditorNomina: esEditor } = useRol()

  const externosQuery = useExternos()
  const natEmpsQuery = useEmpleadosNatillera()

  const lista = useMemo(() => externosQuery.data ?? [], [externosQuery.data])
  const opcionesNat = useMemo(
    () => opcionesNatillera(natEmpsQuery.data ?? []),
    [natEmpsQuery.data]
  )
  const nombreNatPorId = useMemo(() => {
    const m = new Map<string, string>()
    for (const n of natEmpsQuery.data ?? []) m.set(n.id, nombreMostrado(n))
    return m
  }, [natEmpsQuery.data])

  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState<{ externo: Externo | null } | null>(null)
  const [toast, setToast] = useState<DatosToast | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  const avisar = (datos: DatosToast) => {
    if (temporizador.current) clearTimeout(temporizador.current)
    setToast(datos)
    temporizador.current = setTimeout(() => setToast(null), 4000)
  }

  const filtrados = useMemo(() => filtrarExternos(lista, busqueda), [lista, busqueda])
  const codigosExistentes = useMemo(() => lista.map((e) => e.codigo), [lista])

  const guardar = useMutation({
    mutationFn: async ({ id, datos }: { id: string | null; datos: DatosExterno }) => {
      if (id) {
        const { error } = await supabase.from('externos').update(datos).eq('id', id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('externos').insert(datos)
        if (error) throw new Error(error.message)
      }
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: t.externos.errorGuardar(e.message) }),
    onSuccess: () => {
      avisar({ tipo: 'exito', mensaje: t.externos.guardado })
      setModal(null)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['externos'] }),
  })

  const alternarActivo = useMutation({
    mutationFn: async (externo: Externo) => {
      const { error } = await supabase
        .from('externos')
        .update({ activo: !externo.activo })
        .eq('id', externo.id)
      if (error) throw new Error(error.message)
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: t.externos.errorGuardar(e.message) }),
    onSuccess: () => avisar({ tipo: 'exito', mensaje: t.externos.guardado }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['externos'] }),
  })

  const cargando = externosQuery.isLoading || natEmpsQuery.isLoading

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-brand-900">{t.externos.tabs.catalogo}</h2>
        {esEditor && (
          <button
            type="button"
            onClick={() => setModal({ externo: null })}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900"
          >
            + {t.externos.agregar}
          </button>
        )}
      </div>

      {externosQuery.error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t.externos.error(externosQuery.error.message)}
        </p>
      )}

      {cargando && <p className="mt-4 text-sm text-tinta-suave">{t.externos.cargando}</p>}

      {!cargando && !externosQuery.error && (
        <>
          {lista.length > 0 && (
            <div className="relative mt-4 max-w-sm">
              <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-suave">
                <IconoBuscar size={16} />
              </span>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={t.externos.buscarPlaceholder}
                className="block w-full rounded-lg border border-borde bg-white py-2 pl-9 pr-3 text-sm text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
              />
            </div>
          )}

          {lista.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-borde bg-white p-6 text-center text-sm text-tinta-suave">
              {t.externos.sinExternos}
            </p>
          ) : filtrados.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-borde bg-white p-6 text-center text-sm text-tinta-suave">
              {t.externos.sinResultados}
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-borde bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-borde text-left text-xs font-semibold uppercase tracking-wide text-tinta-suave">
                    <th className="px-4 py-3">{t.externos.colCodigo}</th>
                    <th className="px-4 py-3">{t.externos.colNombre}</th>
                    <th className="px-4 py-3">{t.externos.colCedula}</th>
                    <th className="px-4 py-3">{t.externos.colNatillera}</th>
                    <th className="px-4 py-3">{t.externos.colEstado}</th>
                    {esEditor && <th className="px-4 py-3 text-right">{t.externos.colAcciones}</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((e) => (
                    <tr key={e.id} className="border-b border-borde/60 last:border-0 hover:bg-brand-50/50">
                      <td className="px-4 py-3 font-mono text-tinta">{e.codigo}</td>
                      <td className="px-4 py-3 font-medium text-tinta">{e.nombre_completo}</td>
                      <td className="px-4 py-3 text-tinta-suave">{e.cedula || '—'}</td>
                      <td className="px-4 py-3">
                        {e.natillera_empleado_id ? (
                          <span
                            className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700"
                            title={nombreNatPorId.get(e.natillera_empleado_id) ?? ''}
                          >
                            {t.externos.ahorraBadge}
                          </span>
                        ) : (
                          <span className="text-tinta-suave">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {e.activo ? (
                          <span className="inline-flex items-center rounded-full bg-exito/10 px-2.5 py-0.5 text-xs font-semibold text-exito">
                            {t.externos.activo}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-tinta-suave">
                            {t.externos.inactivo}
                          </span>
                        )}
                      </td>
                      {esEditor && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setModal({ externo: e })}
                              className="inline-flex items-center gap-1 rounded-lg border border-borde bg-white px-2.5 py-1.5 text-xs font-semibold text-tinta-suave transition-colors duration-150 hover:border-brand-700 hover:text-brand-700"
                            >
                              <IconoLapiz size={14} />
                              {t.externos.editar}
                            </button>
                            <button
                              type="button"
                              onClick={() => alternarActivo.mutate(e)}
                              disabled={alternarActivo.isPending}
                              className="rounded-lg border border-borde bg-white px-2.5 py-1.5 text-xs font-semibold text-tinta-suave transition-colors duration-150 hover:border-brand-700 hover:text-brand-700 disabled:opacity-50"
                            >
                              {e.activo ? t.externos.desactivar : t.externos.activar}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {modal && (
        <ModalExterno
          externo={modal.externo}
          opcionesNat={opcionesNat}
          codigosExistentes={codigosExistentes}
          guardando={guardar.isPending}
          onGuardar={(datos) => guardar.mutate({ id: modal.externo?.id ?? null, datos })}
          onCerrar={() => setModal(null)}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}
