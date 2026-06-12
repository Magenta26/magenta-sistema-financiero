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
import { useTranslation } from '../hooks/useTranslation'

const CLAVE_CATALOGO = ['catalogo_cuentas', 'todas'] as const

export default function Consolidado() {
  const { t } = useTranslation()
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
      avisar({ tipo: 'error', mensaje: t.consolidado.errorGuardar(e.message) })
    },
    onSuccess: (_datos, { cuenta }) => {
      avisar({ tipo: 'exito', mensaje: t.consolidado.guardada(cuenta) })
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
        const mensaje =
          resultado.tipo === 'la-contiene'
            ? t.consolidado.conflictoContiene(resultado.conflicto.cuenta, cambio.cuenta)
            : t.consolidado.conflictoContenida(resultado.conflicto.cuenta, cambio.cuenta)
        avisar({ tipo: 'error', mensaje })
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
      <h1 className="text-2xl font-bold text-brand-900">{t.consolidado.titulo}</h1>
      <p className="mt-2 max-w-2xl text-sm text-tinta-suave">{t.consolidado.descripcion}</p>

      {errorCarga && (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t.comun.errorConsultando(errorCarga.message)}
        </p>
      )}

      {cargando && <p className="mt-6 text-sm text-tinta-suave">{t.consolidado.cargando}</p>}

      {!cargando && !errorCarga && catalogo.data && (
        <>
          {/* Banner de pendientes */}
          {pendientes.length > 0 && !soloPendientes && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-800">
                {t.consolidado.pendientesBanner(pendientes.length)}
              </p>
              <button
                type="button"
                onClick={() => setSoloPendientes(true)}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-amber-700"
              >
                {t.consolidado.verPendientes}
              </button>
            </div>
          )}

          {/* Resumen */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { etiqueta: t.consolidado.kpiTotal, valor: catalogo.data.length },
              { etiqueta: t.consolidado.kpiEr, valor: totalEr },
              { etiqueta: t.consolidado.kpiBg, valor: totalBg },
              { etiqueta: t.consolidado.kpiPendientes, valor: pendientes.length },
            ].map((kpi) => (
              <div key={kpi.etiqueta} className="rounded-xl border border-borde bg-white px-4 py-3 shadow-sm">
                <p className="text-xs text-tinta-suave">{kpi.etiqueta}</p>
                <p className="mt-1 text-2xl font-bold text-brand-900">{entero(kpi.valor)}</p>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={t.consolidado.buscar}
              className="w-72 rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            />
            <select
              aria-label={t.consolidado.filtroClaseAria}
              value={filtroClase}
              onChange={(e) => setFiltroClase(e.target.value)}
              className="rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            >
              <option value="todas">{t.consolidado.todasLasClases}</option>
              {(['1', '2', '3', '4', '5', '6', '7'] as const).map((clase) => (
                <option key={clase} value={clase}>
                  {clase} · {t.clases[clase]}
                </option>
              ))}
            </select>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-tinta">
              <input
                type="checkbox"
                checked={soloPendientes}
                onChange={(e) => setSoloPendientes(e.target.checked)}
                className="h-4 w-4 accent-brand-700"
              />
              {t.consolidado.soloPendientes}
            </label>
            <p className="ml-auto text-xs text-tinta-suave">
              {t.consolidado.mostrando(entero(visibles.length), entero(catalogo.data.length))}
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

          <p className="mt-3 text-xs text-tinta-suave">{t.consolidado.notaPie}</p>
        </>
      )}

      <Toast toast={toast} />
    </div>
  )
}
