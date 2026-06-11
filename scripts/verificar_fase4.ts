/**
 * Verificación de la Fase 4 CONTRA LA BASE (vistas v_er_rubros / v_er_detalle):
 * compara los totales del año cargado con la sección 8 de PLAN.md.
 *
 * Requiere credenciales de un usuario de la app (RLS exige sesión):
 *   PowerShell:
 *     $env:VERIF_EMAIL='correo'; $env:VERIF_PASSWORD='contraseña'; node scripts/verificar_fase4.ts
 *
 * Si una cifra no cuadra, lista las cuentas del rubro que explican el delta
 * (en particular las que NO están en el catálogo semilla de 98).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { comparar, REFERENCIAS, TOLERANCIA } from './seccion8.ts'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

// .env.local: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
const env = Object.fromEntries(
  readFileSync(join(raiz, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const correo = process.env.VERIF_EMAIL
const contrasena = process.env.VERIF_PASSWORD
if (!correo || !contrasena) {
  console.error('Faltan VERIF_EMAIL y/o VERIF_PASSWORD en el entorno.')
  process.exit(1)
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const { error: errorAuth } = await supabase.auth.signInWithPassword({
  email: correo,
  password: contrasena,
})
if (errorAuth) {
  console.error(`No se pudo iniciar sesión: ${errorAuth.message}`)
  process.exit(1)
}

const { data: rubros, error: errorRubros } = await supabase
  .from('v_er_rubros')
  .select('*')
  .eq('anio', 2026)
if (errorRubros) {
  console.error(`Error consultando v_er_rubros: ${errorRubros.message}`)
  process.exit(1)
}

const total = (codigo: string, mes: number) =>
  (rubros ?? [])
    .filter((r) => r.codigo === codigo && r.mes === mes)
    .reduce((acc, r) => acc + Number(r.total), 0)

const meses = [...new Set((rubros ?? []).map((r) => r.mes as number))].sort((a, b) => a - b)
console.log(`Meses con datos en la base: ${meses.join(', ')}`)

const resultados: string[] = []
const fallas: { mes: number }[] = []

for (const mes of meses) {
  const ingresos = total('ING_OP', mes)
  const costo = total('COSTO_MP', mes) + total('COSTO_PER', mes) + total('COSTO_SER', mes)
  const utilidadNeta =
    ingresos -
    costo -
    total('GASTO_ADM', mes) -
    total('GASTO_VTA', mes) +
    total('ING_NOOP', mes) -
    total('GASTO_NOOP', mes)

  const refIngresos = REFERENCIAS.ingresos.get(mes)
  if (refIngresos !== undefined) {
    resultados.push(comparar(`Mes ${mes} — Total ingresos`, ingresos, refIngresos))
    if (Math.abs(ingresos - refIngresos) > TOLERANCIA) fallas.push({ mes })
  }
  const refCosto = REFERENCIAS.costo.get(mes)
  if (refCosto !== undefined) {
    resultados.push(comparar(`Mes ${mes} — Total costo`, costo, refCosto))
    if (Math.abs(costo - refCosto) > TOLERANCIA) fallas.push({ mes })
  }
  const refUtilidad = REFERENCIAS.utilidadNeta.get(mes)
  if (refUtilidad !== undefined) {
    resultados.push(comparar(`Mes ${mes} — Utilidad neta`, utilidadNeta, refUtilidad))
    if (Math.abs(utilidadNeta - refUtilidad) > TOLERANCIA) fallas.push({ mes })
  }
}

console.log('\n=== Comparación contra PLAN.md sección 8 (vistas de la base) ===')
for (const linea of resultados) console.log(linea)

// Si hay fallas: explicar el delta con las cuentas que no estaban en el seed de 98
if (fallas.length > 0) {
  const csv = readFileSync(join(raiz, 'supabase', 'catalogo_cuentas.csv'), 'utf8')
  const cuentasSeed = new Set(
    csv
      .split(/\r?\n/)
      .slice(1)
      .map((l) => l.slice(0, l.indexOf(',')))
      .filter(Boolean)
  )
  const mesesConFalla = [...new Set(fallas.map((f) => f.mes))]
  const { data: detalle, error: errorDetalle } = await supabase
    .from('v_er_detalle')
    .select('*')
    .eq('anio', 2026)
    .in('mes', mesesConFalla)
  if (errorDetalle) {
    console.error(`No se pudo consultar v_er_detalle: ${errorDetalle.message}`)
  } else {
    console.log('\n=== Cuentas en el ER que NO estaban en el catálogo semilla (explican deltas) ===')
    const nuevas = (detalle ?? []).filter((d) => !cuentasSeed.has(d.cuenta))
    if (nuevas.length === 0) {
      console.log('(ninguna — el delta viene de cuentas del seed; revisar valores mes a mes)')
    }
    for (const d of nuevas.sort((a, b) => a.cuenta.localeCompare(b.cuenta))) {
      console.log(
        `  mes ${d.mes} · ${d.rubro_codigo} · ${d.cuenta} ${d.nombre} (${d.naturaleza}): ${Number(d.valor).toFixed(2)}`
      )
    }
  }
}

await supabase.auth.signOut()
console.log('\nListo.')
