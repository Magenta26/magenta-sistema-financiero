import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { fechaHora } from '../../lib/formato'
import { nombreMes } from '../../types/balance'
import { estadoNotasPorMes, mesPorDefecto } from '../../lib/notas'
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

/** Editor de una versión (un idioma) de la nota: textarea + botón guardar. */
function EditorIdioma({
  texto,
  guardado,
  onTexto,
  onGuardar,
  guardando,
  placeholder,
  guardarLabel,
  guardandoLabel,
  meta,
}: {
  texto: string
  guardado: string
  onTexto: (v: string) => void
  onGuardar: () => void
  guardando: boolean
  placeholder: string
  guardarLabel: string
  guardandoLabel: string
  meta?: string
}) {
  const cambiado = texto !== guardado
  return (
    <>
      <textarea
        value={texto}
        onChange={(e) => onTexto(e.target.value)}
        placeholder={placeholder}
        rows={8}
        className="block w-full resize-y rounded-lg border border-borde bg-white px-3 py-2 text-sm leading-relaxed text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-tinta-suave">{meta}</p>
        <button
          type="button"
          onClick={onGuardar}
          disabled={!cambiado || guardando}
          className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? guardandoLabel : guardarLabel}
        </button>
      </div>
    </>
  )
}

export default function NotasFinancieras({ anio, mesesConDatos }: Props) {
  const { t, idioma } = useTranslation()
  const queryClient = useQueryClient()
  const { esEditor } = useRol()
  const { sesion } = useAuth()
  const periodoActual = usePeriodoActual()
  const notas = useNotasAnio(anio)

  // Elección explícita del usuario (null = usar el mes por defecto derivado).
  const [mesElegido, setMesElegido] = useState<number | null>(null)
  const [borradorEs, setBorradorEs] = useState('')
  const [borradorEn, setBorradorEn] = useState('')
  const [mostrarOtra, setMostrarOtra] = useState(false)
  const [toast, setToast] = useState<DatosToast | null>(null)
  const temporizadorToast = useRef<ReturnType<typeof setTimeout> | null>(null)

  const avisar = (datos: DatosToast) => {
    if (temporizadorToast.current) clearTimeout(temporizadorToast.current)
    setToast(datos)
    temporizadorToast.current = setTimeout(() => setToast(null), 4000)
  }

  const lista = notas.data ?? []
  const mesesEstado = estadoNotasPorMes(lista, mesesConDatos)

  // Mes mostrado: la elección del usuario si sigue siendo válida; si no, el
  // mes por defecto (periodo_actual del año, o el último mes con datos).
  const preferido = periodoActual.data?.anio === anio ? periodoActual.data.mes : null
  const mesSel =
    mesElegido != null && mesesConDatos.includes(mesElegido)
      ? mesElegido
      : mesPorDefecto(preferido, mesesConDatos)

  const notaActual = lista.find((n) => n.mes === mesSel) ?? null
  const guardadoEs = notaActual?.contenido ?? ''
  const guardadoEn = notaActual?.contenido_en ?? ''

  // Sincroniza ambos borradores con lo guardado al cambiar de mes o al
  // refrescarse los datos (ajuste en render, sin efecto). Mientras se escribe
  // lo guardado no cambia, así que no pisa lo tecleado; tras guardar, lo
  // guardado ya es igual al borrador (reset inofensivo).
  const [sync, setSync] = useState<string | null>(null)
  const claveSync = `${mesSel}:${guardadoEs}:${guardadoEn}`
  if (sync !== claveSync) {
    setSync(claveSync)
    setBorradorEs(guardadoEs)
    setBorradorEn(guardadoEn)
  }

  const guardar = useMutation({
    mutationFn: async (lang: 'es' | 'en') => {
      if (mesSel == null) return
      const fila: Record<string, unknown> = {
        anio,
        mes: mesSel,
        actualizada_por: sesion?.user.id ?? null,
        actualizada_en: new Date().toISOString(),
      }
      // Solo se envía la columna del idioma guardado: el upsert no toca la otra.
      fila[lang === 'en' ? 'contenido_en' : 'contenido'] = lang === 'en' ? borradorEn : borradorEs
      const { error } = await supabase
        .from('notas_financieras')
        .upsert(fila, { onConflict: 'anio,mes' })
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

  // Idioma activo de la app define qué versión se edita/muestra.
  const enActivo = idioma === 'en'
  const langActiva: 'es' | 'en' = enActivo ? 'en' : 'es'
  const langOtra: 'es' | 'en' = enActivo ? 'es' : 'en'
  const guardadoActivo = enActivo ? guardadoEn : guardadoEs
  const guardadoOtra = enActivo ? guardadoEs : guardadoEn
  const otraEscrita = guardadoOtra.trim() !== ''
  const etiquetaOtra = enActivo ? t.er.notas.versionEs : t.er.notas.versionEn

  const meta = notaActual?.actualizada_en
    ? notaActual.actualizada_por_email
      ? t.er.notas.ultimaActualizacion(
          fechaHora(notaActual.actualizada_en),
          notaActual.actualizada_por_email
        )
      : t.er.notas.ultimaActualizacionSinEmail(fechaHora(notaActual.actualizada_en))
    : undefined

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-brand-900">{t.er.notas.titulo}</h2>
        {/* Selector de meses: puntito lleno = ambas versiones; medio = solo una */}
        <div
          role="group"
          aria-label={t.er.notas.selectorMesAria}
          className="flex flex-wrap gap-1 rounded-lg border border-borde bg-white p-0.5"
        >
          {mesesConDatos.map((mes) => {
            const activo = mes === mesSel
            const estado = mesesEstado.get(mes)
            return (
              <button
                key={mes}
                type="button"
                onClick={() => setMesElegido(mes)}
                aria-pressed={activo}
                aria-label={estado ? t.er.notas.conNotasAria(nombreMes(mes)) : nombreMes(mes)}
                className={`relative rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                  activo ? 'bg-brand-700 text-white' : 'text-tinta-suave hover:text-brand-900'
                }`}
              >
                {nombreMes(mes)}
                {estado && (
                  <span
                    aria-hidden="true"
                    className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${
                      activo ? 'bg-white' : 'bg-brand-500'
                    } ${estado === 'una' ? 'opacity-40' : ''}`}
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
            <EditorIdioma
              texto={enActivo ? borradorEn : borradorEs}
              guardado={guardadoActivo}
              onTexto={enActivo ? setBorradorEn : setBorradorEs}
              onGuardar={() => guardar.mutate(langActiva)}
              guardando={guardar.isPending && guardar.variables === langActiva}
              placeholder={t.er.notas.placeholder}
              guardarLabel={t.er.notas.guardar}
              guardandoLabel={t.er.notas.guardando}
              meta={meta}
            />

            {/* Estado de la otra versión + acceso a editarla sin cambiar idioma */}
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-borde pt-3">
              <span className="text-xs text-tinta-suave">
                {etiquetaOtra}{' '}
                <span className={otraEscrita ? 'font-semibold text-exito' : 'text-tinta-suave'}>
                  {otraEscrita ? t.er.notas.estadoEscrita : t.er.notas.estadoPendiente}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setMostrarOtra((v) => !v)}
                className="text-xs font-medium text-brand-700 underline-offset-2 transition-colors duration-150 hover:underline"
              >
                {mostrarOtra ? t.er.notas.ocultarOtra : t.er.notas.verOtra}
              </button>
            </div>

            {mostrarOtra && (
              <div className="mt-3 rounded-lg border border-dashed border-borde bg-brand-50/40 p-3">
                <p className="mb-2 text-xs font-semibold text-brand-700">{etiquetaOtra}</p>
                <EditorIdioma
                  texto={enActivo ? borradorEs : borradorEn}
                  guardado={guardadoOtra}
                  onTexto={enActivo ? setBorradorEs : setBorradorEn}
                  onGuardar={() => guardar.mutate(langOtra)}
                  guardando={guardar.isPending && guardar.variables === langOtra}
                  placeholder={t.er.notas.placeholder}
                  guardarLabel={t.er.notas.guardar}
                  guardandoLabel={t.er.notas.guardando}
                />
              </div>
            )}
          </>
        ) : guardadoActivo.trim() !== '' ? (
          <>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-tinta">{guardadoActivo}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {meta && <p className="text-xs text-tinta-suave">{meta}</p>}
              <span className="text-xs text-tinta-suave">
                {etiquetaOtra}{' '}
                <span className={otraEscrita ? 'font-semibold text-exito' : 'text-tinta-suave'}>
                  {otraEscrita ? t.er.notas.estadoEscrita : t.er.notas.estadoPendiente}
                </span>
              </span>
            </div>
          </>
        ) : (
          <p className="py-4 text-center text-sm text-tinta-suave">{t.er.notas.vacio}</p>
        )}
      </div>

      <Toast toast={toast} />
    </section>
  )
}
