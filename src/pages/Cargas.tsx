import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { parsearBalanceSiigo } from '../lib/parserSiigo'
import { validarBalance } from '../lib/validaciones'
import { entero } from '../lib/formato'
import type { Periodo, ResultadoParser } from '../types/balance'
import Dropzone from '../components/cargas/Dropzone'
import Previsualizacion from '../components/cargas/Previsualizacion'
import HistorialCargas from '../components/cargas/HistorialCargas'

interface ResultadoCarga {
  carga_id: string
  filas_importadas: number
  cuentas_nuevas: number
}

export default function Cargas() {
  const queryClient = useQueryClient()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [datosArchivo, setDatosArchivo] = useState<ArrayBuffer | null>(null)
  const [parseo, setParseo] = useState<ResultadoParser | null>(null)
  const [periodoManual, setPeriodoManual] = useState<Periodo | null>(null)
  const [errorParseo, setErrorParseo] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null)

  const periodoEfectivo = periodoManual ?? parseo?.periodo ?? null

  // Códigos del catálogo, para detectar cuentas nuevas en la previsualización
  const { data: cuentasCatalogo } = useQuery({
    queryKey: ['catalogo_cuentas', 'codigos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('catalogo_cuentas').select('cuenta')
      if (error) throw new Error(error.message)
      return data.map((c) => c.cuenta as string)
    },
  })

  // Carga activa existente para el período efectivo (aviso de reemplazo)
  const { data: cargaExistente } = useQuery({
    queryKey: ['cargas', 'activa', periodoEfectivo?.anio, periodoEfectivo?.mes],
    enabled: !!periodoEfectivo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cargas')
        .select('creada_en')
        .eq('anio', periodoEfectivo!.anio)
        .eq('mes', periodoEfectivo!.mes)
        .eq('estado', 'activa')
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data
    },
  })

  const validaciones = useMemo(() => {
    if (!parseo) return []
    return validarBalance({
      encabezadosFaltantes: parseo.encabezadosFaltantes,
      periodo: periodoEfectivo,
      filas: parseo.filas,
      cuentasCatalogo: cuentasCatalogo ?? [],
    })
  }, [parseo, periodoEfectivo, cuentasCatalogo])

  const hayBloqueantes = validaciones.some((v) => v.tipo === 'bloqueante')

  const alRecibirArchivo = async (nuevo: File) => {
    setResultado(null)
    setErrorParseo(null)
    setPeriodoManual(null)
    setParseo(null)
    setArchivo(nuevo)
    try {
      const datos = await nuevo.arrayBuffer()
      setDatosArchivo(datos)
      setParseo(parsearBalanceSiigo(datos))
    } catch (e) {
      setErrorParseo(
        `No se pudo leer el archivo: ${e instanceof Error ? e.message : 'error desconocido'}`
      )
    }
  }

  const confirmar = useMutation({
    mutationFn: async (): Promise<ResultadoCarga> => {
      if (!archivo || !datosArchivo || !parseo || !periodoEfectivo) {
        throw new Error('No hay carga lista para confirmar.')
      }
      const { anio, mes } = periodoEfectivo

      // 1) Subir el .xlsx original a Storage (auditoría)
      const nombreLimpio = archivo.name.replace(/[^\w.\-()á-úÁ-Ú ]/g, '_')
      const ruta = `${anio}/${mes}/${Date.now()}_${nombreLimpio}`
      const { error: errorSubida } = await supabase.storage
        .from('balances')
        .upload(ruta, datosArchivo, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      if (errorSubida) throw new Error(`Error subiendo el archivo a Storage: ${errorSubida.message}`)

      // 2) RPC procesar_carga: todo el flujo en una transacción
      const { data, error } = await supabase.rpc('procesar_carga', {
        p_anio: anio,
        p_mes: mes,
        p_nombre_archivo: archivo.name,
        p_storage_path: ruta,
        p_filas: parseo.filas.map((f) => ({
          nivel: f.nivel,
          transaccional: f.transaccional,
          cuenta: f.cuenta,
          nombre_cuenta: f.nombre_cuenta,
          saldo_inicial: f.saldo_inicial,
          mov_debito: f.mov_debito,
          mov_credito: f.mov_credito,
          saldo_final: f.saldo_final,
        })),
        p_validaciones: validaciones,
      })
      if (error) throw new Error(`Error procesando la carga: ${error.message}`)
      return data as ResultadoCarga
    },
    onSuccess: (r) => {
      setResultado(r)
      setArchivo(null)
      setDatosArchivo(null)
      setParseo(null)
      setPeriodoManual(null)
      queryClient.invalidateQueries({ queryKey: ['v_cargas'] })
      queryClient.invalidateQueries({ queryKey: ['cargas'] })
      queryClient.invalidateQueries({ queryKey: ['catalogo_cuentas'] })
    },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900">Cargas</h1>
      <p className="mt-2 max-w-2xl text-sm text-tinta-suave">
        Sube el balance de prueba mensual exportado de SIIGO. Revisa la previsualización y las
        validaciones antes de confirmar.
      </p>

      <div className="mt-6">
        <Dropzone onArchivo={alRecibirArchivo} deshabilitado={confirmar.isPending} />
      </div>

      {errorParseo && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorParseo}
        </p>
      )}

      {archivo && parseo && (
        <>
          <Previsualizacion
            nombreArchivo={archivo.name}
            filas={parseo.filas}
            periodoDetectado={parseo.periodo}
            periodoEfectivo={periodoEfectivo}
            onPeriodoManual={(p) => setPeriodoManual(p)}
            validaciones={validaciones}
            cargaExistente={cargaExistente ?? null}
          />

          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() => confirmar.mutate()}
              disabled={hayBloqueantes || confirmar.isPending}
              className="rounded-lg bg-brand-700 px-5 py-2.5 font-semibold text-white transition-colors duration-150 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirmar.isPending ? 'Procesando…' : 'Confirmar carga'}
            </button>
            {hayBloqueantes && (
              <p className="text-sm text-red-700">Corrige los bloqueantes ⛔ para continuar.</p>
            )}
            <button
              type="button"
              onClick={() => {
                setArchivo(null)
                setParseo(null)
                setPeriodoManual(null)
              }}
              disabled={confirmar.isPending}
              className="text-sm text-tinta-suave underline-offset-2 transition-colors duration-150 hover:text-brand-700 hover:underline"
            >
              Cancelar
            </button>
          </div>
        </>
      )}

      {confirmar.isPending && (
        <p className="mt-4 text-sm text-tinta-suave">
          <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-brand-700 border-t-transparent align-middle" />
          Subiendo archivo y procesando movimientos…
        </p>
      )}

      {confirmar.isError && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {confirmar.error.message}
        </p>
      )}

      {resultado && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          ✅ Carga procesada: <span className="font-bold">{entero(resultado.filas_importadas)}</span>{' '}
          filas insertadas
          {resultado.cuentas_nuevas > 0 ? (
            <>
              {' '}
              · <span className="font-bold">{resultado.cuentas_nuevas}</span> cuenta(s) nueva(s)
              agregada(s) al catálogo (revísalas en Consolidado)
            </>
          ) : (
            <> · sin cuentas nuevas</>
          )}
          . Los datos quedaron consolidados en la base.
        </div>
      )}

      <HistorialCargas />
    </div>
  )
}
