import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { fechaHora } from '../../lib/formato'
import { nombreMes } from '../../types/balance'
import { mesPorDefecto, mesesConNotas } from '../../lib/notas'
import { useTranslation } from '../../hooks/useTranslation'
import { useRol } from '../../hooks/useRol'
import { useAuth } from '../../hooks/useAuth'
import { usePeriodoActual } from '../../hooks/usePeriodoActual'
import { useNotasAnio } from '../../hooks/useNotas'
import Toast from '../Toast'
import type { DatosToast } from '../Toast'

interface Props {
  anio: number
  /** Meses (1-12) con datos cargados; el selector solo lista estos. */
  mesesConDatos: number[]
}

export default function NotasFinancieras({ anio, mesesConDatos }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { esEditor } = useRol()
  const { sesion } = useAuth()
  const periodoActual = usePeriodoActual()
  const notas = useNotasAnio(anio)

  // Elección explícita del usuario (null = usar el mes por defecto derivado).
  const [mesElegido, setMesElegido] = useState<number | null>(null)
  const [borrador, setBorrador] = useState('')
  const [toast, setToast] = useState<DatosToast | null>(null)
  const temporizadorToast = useRef<ReturnType<typeof setTimeout> | null>(null)

  const avisar = (datos: DatosToast) => {
    if (temporizadorToast.current) clearTimeout(temporizadorToast.current)
    setToast(datos)
    temporizadorToast.current = setTimeout(() => setToast(null), 4000)
  }

  const lista = notas.data ?? []
  const mesesMarcados = mesesConNotas(lista, mesesConDatos)

  // Mes mostrado: la elección del usuario si sigue siendo válida; si no, el
  // mes por defecto (periodo_actual del año, o el último mes con datos).
  const preferido = periodoActual.data?.anio === anio ? periodoActual.data.mes : null
  const mesSel =
    mesElegido != null && mesesConDatos.includes(mesElegido)
      ? mesElegido
      : mesPorDefecto(preferido, mesesConDatos)

  const notaActual = lista.find((n) => n.mes === mesSel) ?? null
  const contenidoGuardado = notaActual?.contenido ?? ''

  // Sincroniza el borrador con lo guardado al cambiar de mes o al refrescarse
  // los datos (patrón de ajuste en render, sin efecto). Mientras se escribe,
  // `contenidoGuardado` no cambia, así que no pisa lo que el usuario teclea;
  // tras guardar, lo guardado ya es igual al borrador (reset inofensivo).
  const [sync, setSync] = useState<string | null>(null)
  const claveSync = `${mesSel}:${contenidoGuardado}`
  if (sync !== claveSync) {
    setSync(claveSync)
    setBorrador(contenidoGuardado)
  }

  const cambiado = borrador !== contenidoGuardado

  const guardar = useMutation({
    mutationFn: async () => {
      if (mesSel == null) return
      const { error } = await supabase.from('notas_financieras').upsert(
        {
          anio,
          mes: mesSel,
          contenido: borrador,
          actualizada_por: sesion?.user.id ?? null,
          actualizada_en: new Date().toISOString(),
        },
        { onConflict: 'anio,mes' }
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      avisar({ tipo: 'exito', mensaje: t.er.notas.guardada })
      queryClient.invalidateQueries({ queryKey: ['notas_financieras', anio] })
    },
    onError: (e) => {
      avisar({ tipo: 'error', mensaje: t.er.notas.errorGuardar(e.message) })
    },
  })

  if (mesesConDatos.length === 0) return null

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-brand-900">{t.er.notas.titulo}</h2>
        {/* Selector de meses con indicador (puntito) de los que tienen notas */}
        <div
          role="group"
          aria-label={t.er.notas.selectorMesAria}
          className="flex flex-wrap gap-1 rounded-lg border border-borde bg-white p-0.5"
        >
          {mesesConDatos.map((mes) => {
            const activo = mes === mesSel
            const tieneNotas = mesesMarcados.has(mes)
            return (
              <button
                key={mes}
                type="button"
                onClick={() => setMesElegido(mes)}
                aria-pressed={activo}
                aria-label={tieneNotas ? t.er.notas.conNotasAria(nombreMes(mes)) : nombreMes(mes)}
                className={`relative rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                  activo ? 'bg-brand-700 text-white' : 'text-tinta-suave hover:text-brand-900'
                }`}
              >
                {nombreMes(mes)}
                {tieneNotas && (
                  <span
                    aria-hidden="true"
                    className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${
                      activo ? 'bg-white' : 'bg-brand-500'
                    }`}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-borde bg-white p-4 shadow-sm">
        {esEditor ? (
          <>
            <textarea
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              placeholder={t.er.notas.placeholder}
              rows={8}
              className="block w-full resize-y rounded-lg border border-borde bg-white px-3 py-2 text-sm leading-relaxed text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-tinta-suave">
                {notaActual?.actualizada_en
                  ? notaActual.actualizada_por_email
                    ? t.er.notas.ultimaActualizacion(
                        fechaHora(notaActual.actualizada_en),
                        notaActual.actualizada_por_email
                      )
                    : t.er.notas.ultimaActualizacionSinEmail(fechaHora(notaActual.actualizada_en))
                  : ''}
              </p>
              <button
                type="button"
                onClick={() => guardar.mutate()}
                disabled={!cambiado || guardar.isPending}
                className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardar.isPending ? t.er.notas.guardando : t.er.notas.guardar}
              </button>
            </div>
          </>
        ) : contenidoGuardado.trim() !== '' ? (
          <>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-tinta">{contenidoGuardado}</p>
            {notaActual?.actualizada_en && (
              <p className="mt-3 text-xs text-tinta-suave">
                {notaActual.actualizada_por_email
                  ? t.er.notas.ultimaActualizacion(
                      fechaHora(notaActual.actualizada_en),
                      notaActual.actualizada_por_email
                    )
                  : t.er.notas.ultimaActualizacionSinEmail(fechaHora(notaActual.actualizada_en))}
              </p>
            )}
          </>
        ) : (
          <p className="py-4 text-center text-sm text-tinta-suave">{t.er.notas.vacio}</p>
        )}
      </div>

      <Toast toast={toast} />
    </section>
  )
}
