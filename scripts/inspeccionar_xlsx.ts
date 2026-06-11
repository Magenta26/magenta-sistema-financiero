/** Utilidad: vuelca las primeras N filas de un .xlsx para inspección. */
import { readFileSync } from 'node:fs'
import { read, utils } from 'xlsx'

const [ruta, filasStr] = process.argv.slice(2)
const maxFilas = parseInt(filasStr ?? '20', 10)
const libro = read(new Uint8Array(readFileSync(ruta)), { type: 'buffer' })
console.log('Hojas:', libro.SheetNames)
const hoja = libro.Sheets[libro.SheetNames[0]]
console.log('Rango:', hoja['!ref'])
const matriz = utils.sheet_to_json<unknown[]>(hoja, { header: 1, raw: true })
matriz.slice(0, maxFilas).forEach((fila, i) => {
  console.log(`Fila ${i + 1}:`, JSON.stringify(fila))
})
