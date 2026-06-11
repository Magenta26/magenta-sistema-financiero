import { useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { calcularValores, conflictoEr } from '../lib/consolidado'
import { normalizar } from '../lib/parserSiigo'
import { entero } from '../lib/formato'
import {
  useCatalogo,
  useMovimientosTransaccionales,
  useRubros,
} from '../hooks/useConsolidado'
import { esPendiente } from '../types/catalogo'
import type { CuentaCatalogo } from '../types/catalogo'
import TablaCatalogo from '../components/consolidado/TablaCatalogo'
import type { CambioCuenta, CampoOrden } from '../components/consolidado/TablaCatalogo'
import Toast from '../components/Toast'
import type { DatosToast } from '../components/Toast'

const CLAVE_CATALOGO = ['catalogo_cuentas', 'todas'] as const

export default function Consolidado() {
  const queryClient = useQueryClient()
  const catalogo = useCatalogo()
  const rubros = useRubros()
  const movimientos = useMovimientosTransaccionales()

  const [busqueda, setBusqueda] = useState('')
  const [filtroClase, setFiltroClase] = useState<'todas' | string>('todas')
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [orden, setOrden] = useState<{ campo: CampoOrden; ascendente: boolean }>({
    campo: 'cuenta',
    ascendente: true,
  })
  const [toast, setToast] = useState<DatosToast | null>(null)
  const temporizadorToast = useRef<ReturnType<typeof setTimeout> | null>(null)

  const avisar = (datos: DatosToast) => {
    if (temporizadorToast.current) clearTimeout(temporizadorToast.current)
    setToast(datos)
    temporizadorToast.current = setTimeout(() => setToast(null), 4000)
  }

  const valores = useMemo(
    () => calcularValores(catalogo.data ?? [], movimientos.data ?? []),
    [catalogo.data, movimientos.data]
  )

  const pendientes = useMemo(() => (catalogo.data ?? []).filter(esPendiente), [catalogo.data])

  const visibles = useMemo(() => {
    let lista = catalogo.data ?? []
    if (filtroClase !== 'todas') lista = lista.filter((c) => c.cuenta[0] === filtroClase)
    if (soloPendientes) lista = lista.filter(esPendiente)
    const texto = normalizar(busqueda)
    if (texto) {
      lista = lista.filter(
        (c) => c.cuenta.includes(texto) || normalizar(c.nombre).includes(texto)
      )
    }
    const signo = orden.ascendente ? 1 : -1
    return [...lista].sort((a, b) =>
      orden.campo === 'cuenta'
        ? signo * a.cuenta.localeCompare(b.cuenta)
        : signo * ((valores.get(a.cuenta) ?? 0) - (valores.get(b.cuenta) ?? 0))
    )
  }, [catalogo.data, filtroClase, soloPendientes, busqueda, orden, valores])

  const guardar = useMutation({
    mutationFn: async ({ cuenta, campos }: CambioCuenta) => {
      const { error } = await supabase
        .from('catalogo_cuentas')
        .update({ ...campos, origen: 'manual', actualizada_en: new Date().toISOString() })
        .eq('cuenta', cuenta)
      if (error) throw new Error(error.message)
    },
    onMutate: async ({ cuenta, campos }) => {
      await queryClient.cancelQueries({ queryKey: CLAVE_CATALOGO })
      const previo = queryClient.getQueryData<CuentaCatalogo[]>(CLAVE_CATALOGO)
      queryClient.setQueryData<CuentaCatalogo[]>(CLAVE_CATALOGO, (actual) =>
        (actual ?? []).map((c) =>
          c.cuenta === cuenta ? { ...c, ...campos, origen: 'manual' as const } : c
        )
      )
      return { previo }
    },
    onError: (e, _cambio, contexto) => {
      if (contexto?.previo) queryClient.setQueryData(CLAVE_CATALOGO, contexto.previo)
      avisar({ tipo: 'error', mensaje: `No se pudo guardar: ${e.message}. Se revirtió el cambio.` })
    },
    onSuccess: (_datos, { cuenta }) => {
      avisar({ tipo: 'exito', mensaje: `${cuenta} guardada.` })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo_cuentas'] })
    },
  })

  const alCambiar = (cambio: CambioCuenta) => {
    // Invariante anti-doble-conteo: solo al ACTIVAR incluir_er
    if (cambio.campos.incluir_er === true) {
      const resultado = conflictoEr(cambio.cuenta, catalogo.data ?? [])
      if (resultado) {
        avisar({ tipo: 'error', mensaje: resultado.razon })
        return
      }
    }
    guardar.mutate(cambio)
  }

  const cargando = catalogo.isLoading || rubros.isLoading || movimientos.isLoading
  const errorCarga = catalogo.error ?? rubros.error ?? movimientos.error

  const totalEr = (catalogo.data ?? []).filter((c) => c.incluir_er).length
  const totalBg = (catalogo.data ?? []).filter((c) => c.incluir_bg).length

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Consolidado</h1>
      <p className="mt-2 max-w-2xl text-sm text-ciruela-300">
        Clasifica cada cuenta del catálogo: su rubro del Estado de Resultados y si entra al ER y/o
        al Balance General. Los cambios se guardan al instante.
      </p>

      {errorCarga && (
        <p role="alert" className="mt-6 rounded-lg border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-300">
          Error consultando la base: {errorCarga.message}
        </p>
      )}

      {cargando && <p className="mt-6 text-sm text-ciruela-400">Cargando catálogo y movimientos…</p>}

      {!cargando && !errorCarga && catalogo.data && (
        <>
          {/* Banner de pendientes */}
          {pendientes.length > 0 && !soloPendientes && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-700 bg-amber-950/40 px-4 py-3">
              <p className="text-sm font-medium text-amber-200">
                ⚠️ Hay {pendientes.length} cuenta(s) nueva(s) sin clasificar.
              </p>
              <button
                type="button"
                onClick={() => setSoloPendientes(true)}
                className="rounded-lg bg-amber-700/60 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-700"
              >
                Ver pendientes
              </button>
            </div>
          )}

          {/* Resumen */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { etiqueta: 'Cuentas en el catálogo', valor: catalogo.data.length },
              { etiqueta: 'Incluidas en ER', valor: totalEr },
              { etiqueta: 'Incluidas en BG', valor: totalBg },
              { etiqueta: 'Pendientes de clasificar', valor: pendientes.length },
            ].map((kpi) => (
              <div key={kpi.etiqueta} className="rounded-xl border border-ciruela-800 bg-ciruela-900/60 px-4 py-3">
                <p className="text-xs text-ciruela-400">{kpi.etiqueta}</p>
                <p className="mt-1 text-2xl font-bold text-white">{entero(kpi.valor)}</p>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por cuenta o nombre…"
              className="w-72 rounded-lg border border-ciruela-700 bg-ciruela-950 px-3 py-2 text-sm text-white placeholder-ciruela-600 focus:border-magenta-500 focus:outline-none"
            />
            <select
              aria-label="Filtrar por clase"
              value={filtroClase}
              onChange={(e) => setFiltroClase(e.target.value)}
              className="rounded-lg border border-ciruela-700 bg-ciruela-950 px-3 py-2 text-sm text-white focus:border-magenta-500 focus:outline-none"
            >
              <option value="todas">Todas las clases</option>
              <option value="1">1 · Activo</option>
              <option value="2">2 · Pasivo</option>
              <option value="3">3 · Patrimonio</option>
              <option value="4">4 · Ingresos</option>
              <option value="5">5 · Gastos</option>
              <option value="6">6 · Costos</option>
              <option value="7">7 · Costos de producción</option>
            </select>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ciruela-300">
              <input
                type="checkbox"
                checked={soloPendientes}
                onChange={(e) => setSoloPendientes(e.target.checked)}
                className="h-4 w-4 accent-magenta-500"
              />
              Solo pendientes de clasificar
            </label>
            <p className="ml-auto text-xs text-ciruela-400">
              Mostrando {entero(visibles.length)} de {entero(catalogo.data.length)}
            </p>
          </div>

          <div className="mt-4">
            <TablaCatalogo
              cuentas={visibles}
              valores={valores}
              rubros={rubros.data ?? []}
              movimientos={movimientos.data ?? []}
              orden={orden}
              onOrdenar={(campo) =>
                setOrden((o) =>
                  o.campo === campo
                    ? { campo, ascendente: !o.ascendente }
                    : { campo, ascendente: campo === 'cuenta' }
                )
              }
              onCambiar={alCambiar}
              guardando={guardar.isPending}
            />
          </div>

          <p className="mt-3 text-xs text-ciruela-500">
            Valor: clases 4-7 acumulado del año con signo según naturaleza; clases 1-3 saldo final
            del último mes cargado. ▸ expande el detalle mes a mes.
          </p>
        </>
      )}

      <Toast toast={toast} />
    </div>
  )
}
