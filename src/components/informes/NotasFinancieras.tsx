import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { fechaHora } from '../../lib/formato'
import { nombreMes } from '../../types/balance'
import { estadoNotasPorMes, mesPorDefecto } from '../../lib/notas'
import type { Nota } from '../../lib/notas'
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

// Cabeceras FIJAS de las dos cajas: no cambian con el idioma de la app, porque
// el objetivo es ver y editar ambas versiones a la vez.
const ENCABEZADO_ES = 'Notas financieras (Español)'
const ENCABEZADO_EN = 'Financial Notes (English)'
const PLACEHOLDER_ES = 'Escribe aquí las notas y el análisis del mes…'
const PLACEHOLDER_EN = "Write the month's notes and analysis here…"

/** Caja de una versión (ES o EN): editable o de solo lectura. */
function CajaNota({
  encabezado,
  valor,
  placeholder,
  editable,
  vacioTexto,
  onCambio,
}: {
  encabezado: string
  valor: string
  placeholder: string
  editable: boolean
  vacioTexto: string
  onCambio: (v: string) => void
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-brand-700">{encabezado}</p>
      {editable ? (
        <textarea
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          placeholder={placeholder}
          rows={8}
          className="block w-full resize-y rounded-lg border border-borde bg-white px-3 py-2 text-sm leading-relaxed text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
        />
      ) : valor.trim() !== '' ? (
        <p className="min-h-24 whitespace-pre-wrap rounded-lg border border-borde bg-gray-50/60 px-3 py-2 text-sm leading-relaxed text-tinta">
          {valor}
        </p>
      ) : (
        <p className="min-h-24 rounded-lg border border-dashed border-borde bg-gray-50/40 px-3 py-6 text-center text-sm text-tinta-suave">
          {vacioTexto}
        </p>
      )}
    </div>
  )
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
  const [borradorEs, setBorradorEs] = useState('')
  const [borradorEn, setBorradorEn] = useState('')
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
  // Anti-null: aunque `Nota` ya garantiza string, reforzamos con ?? ''.
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

  const cambiado = borradorEs !== guardadoEs || borradorEn !== guardadoEn

  const guardar = useMutation({
    mutationFn: async () => {
      if (mesSel == null) return
      const { error } = await supabase.from('notas_financieras').upsert(
        {
          anio,
          mes: mesSel,
          contenido: borradorEs,
          contenido_en: borradorEn,
          actualizada_por: sesion?.user.id ?? null,
          actualizada_en: new Date().toISOString(),
        },
        { onConflict: 'anio,mes' }
      )
      if (error) throw new Error(error.message)
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notas_financieras', anio] })
      const previo = queryClient.getQueryData<Nota[]>(['notas_financieras', anio])
      queryClient.setQueryData<Nota[]>(['notas_financieras', anio], (actual) => {
        const copia = actual ? [...actual] : []
        const i = copia.findIndex((n) => n.mes === mesSel)
        const base: Nota = i >= 0
          ? copia[i]
          : {
              anio,
              mes: mesSel as number,
              contenido: '',
              contenido_en: '',
              actualizada_en: null,
              actualizada_por: null,
              actualizada_por_email: null,
            }
        const actualizado: Nota = { ...base, contenido: borradorEs, contenido_en: borradorEn }
        if (i >= 0) copia[i] = actualizado
        else copia.push(actualizado)
        return copia
      })
      return { previo }
    },
    onError: (e, _v, contexto) => {
      if (contexto?.previo) queryClient.setQueryData(['notas_financieras', anio], contexto.previo)
      avisar({ tipo: 'error', mensaje: t.er.notas.errorGuardar(e.message) })
    },
    onSuccess: () => avisar({ tipo: 'exito', mensaje: t.er.notas.guardada }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notas_financieras', anio] }),
  })

  if (mesesConDatos.length === 0) return null

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
        {/* Dos cajas lado a lado (se apilan en pantallas angostas) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CajaNota
            encabezado={ENCABEZADO_ES}
            valor={borradorEs}
            placeholder={PLACEHOLDER_ES}
            editable={esEditor}
            vacioTexto={t.er.notas.vacio}
            onCambio={setBorradorEs}
          />
          <CajaNota
            encabezado={ENCABEZADO_EN}
            valor={borradorEn}
            placeholder={PLACEHOLDER_EN}
            editable={esEditor}
            vacioTexto={t.er.notas.vacio}
            onCambio={setBorradorEn}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-tinta-suave">{meta}</p>
          {esEditor && (
            <button
              type="button"
              onClick={() => guardar.mutate()}
              disabled={!cambiado || guardar.isPending}
              className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardar.isPending ? t.er.notas.guardando : t.er.notas.guardar}
            </button>
          )}
        </div>
      </div>

      <Toast toast={toast} />
    </section>
  )
}
