import { useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTranslation } from '../../hooks/useTranslation'
import { useRol } from '../../hooks/useRol'
import { useAuth } from '../../hooks/useAuth'
import {
  useExternos,
  useRegistrosExternos,
  useTarifasExternos,
} from '../../hooks/useExternos'
import {
  fechaEnQuincena,
  quincenaActual,
  TARIFAS_DEFECTO,
  totalesProduccion,
} from '../../lib/externos'
import { fecha as fechaFmt, moneda } from '../../lib/formato'
import { nombreMes } from '../../types/balance'
import type { DatosRegistro, RegistroExterno } from '../../types/externos'
import Toast from '../../components/Toast'
import type { DatosToast } from '../../components/Toast'
import SelectorQuincena from '../../components/externos/SelectorQuincena'
import type { PeriodoQuincena } from '../../components/externos/SelectorQuincena'
import ModalRegistro from '../../components/externos/ModalRegistro'
import { IconoLapiz } from '../../components/empleados/iconos'

const dos = (n: number) => String(n).padStart(2, '0')
const aEntero = (texto: string): number => {
  const n = parseInt(texto.replace(/[^0-9]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}
const aNumero = (texto: string): number => {
  const n = Number(texto.replace(',', '.').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** Pestaña A: captura/registro de producción diaria + lista editable. */
export default function RegistroExternos() {
  const { t } = useTranslation()
  const r = t.externos.registro
  const queryClient = useQueryClient()
  const { esEditorExternos: esEditor } = useRol()
  const { sesion } = useAuth()

  const externosQuery = useExternos()
  const registrosQuery = useRegistrosExternos()
  const tarifasQuery = useTarifasExternos()

  const externos = useMemo(() => externosQuery.data ?? [], [externosQuery.data])
  const activos = useMemo(() => externos.filter((e) => e.activo), [externos])
  const registros = useMemo(() => registrosQuery.data ?? [], [registrosQuery.data])
  const tarifas = tarifasQuery.data ?? TARIFAS_DEFECTO
  const externoPorId = useMemo(() => {
    const m = new Map<string, (typeof externos)[number]>()
    for (const e of externos) m.set(e.id, e)
    return m
  }, [externos])

  // "Hoy" (fecha local) para el default de captura y del selector de quincena.
  const hoy = useMemo(() => {
    const ahora = new Date()
    return { anio: ahora.getFullYear(), mes: ahora.getMonth() + 1, dia: ahora.getDate() }
  }, [])
  const hoyIso = `${hoy.anio}-${dos(hoy.mes)}-${dos(hoy.dia)}`

  // Años seleccionables: año en curso + los que tengan registros.
  const anios = useMemo(() => {
    const set = new Set<number>([hoy.anio])
    for (const reg of registros) set.add(Number(reg.fecha.slice(0, 4)))
    return [...set].sort((a, b) => b - a)
  }, [registros, hoy.anio])

  const [periodo, setPeriodo] = useState<PeriodoQuincena>(() => quincenaActual(hoy))
  const [filtroExterno, setFiltroExterno] = useState('') // '' = todos

  // Formulario de captura ágil (persistente; conserva externo+fecha entre altas).
  const [formExterno, setFormExterno] = useState('')
  const [formFecha, setFormFecha] = useState(hoyIso)
  const [maq, setMaq] = useState('')
  const [hyd, setHyd] = useState('')
  const [horas, setHoras] = useState('')
  const [errorForm, setErrorForm] = useState<'externo' | 'vacio' | null>(null)

  const [editar, setEditar] = useState<RegistroExterno | null>(null)
  const [toast, setToast] = useState<DatosToast | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const avisar = (datos: DatosToast) => {
    if (temporizador.current) clearTimeout(temporizador.current)
    setToast(datos)
    temporizador.current = setTimeout(() => setToast(null), 4000)
  }

  // Subtotal en vivo de lo que se está escribiendo en el formulario.
  const subtotalForm = useMemo(
    () =>
      totalesProduccion(
        [
          {
            id: 'tmp',
            externo_id: formExterno,
            fecha: formFecha,
            maquillada_tallos: aEntero(maq),
            hydratada_tallos: aEntero(hyd),
            horas: aNumero(horas),
          },
        ],
        tarifas
      ),
    [formExterno, formFecha, maq, hyd, horas, tarifas]
  )

  // Registros visibles: de la quincena del selector, filtrados por externo.
  const visibles = useMemo(() => {
    return registros.filter(
      (reg) =>
        fechaEnQuincena(reg.fecha, periodo.anio, periodo.mes, periodo.quincena) &&
        (filtroExterno === '' || reg.externo_id === filtroExterno)
    )
  }, [registros, periodo, filtroExterno])

  // Subtotal bruto $ de lo visible (externo/período seleccionado). SIN deducciones.
  const subtotalVisible = useMemo(() => totalesProduccion(visibles, tarifas), [visibles, tarifas])

  // ── Mutaciones ──
  const crear = useMutation({
    mutationFn: async (datos: DatosRegistro) => {
      const { error } = await supabase.from('externos_registros').insert({
        ...datos,
        registrado_por: sesion?.user.id ?? null,
      })
      if (error) throw new Error(error.message)
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: r.errorGuardar(e.message) }),
    onSuccess: () => {
      avisar({ tipo: 'exito', mensaje: r.guardado })
      // Captura ágil: conserva externo y fecha, limpia las cantidades.
      setMaq('')
      setHyd('')
      setHoras('')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['externos_registros'] }),
  })

  const actualizar = useMutation({
    mutationFn: async ({ id, datos }: { id: string; datos: DatosRegistro }) => {
      const { error } = await supabase
        .from('externos_registros')
        .update({
          fecha: datos.fecha,
          maquillada_tallos: datos.maquillada_tallos,
          hydratada_tallos: datos.hydratada_tallos,
          horas: datos.horas,
        })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: r.errorGuardar(e.message) }),
    onSuccess: () => {
      avisar({ tipo: 'exito', mensaje: r.guardado })
      setEditar(null)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['externos_registros'] }),
  })

  const borrar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('externos_registros').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: r.errorGuardar(e.message) }),
    onSuccess: () => avisar({ tipo: 'exito', mensaje: r.borrado }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['externos_registros'] }),
  })

  const guardarForm = () => {
    if (formExterno === '') return setErrorForm('externo')
    const m = aEntero(maq)
    const h = aEntero(hyd)
    const ho = aNumero(horas)
    if (m === 0 && h === 0 && ho === 0) return setErrorForm('vacio')
    setErrorForm(null)
    crear.mutate({
      externo_id: formExterno,
      fecha: formFecha,
      maquillada_tallos: m,
      hydratada_tallos: h,
      horas: ho,
    })
  }

  const cargando = externosQuery.isLoading || registrosQuery.isLoading
  const inputCls =
    'mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none'

  return (
    <div>
      <h2 className="text-lg font-semibold text-brand-900">{r.titulo}</h2>
      <p className="mt-1 max-w-2xl text-sm text-tinta-suave">{r.descripcion}</p>

      {/* Formulario de captura ágil */}
      {esEditor && (
        <div className="mt-5 rounded-xl border border-borde bg-white p-5">
          <h3 className="text-sm font-semibold text-brand-900">{r.nuevoTitulo}</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-tinta-suave" htmlFor="form-externo">
                {r.externo}
              </label>
              <select
                id="form-externo"
                value={formExterno}
                onChange={(e) => {
                  setFormExterno(e.target.value)
                  if (errorForm === 'externo') setErrorForm(null)
                }}
                className={inputCls}
              >
                <option value="">{r.seleccionaExterno}</option>
                {activos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.codigo} · {e.nombre_completo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-tinta-suave" htmlFor="form-fecha">
                {r.fecha}
              </label>
              <input
                id="form-fecha"
                type="date"
                value={formFecha}
                onChange={(e) => setFormFecha(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-tinta-suave" htmlFor="form-maq">
                {r.maquillada}
              </label>
              <input
                id="form-maq"
                type="text"
                inputMode="numeric"
                value={maq}
                onChange={(e) => {
                  setMaq(e.target.value)
                  if (errorForm === 'vacio') setErrorForm(null)
                }}
                placeholder="0"
                className={`${inputCls} text-right tabular-nums`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-tinta-suave" htmlFor="form-hyd">
                {r.hydratada}
              </label>
              <input
                id="form-hyd"
                type="text"
                inputMode="numeric"
                value={hyd}
                onChange={(e) => {
                  setHyd(e.target.value)
                  if (errorForm === 'vacio') setErrorForm(null)
                }}
                placeholder="0"
                className={`${inputCls} text-right tabular-nums`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-tinta-suave" htmlFor="form-horas">
                {r.horas}
              </label>
              <input
                id="form-horas"
                type="text"
                inputMode="decimal"
                value={horas}
                onChange={(e) => {
                  setHoras(e.target.value)
                  if (errorForm === 'vacio') setErrorForm(null)
                }}
                placeholder="0"
                className={`${inputCls} text-right tabular-nums`}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-tinta-suave">
              {r.subtotalForm}{' '}
              <span className="font-semibold tabular-nums text-brand-700">
                {moneda(subtotalForm.bruto, { decimales: 0 })}
              </span>
            </p>
            <div className="flex items-center gap-3">
              {errorForm === 'externo' && <span className="text-xs text-red-600">{r.errorExterno}</span>}
              {errorForm === 'vacio' && <span className="text-xs text-red-600">{r.errorVacio}</span>}
              <button
                type="button"
                onClick={guardarForm}
                disabled={crear.isPending}
                className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {crear.isPending ? r.guardando : r.guardar}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros + lista */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <SelectorQuincena anios={anios} periodo={periodo} onCambiar={setPeriodo} />
        <div>
          <label className="block text-xs font-semibold text-tinta-suave" htmlFor="filtro-externo">
            {r.filtroExterno}
          </label>
          <select
            id="filtro-externo"
            value={filtroExterno}
            onChange={(e) => setFiltroExterno(e.target.value)}
            className={inputCls}
          >
            <option value="">{r.todos}</option>
            {externos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.codigo} · {e.nombre_completo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(externosQuery.error || registrosQuery.error) && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t.externos.error((externosQuery.error ?? registrosQuery.error)!.message)}
        </p>
      )}
      {cargando && <p className="mt-4 text-sm text-tinta-suave">{t.externos.cargando}</p>}

      {!cargando && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-borde bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-borde text-left text-xs font-semibold uppercase tracking-wide text-tinta-suave">
                <th className="px-4 py-3">{r.fecha}</th>
                <th className="px-4 py-3">{r.externo}</th>
                <th className="px-4 py-3 text-right">{r.maquillada}</th>
                <th className="px-4 py-3 text-right">{r.hydratada}</th>
                <th className="px-4 py-3 text-right">{r.horas}</th>
                <th className="px-4 py-3 text-right">{r.bruto}</th>
                {esEditor && <th className="px-4 py-3 text-right">{t.externos.colAcciones}</th>}
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={esEditor ? 7 : 6} className="px-4 py-6 text-center text-sm text-tinta-suave">
                    {r.sinRegistros}
                  </td>
                </tr>
              ) : (
                visibles.map((reg) => {
                  const ext = externoPorId.get(reg.externo_id)
                  const bruto = totalesProduccion([reg], tarifas).bruto
                  return (
                    <tr key={reg.id} className="border-b border-borde/60 last:border-0 hover:bg-brand-50/50">
                      <td className="px-4 py-3 text-tinta">{fechaFmt(reg.fecha)}</td>
                      <td className="px-4 py-3 text-tinta">
                        {ext ? (
                          <>
                            <span className="font-mono text-xs text-tinta-suave">{ext.codigo}</span>{' '}
                            {ext.nombre_completo}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-tinta">{reg.maquillada_tallos}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-tinta">{reg.hydratada_tallos}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-tinta">{reg.horas}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-tinta">
                        {moneda(bruto, { decimales: 0 })}
                      </td>
                      {esEditor && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditar(reg)}
                              className="inline-flex items-center gap-1 rounded-lg border border-borde bg-white px-2.5 py-1.5 text-xs font-semibold text-tinta-suave transition-colors duration-150 hover:border-brand-700 hover:text-brand-700"
                            >
                              <IconoLapiz size={14} />
                              {t.externos.editar}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(r.confirmarBorrar)) borrar.mutate(reg.id)
                              }}
                              disabled={borrar.isPending}
                              className="rounded-lg border border-borde bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors duration-150 hover:border-red-400 disabled:opacity-50"
                            >
                              {r.borrar}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
            {visibles.length > 0 && (
              <tfoot>
                <tr className="border-t border-borde bg-brand-50/50 font-semibold text-brand-900">
                  <td className="px-4 py-3" colSpan={2}>
                    {r.subtotalPeriodo}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{subtotalVisible.maquillada_tallos}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{subtotalVisible.hydratada_tallos}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{subtotalVisible.horas}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-brand-700">
                    {moneda(subtotalVisible.bruto, { decimales: 0 })}
                  </td>
                  {esEditor && <td className="px-4 py-3" />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-tinta-suave">
        {r.notaPie(nombreMes(periodo.mes), periodo.anio)}
      </p>

      {editar && (
        <ModalRegistro
          registro={editar}
          externos={externos}
          guardando={actualizar.isPending}
          onGuardar={(datos) => actualizar.mutate({ id: editar.id, datos })}
          onCerrar={() => setEditar(null)}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}
