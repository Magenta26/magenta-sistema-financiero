import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * Verificación de la Fase 1: lee catalogo_cuentas con RLS activo.
 * El módulo completo (tabla editable, checks ER/BG, filtros) llega en la Fase 3.
 */
export default function Consolidado() {
  const { data: conteo, isLoading, error } = useQuery({
    queryKey: ['catalogo_cuentas', 'conteo'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('catalogo_cuentas')
        .select('*', { count: 'exact', head: true })
      if (error) throw new Error(error.message)
      return count ?? 0
    },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Consolidado</h1>
      <p className="mt-2 max-w-2xl text-sm text-ciruela-300">
        Catálogo de cuentas con valores acumulados del año, clasificación por rubro y los
        checkboxes que controlan qué entra al ER y al BG.
      </p>

      <div className="mt-8 rounded-2xl border border-ciruela-700 bg-ciruela-900/50 p-8">
        {isLoading && <p className="text-ciruela-400">Consultando el catálogo de cuentas…</p>}

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-800 bg-red-950/60 px-3 py-2 text-sm text-red-300"
          >
            No se pudo consultar el catálogo: {error.message}
            <br />
            <span className="text-red-400/80">
              ¿Ya se aplicaron las migraciones de la Fase 1 en Supabase?
            </span>
          </p>
        )}

        {conteo !== undefined && (
          <p className="text-lg text-white">
            Catálogo: <span className="font-bold text-magenta-400">{conteo}</span> cuentas{' '}
            <span className="text-sm text-ciruela-400">(98 esperadas tras la Fase 1)</span>
          </p>
        )}
      </div>

      <p className="mt-6 text-sm text-ciruela-400">
        El módulo completo de clasificación se construirá en la{' '}
        <span className="font-semibold text-magenta-400">Fase 3</span>.
      </p>
    </div>
  )
}
