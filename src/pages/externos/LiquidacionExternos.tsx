import { useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTranslation } from '../../hooks/useTranslation'
import { useRol } from '../../hooks/useRol'
import { useAuth } from '../../hooks/useAuth'
import {
  useDeduccionesExternos,
  useExternos,
  useRegistrosExternos,
  useTarifasExternos,
} from '../../hooks/useExternos'
import { useEmpleadosNatillera } from '../../hooks/useNatillera'
import { construirLiquidacion, quincenaActual, TARIFAS_DEFECTO } from '../../lib/externos'
import { exportarLiquidacionExternos } from '../../lib/exportarExcel'
import { moneda } from '../../lib/formato'
import type { DatosDeduccion, Externo } from '../../types/externos'
import Toast from '../../components/Toast'
import type { DatosToast } from '../../components/Toast'
import SelectorQuincena from '../../components/externos/SelectorQuincena'
import type { PeriodoQuincena } from '../../components/externos/SelectorQuincena'
import ModalDeducciones from '../../components/externos/ModalDeducciones'

/** Pestaña B: liquidación quincenal con cálculo de pago y deducciones. */
export default function LiquidacionExternos() {
  const { t } = useTranslation()
  const x = t.externos
  const queryClient = useQueryClient()
  const { esEditorNomina: esEditor } = useRol()
  const { sesion } = useAuth()

  const externosQuery = useExternos()
  const registrosQuery = useRegistrosExternos()
  const deduccionesQuery = useDeduccionesExternos()
  const tarifasQuery = useTarifasExternos()
  const natEmpsQuery = useEmpleadosNatillera()

  const externos = useMemo(() => externosQuery.data ?? [], [externosQuery.data])
  const registros = useMemo(() => registrosQuery.data ?? [], [registrosQuery.data])
  const deducciones = useMemo(() => deduccionesQuery.data ?? [], [deduccionesQuery.data])
  const tarifas = tarifasQuery.data ?? TARIFAS_DEFECTO

  // Cuota mensual por id de registro de natillera (para el 50% automático).
  const cuotaPorNatId = useMemo(() => {
    const m = new Map<string, number>()
    for (const n of natEmpsQuery.data ?? []) m.set(n.id, n.cuota_mensual)
    return m
  }, [natEmpsQuery.data])

  const hoy = useMemo(() => {
    const ahora = new Date()
    return { anio: ahora.getFullYear(), mes: ahora.getMonth() + 1, dia: ahora.getDate() }
  }, [])
  const anios = useMemo(() => {
    const set = new Set<number>([hoy.anio])
    for (const r of registros) set.add(Number(r.fecha.slice(0, 4)))
    for (const d of deducciones) set.add(d.anio)
    return [...set].sort((a, b) => b - a)
  }, [registros, deducciones, hoy.anio])

  const [periodo, setPeriodo] = useState<PeriodoQuincena>(() => quincenaActual(hoy))
  const [gestionar, setGestionar] = useState<Externo | null>(null)
  const [toast, setToast] = useState<DatosToast | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const avisar = (datos: DatosToast) => {
    if (temporizador.current) clearTimeout(temporizador.current)
    setToast(datos)
    temporizador.current = setTimeout(() => setToast(null), 4000)
  }

  const { lineas, totales } = useMemo(
    () =>
      construirLiquidacion(
        externos,
        registros,
        deducciones,
        tarifas,
        cuotaPorNatId,
        periodo.anio,
        periodo.mes,
        periodo.quincena
      ),
    [externos, registros, deducciones, tarifas, cuotaPorNatId, periodo]
  )

  // Deducciones del externo que se está gestionando, en el período activo.
  const dedsDeGestion = useMemo(() => {
    if (!gestionar) return []
    return deducciones.filter(
      (d) => d.externo_id === gestionar.id && d.anio === periodo.anio && d.quincena === periodo.quincena
    )
  }, [gestionar, deducciones, periodo])

  // ── Mutaciones de deducciones ──
  const crearDed = useMutation({
    mutationFn: async ({ externoId, datos }: { externoId: string; datos: DatosDeduccion }) => {
      const { error } = await supabase.from('externos_deducciones').insert({
        externo_id: externoId,
        anio: periodo.anio,
        quincena: periodo.quincena,
        tipo: datos.tipo,
        valor: datos.valor,
        nota: datos.nota,
        creado_por: sesion?.user.id ?? null,
      })
      if (error) throw new Error(error.message)
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: x.deducciones.error(e.message) }),
    onSuccess: () => avisar({ tipo: 'exito', mensaje: x.deducciones.guardada }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['externos_deducciones'] }),
  })

  const editarDed = useMutation({
    mutationFn: async ({ id, datos }: { id: string; datos: DatosDeduccion }) => {
      const { error } = await supabase
        .from('externos_deducciones')
        .update({ tipo: datos.tipo, valor: datos.valor, nota: datos.nota })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: x.deducciones.error(e.message) }),
    onSuccess: () => avisar({ tipo: 'exito', mensaje: x.deducciones.guardada }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['externos_deducciones'] }),
  })

  const borrarDed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('externos_deducciones').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: x.deducciones.error(e.message) }),
    onSuccess: () => avisar({ tipo: 'exito', mensaje: x.deducciones.borrada }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['externos_deducciones'] }),
  })

  const guardandoDed = crearDed.isPending || editarDed.isPending || borrarDed.isPending

  const cargando =
    externosQuery.isLoading ||
    registrosQuery.isLoading ||
    deduccionesQuery.isLoading ||
    natEmpsQuery.isLoading
  const error =
    externosQuery.error ?? registrosQuery.error ?? deduccionesQuery.error ?? natEmpsQuery.error

  const l = x.liq
  const thNum = 'px-3 py-3 text-right'
  const tdNum = 'px-3 py-3 text-right tabular-nums'

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-brand-900">{l.titulo}</h2>
          <p className="mt-1 max-w-2xl text-sm text-tinta-suave">{l.descripcion}</p>
        </div>
        <button
          type="button"
          onClick={() => exportarLiquidacionExternos(lineas, totales, periodo, t)}
          disabled={lineas.length === 0}
          className="rounded-lg border border-brand-700 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition-colors duration-150 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t.comun.exportarExcel}
        </button>
      </div>

      <div className="mt-5">
        <SelectorQuincena anios={anios} periodo={periodo} onCambiar={setPeriodo} />
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {x.error(error.message)}
        </p>
      )}
      {cargando && <p className="mt-4 text-sm text-tinta-suave">{x.cargando}</p>}

      {!cargando && !error && (
        <>
          {lineas.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-borde bg-white p-6 text-center text-sm text-tinta-suave">
              {l.sinProduccion}
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-borde bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-borde text-left text-xs font-semibold uppercase tracking-wide text-tinta-suave">
                    <th className="px-3 py-3">{x.colNombre}</th>
                    <th className={thNum}>{l.maquilladaTallos}</th>
                    <th className={thNum}>{l.maquilladaValor}</th>
                    <th className={thNum}>{l.hydratadaTallos}</th>
                    <th className={thNum}>{l.hydratadaValor}</th>
                    <th className={thNum}>{l.horasCant}</th>
                    <th className={thNum}>{l.horasValor}</th>
                    <th className={thNum}>{l.bruto}</th>
                    <th className={thNum}>{l.dedNatillera}</th>
                    <th className={thNum}>{l.dedManuales}</th>
                    <th className={thNum}>{l.totalPagar}</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((ln) => (
                    <tr key={ln.externo.id} className="border-b border-borde/60 last:border-0 hover:bg-brand-50/50">
                      <td className="px-3 py-3 text-tinta">
                        <span className="font-mono text-xs text-tinta-suave">{ln.externo.codigo}</span>{' '}
                        {ln.externo.nombre_completo}
                      </td>
                      <td className={`${tdNum} text-tinta`}>{ln.produccion.maquillada_tallos}</td>
                      <td className={`${tdNum} text-tinta-suave`}>
                        {moneda(ln.produccion.maquillada_valor, { decimales: 0 })}
                      </td>
                      <td className={`${tdNum} text-tinta`}>{ln.produccion.hydratada_tallos}</td>
                      <td className={`${tdNum} text-tinta-suave`}>
                        {moneda(ln.produccion.hydratada_valor, { decimales: 0 })}
                      </td>
                      <td className={`${tdNum} text-tinta`}>{ln.produccion.horas}</td>
                      <td className={`${tdNum} text-tinta-suave`}>
                        {moneda(ln.produccion.horas_valor, { decimales: 0 })}
                      </td>
                      <td className={`${tdNum} font-semibold text-tinta`}>
                        {moneda(ln.produccion.bruto, { decimales: 0 })}
                      </td>
                      <td className={`${tdNum} text-tinta`}>
                        {ln.externo.natillera_empleado_id
                          ? moneda(ln.deduccionNatillera, { decimales: 0 })
                          : '—'}
                      </td>
                      <td className={tdNum}>
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-tinta">
                            {moneda(ln.deduccionesManuales, { decimales: 0 })}
                          </span>
                          {esEditor && (
                            <button
                              type="button"
                              onClick={() => setGestionar(ln.externo)}
                              className="rounded-md border border-borde bg-white px-2 py-1 text-xs font-semibold text-brand-700 transition-colors duration-150 hover:bg-brand-50"
                            >
                              {l.gestionar}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className={`${tdNum} font-bold text-brand-900`}>
                        {moneda(ln.totalAPagar, { decimales: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-brand-700 bg-brand-50/60 font-semibold text-brand-900">
                    <td className="px-3 py-3">{l.totalesFila}</td>
                    <td className={tdNum}>{totales.maquillada_tallos}</td>
                    <td className={tdNum}>{moneda(totales.maquillada_valor, { decimales: 0 })}</td>
                    <td className={tdNum}>{totales.hydratada_tallos}</td>
                    <td className={tdNum}>{moneda(totales.hydratada_valor, { decimales: 0 })}</td>
                    <td className={tdNum}>{totales.horas}</td>
                    <td className={tdNum}>{moneda(totales.horas_valor, { decimales: 0 })}</td>
                    <td className={tdNum}>{moneda(totales.bruto, { decimales: 0 })}</td>
                    <td className={tdNum}>{moneda(totales.deduccionNatillera, { decimales: 0 })}</td>
                    <td className={tdNum}>{moneda(totales.deduccionesManuales, { decimales: 0 })}</td>
                    <td className={`${tdNum} text-brand-700`}>
                      {moneda(totales.totalAPagar, { decimales: 0 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{l.notaPrestamo}</p>
          <p className="mt-2 text-xs text-tinta-suave">{l.notaTarifas(tarifas.maquillada_valor, tarifas.hydratada_valor, tarifas.hora_valor)}</p>
        </>
      )}

      {gestionar && (
        <ModalDeducciones
          externo={gestionar}
          anio={periodo.anio}
          mes={periodo.mes}
          quincena={periodo.quincena}
          deducciones={dedsDeGestion}
          guardando={guardandoDed}
          onCrear={(datos) => crearDed.mutate({ externoId: gestionar.id, datos })}
          onEditar={(id, datos) => editarDed.mutate({ id, datos })}
          onBorrar={(id: string) => {
            if (window.confirm(x.deducciones.confirmarBorrar)) borrarDed.mutate(id)
          }}
          onCerrar={() => setGestionar(null)}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}
