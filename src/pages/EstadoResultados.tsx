import { Fragment, useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useErChequeos, useErDetalle, useErRubros } from '../hooks/useInformes'
import {
  construirModeloEr,
  transformarTotalAnio,
  transformarValor,
} from '../lib/estadoResultados'
import type { LineaDerivada, ModeloEr } from '../lib/estadoResultados'
import { exportarEr } from '../lib/exportarExcel'
import { supabase } from '../lib/supabase'
import { contable, parsearNumero } from '../lib/formato'
import { nombreMes } from '../types/balance'
import type { ModoEr } from '../types/informes'
import CeldaValor from '../components/informes/CeldaValor'
import NotasFinancieras from '../components/informes/NotasFinancieras'
import { useNotasAnio } from '../hooks/useNotas'
import { useVentasEfectivo } from '../hooks/useVentasEfectivo'
import { useTraducciones } from '../hooks/useTraducciones'
import { useRol } from '../hooks/useRol'
import { useAuth } from '../hooks/useAuth'
import { nombreCuenta } from '../lib/nombreCuenta'
import Toast from '../components/Toast'
import type { DatosToast } from '../components/Toast'
import { useTranslation } from '../hooks/useTranslation'

const MODOS: ModoEr[] = ['absolutos', 'vertical', 'horizontal']

/** Celda editable de "Ventas en efectivo" (un mes). Solo admin/contadora. */
function CeldaEfectivo({
  valor,
  aria,
  onGuardar,
}: {
  valor: number
  aria: string
  onGuardar: (valor: number) => void
}) {
  return (
    <td className="px-1 py-1">
      {/* type=text (sin flechas/spinners); muestra el valor formateado (es-CO)
          y al confirmar se parsea de vuelta a número. */}
      <input
        type="text"
        inputMode="decimal"
        key={valor}
        defaultValue={valor === 0 ? '' : contable(valor)}
        aria-label={aria}
        onBlur={(e) => {
          const n = parsearNumero(e.target.value) ?? 0
          if (n !== valor) onGuardar(n)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className="w-full rounded border border-borde bg-white px-1.5 py-1 text-right text-xs tabular-nums text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
      />
    </td>
  )
}

/** Tras qué rubro va cada línea derivada. */
const DERIVADAS_TRAS_RUBRO: Record<string, string[]> = {
  ING_OP: ['TOTAL_INGRESOS'],
  COSTO_SER: ['TOTAL_COSTO', 'UTILIDAD_BRUTA'],
  GASTO_VTA: ['UTILIDAD_OPERACIONAL'],
  GASTO_NOOP: ['UTILIDAD_NETA'],
}

function FilaDerivada({ linea, modelo, modo }: { linea: LineaDerivada; modelo: ModeloEr; modo: ModoEr }) {
  const { t } = useTranslation()
  return (
    <tr className="border-t border-brand-200 bg-brand-50">
      <td className="px-3 py-2 text-xs font-bold text-brand-900">
        {t.derivadas[linea.clave] ?? linea.etiqueta}
      </td>
      {t.meses.map((_, i) => {
        const mes = i + 1
        const sinDatos = !modelo.mesesConDatos.includes(mes)
        return (
          <CeldaValor
            key={mes}
            valor={sinDatos ? null : transformarValor(modo, linea.valores, mes, modelo)}
            modo={modo}
            sinDatos={sinDatos}
            negrilla
          />
        )
      })}
      <CeldaValor valor={transformarTotalAnio(modo, linea.totalAnio, modelo)} modo={modo} negrilla />
    </tr>
  )
}

export default function EstadoResultados() {
  const { t, idioma } = useTranslation()
  const queryClient = useQueryClient()
  const { esEditor } = useRol()
  const { sesion } = useAuth()
  const detalle = useErDetalle()
  const rubros = useErRubros()
  const chequeos = useErChequeos()

  const [modo, setModo] = useState<ModoEr>('absolutos')
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<DatosToast | null>(null)
  const temporizadorToast = useRef<ReturnType<typeof setTimeout> | null>(null)

  const avisar = (datos: DatosToast) => {
    if (temporizadorToast.current) clearTimeout(temporizadorToast.current)
    setToast(datos)
    temporizadorToast.current = setTimeout(() => setToast(null), 4000)
  }

  const anio = useMemo(
    () => (rubros.data ?? []).reduce((max, r) => Math.max(max, r.anio), new Date().getFullYear()),
    [rubros.data]
  )

  // Notas financieras del año: se muestran abajo y viajan en el export del ER.
  const notas = useNotasAnio(anio)
  // Traducciones de nombres de cuenta (modo EN).
  const traducciones = useTraducciones()
  const trad = traducciones.data ?? new Map()
  // Ventas en efectivo (dato manual informativo, fila al final).
  const ventas = useVentasEfectivo(anio)
  const ventasMapa = ventas.data ?? new Map<number, number>()

  const guardarVenta = useMutation({
    mutationFn: async ({ mes, valor }: { mes: number; valor: number }) => {
      const { error } = await supabase.from('ventas_efectivo').upsert(
        { anio, mes, valor, actualizada_por: sesion?.user.id ?? null, actualizada_en: new Date().toISOString() },
        { onConflict: 'anio,mes' }
      )
      if (error) throw new Error(error.message)
    },
    onMutate: async ({ mes, valor }) => {
      await queryClient.cancelQueries({ queryKey: ['ventas_efectivo', anio] })
      const previo = queryClient.getQueryData<Map<number, number>>(['ventas_efectivo', anio])
      queryClient.setQueryData<Map<number, number>>(['ventas_efectivo', anio], (actual) => {
        const copia = new Map(actual ?? [])
        copia.set(mes, valor)
        return copia
      })
      return { previo }
    },
    onError: (e, _v, contexto) => {
      if (contexto?.previo) queryClient.setQueryData(['ventas_efectivo', anio], contexto.previo)
      avisar({ tipo: 'error', mensaje: t.er.errorVentas(e.message) })
    },
    onSuccess: () => avisar({ tipo: 'exito', mensaje: t.er.ventasGuardada }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['ventas_efectivo', anio] }),
  })

  const modelo = useMemo(
    () =>
      detalle.data && rubros.data && chequeos.data
        ? construirModeloEr(detalle.data, rubros.data, chequeos.data, anio)
        : null,
    [detalle.data, rubros.data, chequeos.data, anio]
  )

  const cargando = detalle.isLoading || rubros.isLoading || chequeos.isLoading
  const error = detalle.error ?? rubros.error ?? chequeos.error

  // Tooltip ⓘ del EBITDA: qué cuentas D&A se sumaron (o que no hay ninguna).
  const tooltipEbitda = modelo
    ? modelo.cuentasDya.length > 0
      ? [
          ...t.analisis.tooltipEbitdaCon,
          ...modelo.cuentasDya.map((c) => `• ${c.cuenta} ${c.nombre}`),
        ].join('\n')
      : t.analisis.tooltipEbitdaSin.join('\n')
    : ''

  const alternarRubro = (codigo: string) =>
    setExpandidos((previos) => {
      const nuevos = new Set(previos)
      if (nuevos.has(codigo)) nuevos.delete(codigo)
      else nuevos.add(codigo)
      return nuevos
    })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">{t.er.titulo(anio)}</h1>
          <p className="mt-1 text-sm text-tinta-suave">{t.er.descripcion}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-borde bg-white p-0.5">
            {MODOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                  modo === m ? 'bg-brand-700 text-white' : 'text-tinta-suave hover:text-brand-900'
                }`}
              >
                {t.er.modos[m]}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!modelo}
            onClick={() =>
              modelo &&
              exportarEr(
                modelo,
                modo,
                t,
                (notas.data ?? []).map((n) => ({
                  mes: n.mes,
                  contenido: idioma === 'en' ? n.contenido_en : n.contenido,
                })),
                trad,
                ventasMapa
              )
            }
            className="rounded-lg border border-borde bg-white px-3 py-1.5 text-xs font-semibold text-tinta-suave transition-colors duration-150 hover:border-brand-700 hover:text-brand-700 disabled:opacity-50"
          >
            {t.comun.exportarExcel}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t.er.errorVistas(error.message)}
        </p>
      )}
      {cargando && <p className="mt-6 text-sm text-tinta-suave">{t.er.calculando}</p>}

      {modelo && modelo.mesesConDatos.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-borde bg-white p-6 text-center text-sm text-tinta-suave">
          {t.er.sinDatos(anio)}
        </p>
      )}

      {modelo && modelo.mesesConDatos.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-borde bg-white shadow-sm">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50 text-brand-900">
              <tr>
                <th className="min-w-64 px-3 py-2.5 text-left text-xs font-semibold">{t.comun.linea}</th>
                {t.meses.map((nombre, i) => (
                  <th
                    key={nombre}
                    className={`px-3 py-2.5 text-right text-xs font-semibold ${
                      modelo.mesesConDatos.includes(i + 1) ? '' : 'text-gray-400'
                    }`}
                  >
                    {nombre}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right text-xs font-bold">{t.comun.totalAnio}</th>
              </tr>
            </thead>
            <tbody>
              {modelo.rubros.map((bloque) => {
                const abierto = expandidos.has(bloque.codigo)
                return (
                  <Fragment key={bloque.codigo}>
                    {/* Subtotal del rubro (clic para expandir cuentas) */}
                    <tr
                      className="cursor-pointer border-t border-borde bg-white transition-colors duration-150 hover:bg-brand-50"
                      onClick={() => alternarRubro(bloque.codigo)}
                    >
                      <td className="px-3 py-2 text-xs font-semibold text-tinta">
                        <span className="mr-1.5 inline-block w-3 text-tinta-suave">
                          {abierto ? '▾' : '▸'}
                        </span>
                        {t.rubros[bloque.codigo] ?? bloque.nombre}
                        <span className="ml-1.5 text-gray-400">({bloque.cuentas.length})</span>
                      </td>
                      {t.meses.map((_, i) => {
                        const mes = i + 1
                        const sinDatos = !modelo.mesesConDatos.includes(mes)
                        return (
                          <CeldaValor
                            key={mes}
                            valor={sinDatos ? null : transformarValor(modo, bloque.valores, mes, modelo)}
                            modo={modo}
                            sinDatos={sinDatos}
                          />
                        )
                      })}
                      <CeldaValor valor={transformarTotalAnio(modo, bloque.totalAnio, modelo)} modo={modo} />
                    </tr>

                    {/* Cuentas del rubro (expandibles) */}
                    {abierto &&
                      bloque.cuentas.map((cuenta) => (
                        <tr
                          key={cuenta.cuenta}
                          className="border-t border-borde bg-gray-50/50 transition-colors duration-150 hover:bg-brand-50"
                        >
                          <td className="py-1.5 pl-10 pr-3 text-xs text-tinta-suave">
                            <span className="font-mono text-gray-400">{cuenta.cuenta}</span>{' '}
                            {(() => {
                              const n = nombreCuenta(trad, cuenta.cuenta, cuenta.nombre)
                              return (
                                <span title={n.sinTraducir ? 'Untranslated' : undefined}>{n.texto}</span>
                              )
                            })()}
                          </td>
                          {t.meses.map((_, i) => {
                            const mes = i + 1
                            const sinDatos = !modelo.mesesConDatos.includes(mes)
                            return (
                              <CeldaValor
                                key={mes}
                                valor={sinDatos ? null : transformarValor(modo, cuenta.valores, mes, modelo)}
                                modo={modo}
                                sinDatos={sinDatos}
                              />
                            )
                          })}
                          <CeldaValor valor={transformarTotalAnio(modo, cuenta.totalAnio, modelo)} modo={modo} />
                        </tr>
                      ))}

                    {/* Líneas derivadas que van tras este rubro */}
                    {(DERIVADAS_TRAS_RUBRO[bloque.codigo] ?? []).map((clave) => (
                      <FilaDerivada key={clave} linea={modelo.derivadas.get(clave)!} modelo={modelo} modo={modo} />
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Bloque independiente: EBITDA y Ventas en efectivo ──
          Van fuera del cuadro del ER (que termina en Utilidad Neta); no afectan
          ningún total. Mismas columnas (meses + Total año) para alinear con la
          tabla de arriba. */}
      {modelo && modelo.mesesConDatos.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-brand-900">{t.er.adicionalesTitulo}</h2>
          <div className="mt-2 overflow-x-auto rounded-xl border border-borde bg-white shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50 text-brand-900">
                <tr>
                  <th className="min-w-64 px-3 py-2.5 text-left text-xs font-semibold">{t.comun.linea}</th>
                  {t.meses.map((nombre, i) => (
                    <th
                      key={nombre}
                      className={`px-3 py-2.5 text-right text-xs font-semibold ${
                        modelo.mesesConDatos.includes(i + 1) ? '' : 'text-gray-400'
                      }`}
                    >
                      {nombre}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right text-xs font-bold">{t.comun.totalAnio}</th>
                </tr>
              </thead>
              <tbody>
                {/* EBITDA (calculado): Utilidad Operacional + D&A. */}
                <tr className="border-t border-brand-200 bg-brand-50">
                  <td className="px-3 py-2 text-xs font-bold text-brand-900">
                    {t.er.ebitda}
                    <span
                      className="ml-1.5 cursor-help align-middle text-tinta-suave"
                      title={tooltipEbitda}
                      aria-label={t.er.ebitdaInfoAria}
                    >
                      ⓘ
                    </span>
                  </td>
                  {t.meses.map((_, i) => {
                    const mes = i + 1
                    const sinDatos = !modelo.mesesConDatos.includes(mes)
                    return (
                      <CeldaValor
                        key={mes}
                        valor={
                          sinDatos
                            ? null
                            : transformarValor(modo, modelo.derivadas.get('EBITDA')!.valores, mes, modelo)
                        }
                        modo={modo}
                        sinDatos={sinDatos}
                        negrilla
                      />
                    )
                  })}
                  <CeldaValor
                    valor={transformarTotalAnio(modo, modelo.derivadas.get('EBITDA')!.totalAnio, modelo)}
                    modo={modo}
                    negrilla
                  />
                </tr>

                {/* Ventas en efectivo (dato manual informativo, no afecta subtotales). */}
                <tr className="border-t border-borde bg-white">
                  <td className="px-3 py-2 text-xs font-semibold text-tinta">{t.er.ventasEfectivo}</td>
                  {t.meses.map((_, i) => {
                    const mes = i + 1
                    const sinDatos = !modelo.mesesConDatos.includes(mes)
                    if (modo === 'absolutos' && esEditor && !sinDatos) {
                      return (
                        <CeldaEfectivo
                          key={mes}
                          valor={ventasMapa.get(mes) ?? 0}
                          aria={t.er.ventasEfectivoAria(nombreMes(mes))}
                          onGuardar={(valor) => guardarVenta.mutate({ mes, valor })}
                        />
                      )
                    }
                    return (
                      <CeldaValor
                        key={mes}
                        valor={sinDatos ? null : transformarValor(modo, ventasMapa, mes, modelo)}
                        modo={modo}
                        sinDatos={sinDatos}
                      />
                    )
                  })}
                  <CeldaValor
                    valor={transformarTotalAnio(
                      modo,
                      modelo.mesesConDatos.reduce((acc, mes) => acc + (ventasMapa.get(mes) ?? 0), 0),
                      modelo
                    )}
                    modo={modo}
                  />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chequeos por grupo */}
      {modelo && modelo.chequeos.length > 0 && (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">{t.er.chequeosTitulo}</p>
          <p className="mt-1 text-xs text-amber-700">{t.er.chequeosNota}</p>
          <ul className="mt-2 space-y-1">
            {modelo.chequeos.map((ch) => (
              <li key={ch.grupo} className="text-xs text-amber-800">
                <span className="font-bold">{t.er.chequeoGrupo(ch.grupo)}</span>{' '}
                {[...ch.diferencias.entries()]
                  .sort((a, b) => a[0] - b[0])
                  .map(([mes, dif]) => `${nombreMes(mes)}: ${contable(dif)}`)
                  .join(' · ')}
              </li>
            ))}
          </ul>
        </div>
      )}
      {modelo && modelo.mesesConDatos.length > 0 && modelo.chequeos.length === 0 && (
        <p className="mt-5 text-xs font-medium text-exito">{t.er.chequeosOk}</p>
      )}

      {/* Notas financieras por mes (editables a mano) */}
      {modelo && modelo.mesesConDatos.length > 0 && (
        <NotasFinancieras anio={anio} mesesConDatos={modelo.mesesConDatos} />
      )}

      <Toast toast={toast} />
    </div>
  )
}
