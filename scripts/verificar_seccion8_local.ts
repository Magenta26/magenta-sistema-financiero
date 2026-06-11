/**
 * Verificación LOCAL contra la sección 8 de PLAN.md:
 * parsea los .xlsx reales de SIIGO, clasifica con el catálogo semilla
 * (supabase/catalogo_cuentas.csv) y calcula las líneas del ER con las
 * mismas reglas de las vistas SQL (prefijo + signo por naturaleza).
 *
 * Uso: node scripts/verificar_seccion8_local.ts <archivo1.xlsx> [archivo2.xlsx ...]
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parsearBalanceSiigo } from '../src/lib/parserSiigo.ts'
import { comparar, REFERENCIAS } from './seccion8.ts'

interface LineaCatalogo {
  cuenta: string
  naturaleza: 'CR' | 'DB'
  rubro: string
  naturalezaRubro: 'CR' | 'DB'
}

/** Separa una línea CSV respetando comillas dobles. */
function separarCsv(linea: string): string[] {
  const campos: string[] = []
  let actual = ''
  let entreComillas = false
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i]
    if (ch === '"') entreComillas = !entreComillas
    else if (ch === ',' && !entreComillas) {
      campos.push(actual)
      actual = ''
    } else actual += ch
  }
  campos.push(actual)
  return campos
}

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const csv = readFileSync(join(raiz, 'supabase', 'catalogo_cuentas.csv'), 'utf8')
const catalogo: LineaCatalogo[] = csv
  .split(/\r?\n/)
  .slice(1)
  .filter((l) => l.trim())
  .map((linea) => {
    const [cuenta, , naturaleza, rubro_codigo, , naturaleza_rubro, incluir_er] = separarCsv(linea)
    return {
      cuenta,
      naturaleza: naturaleza as 'CR' | 'DB',
      rubro: rubro_codigo,
      naturalezaRubro: naturaleza_rubro as 'CR' | 'DB',
      incluir: incluir_er === 'true',
    }
  })
  .filter((c) => c.cuenta && (c as { incluir?: boolean }).incluir)

console.log(`Catálogo semilla: ${catalogo.length} cuentas con incluir_er`)

const archivos = process.argv.slice(2)
const resultados: string[] = []

for (const ruta of archivos) {
  const r = parsearBalanceSiigo(new Uint8Array(readFileSync(ruta)))
  if (!r.periodo) {
    console.log(`(omitido: sin período) ${ruta}`)
    continue
  }
  const mes = r.periodo.mes
  const transaccionales = r.filas.filter((f) => f.transaccional)

  // Total por rubro: igual que v_er_detalle + v_er_rubros
  const totalRubro = new Map<string, number>()
  for (const c of catalogo) {
    const valor = transaccionales
      .filter((m) => m.cuenta.startsWith(c.cuenta))
      .reduce(
        (acc, m) =>
          acc + (c.naturaleza === 'CR' ? m.mov_credito - m.mov_debito : m.mov_debito - m.mov_credito),
        0
      )
    const signo = c.naturaleza === c.naturalezaRubro ? 1 : -1
    totalRubro.set(c.rubro, (totalRubro.get(c.rubro) ?? 0) + signo * valor)
  }

  const de = (rubro: string) => totalRubro.get(rubro) ?? 0
  const ingresos = de('ING_OP')
  const totalCosto = de('COSTO_MP') + de('COSTO_PER') + de('COSTO_SER')
  const utilidadNeta =
    ingresos - totalCosto - de('GASTO_ADM') - de('GASTO_VTA') + de('ING_NOOP') - de('GASTO_NOOP')

  const esperadoIngresos = REFERENCIAS.ingresos.get(mes)
  if (esperadoIngresos !== undefined) {
    resultados.push(comparar(`Mes ${mes} — Total ingresos`, ingresos, esperadoIngresos))
  }
  const esperadoCosto = REFERENCIAS.costo.get(mes)
  if (esperadoCosto !== undefined) {
    resultados.push(comparar(`Mes ${mes} — Total costo`, totalCosto, esperadoCosto))
  }
  const esperadoUtilidad = REFERENCIAS.utilidadNeta.get(mes)
  if (esperadoUtilidad !== undefined) {
    resultados.push(comparar(`Mes ${mes} — Utilidad neta`, utilidadNeta, esperadoUtilidad))
  }
}

console.log('\n=== Comparación contra PLAN.md sección 8 (catálogo semilla, archivos locales) ===')
for (const linea of resultados.sort()) console.log(linea)
