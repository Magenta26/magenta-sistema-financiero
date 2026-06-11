/**
 * Utilidad de verificación: corre el parser sobre archivos .xlsx reales de SIIGO
 * y reporta período detectado, conteos y total de ingresos (grupo 41 crudo).
 *
 * Uso: node scripts/verificar_parser.ts <archivo1.xlsx> [archivo2.xlsx ...]
 */
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { parsearBalanceSiigo } from '../src/lib/parserSiigo.ts'
import { nombreMes } from '../src/types/balance.ts'

const archivos = process.argv.slice(2)
if (archivos.length === 0) {
  console.error('Uso: node scripts/verificar_parser.ts <archivo.xlsx> ...')
  process.exit(1)
}

for (const ruta of archivos) {
  const datos = new Uint8Array(readFileSync(ruta))
  const r = parsearBalanceSiigo(datos)
  const transaccionales = r.filas.filter((f) => f.transaccional)
  // Total ingresos = agregado crudo del grupo 41 (CR): créditos - débitos
  const ingresos = transaccionales
    .filter((f) => f.cuenta.startsWith('41'))
    .reduce((acc, f) => acc + f.mov_credito - f.mov_debito, 0)
  const porClase = new Map<string, number>()
  for (const f of transaccionales) {
    porClase.set(f.clase, (porClase.get(f.clase) ?? 0) + 1)
  }

  console.log(
    JSON.stringify({
      archivo: basename(ruta),
      periodo: r.periodo ? `${nombreMes(r.periodo.mes)} ${r.periodo.anio}` : null,
      encabezadosFaltantes: r.encabezadosFaltantes,
      filas: r.filas.length,
      transaccionales: transaccionales.length,
      clases: Object.fromEntries([...porClase.entries()].sort()),
      total_ingresos_grupo41: Math.round(ingresos * 100) / 100,
    })
  )
}
