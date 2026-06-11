import { read, utils } from 'xlsx'
import type { WorkSheet } from 'xlsx'
import type { FilaBalance, Periodo, ResultadoParser } from '../types/balance'

/**
 * Parser del balance de prueba de SIIGO (PLAN.md sección 3).
 * Regla de oro: detectar columnas por NOMBRE de encabezado, jamás por posición.
 */

/** Normaliza texto: minúsculas, sin tildes, espacios colapsados. */
export function normalizar(texto: unknown): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes/diacríticos
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Encabezados requeridos: nombre normalizado -> nombre legible para errores. */
const ENCABEZADOS_REQUERIDOS: Record<string, string> = {
  nivel: 'Nivel',
  transaccional: 'Transaccional',
  'codigo cuenta contable': 'Código cuenta contable',
  'nombre cuenta contable': 'Nombre cuenta contable',
  'saldo inicial': 'Saldo inicial',
  'movimiento debito': 'Movimiento débito',
  'movimiento credito': 'Movimiento crédito',
  'saldo final': 'Saldo final',
}

const MESES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
}

/** Convierte un valor de celda a número. Vacío -> 0. Soporta formato es-CO ("1.234.567,89"). */
function aNumero(valor: unknown): number {
  if (valor === null || valor === undefined || valor === '') return 0
  if (typeof valor === 'number') return valor
  const texto = String(valor).trim()
  if (!texto) return 0
  let limpio = texto.replace(/\s/g, '').replace(/\$/g, '')
  if (limpio.includes(',')) {
    // formato es-CO: puntos de miles, coma decimal
    limpio = limpio.replace(/\./g, '').replace(',', '.')
  }
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : 0
}

/** Valor de celda como texto, preservando el formato visible (clave para códigos de cuenta). */
function textoCelda(hoja: WorkSheet, fila: number, col: number): string {
  const celda = hoja[utils.encode_cell({ r: fila, c: col })]
  if (!celda) return ''
  if (celda.w !== undefined) return String(celda.w).trim()
  return String(celda.v ?? '').trim()
}

function valorCelda(hoja: WorkSheet, fila: number, col: number): unknown {
  const celda = hoja[utils.encode_cell({ r: fila, c: col })]
  return celda ? celda.v : undefined
}

/**
 * Los exports de SIIGO suelen declarar una <dimension> errónea (solo columna A)
 * dentro del XML; SheetJS la respeta y "esconde" el resto de columnas.
 * Recalcula el rango real a partir de las celdas que de verdad existen.
 */
function corregirRango(hoja: WorkSheet): void {
  let rango: { s: { r: number; c: number }; e: { r: number; c: number } } | null = null
  for (const clave of Object.keys(hoja)) {
    if (clave.startsWith('!')) continue
    const celda = utils.decode_cell(clave)
    if (!rango) {
      rango = { s: { ...celda }, e: { ...celda } }
    } else {
      rango.s.r = Math.min(rango.s.r, celda.r)
      rango.s.c = Math.min(rango.s.c, celda.c)
      rango.e.r = Math.max(rango.e.r, celda.r)
      rango.e.c = Math.max(rango.e.c, celda.c)
    }
  }
  if (rango) hoja['!ref'] = utils.encode_range(rango)
}

/** Deriva el nivel jerárquico desde la longitud del código (PLAN.md sección 3). */
export function derivarNivel(cuenta: string): string {
  switch (cuenta.length) {
    case 1:
      return 'Clase'
    case 2:
      return 'Grupo'
    case 4:
      return 'Cuenta'
    case 6:
      return 'Subcuenta'
    case 8:
      return 'Auxiliar'
    default:
      return 'Otro'
  }
}

/**
 * Busca el período "De {Mes} {Año} a {Mes} {Año}" en las primeras `maxFilas` filas,
 * en cualquier columna. Insensible a mayúsculas y tildes.
 * Devuelve null si no aparece o si el rango cubre más de un mes.
 */
function detectarPeriodo(hoja: WorkSheet, maxFilas: number): Periodo | null {
  const rango = hoja['!ref'] ? utils.decode_range(hoja['!ref']) : null
  if (!rango) return null
  const patron = /de\s+([a-z]+)\s+(?:de\s+)?(\d{4})\s+a\s+([a-z]+)\s+(?:de\s+)?(\d{4})/
  for (let f = 0; f < Math.min(maxFilas, rango.e.r + 1); f++) {
    for (let c = rango.s.c; c <= rango.e.c; c++) {
      const texto = normalizar(valorCelda(hoja, f, c))
      if (!texto) continue
      const m = patron.exec(texto)
      if (!m) continue
      const mes1 = MESES[m[1]]
      const anio1 = parseInt(m[2], 10)
      const mes2 = MESES[m[3]]
      const anio2 = parseInt(m[4], 10)
      if (!mes1 || !mes2) continue
      if (mes1 !== mes2 || anio1 !== anio2) return null // rango de varios meses: selección manual
      return { anio: anio1, mes: mes1 }
    }
  }
  return null
}

/**
 * Localiza la fila de encabezados escaneando las primeras `maxFilas` filas
 * hasta encontrar una que contenga "Código cuenta contable".
 * Devuelve la fila y el mapa columna-por-nombre, o null si no aparece.
 */
function localizarEncabezados(
  hoja: WorkSheet,
  maxFilas: number
): { fila: number; columnas: Record<string, number> } | null {
  const rango = hoja['!ref'] ? utils.decode_range(hoja['!ref']) : null
  if (!rango) return null
  for (let f = 0; f < Math.min(maxFilas, rango.e.r + 1); f++) {
    const columnas: Record<string, number> = {}
    for (let c = rango.s.c; c <= rango.e.c; c++) {
      const nombre = normalizar(valorCelda(hoja, f, c))
      if (nombre && columnas[nombre] === undefined) columnas[nombre] = c
    }
    if (columnas['codigo cuenta contable'] !== undefined) {
      return { fila: f, columnas }
    }
  }
  return null
}

/** Parsea el .xlsx completo. No lanza por encabezados faltantes: los reporta en el resultado. */
export function parsearBalanceSiigo(datos: ArrayBuffer | Uint8Array): ResultadoParser {
  const libro = read(datos, { type: datos instanceof Uint8Array ? 'buffer' : 'array' })
  const hoja = libro.Sheets[libro.SheetNames[0]]
  if (hoja) corregirRango(hoja)
  if (!hoja) {
    return {
      periodo: null,
      filas: [],
      encabezadosFaltantes: Object.values(ENCABEZADOS_REQUERIDOS),
    }
  }

  const periodo = detectarPeriodo(hoja, 8)

  const encabezados = localizarEncabezados(hoja, 15)
  if (!encabezados) {
    return { periodo, filas: [], encabezadosFaltantes: Object.values(ENCABEZADOS_REQUERIDOS) }
  }

  const faltantes = Object.entries(ENCABEZADOS_REQUERIDOS)
    .filter(([clave]) => encabezados.columnas[clave] === undefined)
    .map(([, legible]) => legible)
  if (faltantes.length > 0) {
    return { periodo, filas: [], encabezadosFaltantes: faltantes }
  }

  const col = (clave: string) => encabezados.columnas[clave]
  const rango = utils.decode_range(hoja['!ref']!)
  const filas: FilaBalance[] = []

  for (let f = encabezados.fila + 1; f <= rango.e.r; f++) {
    const cuenta = textoCelda(hoja, f, col('codigo cuenta contable'))
    if (!cuenta) continue // filas sin código se ignoran (vacías, totales, pie)

    const transaccional = normalizar(valorCelda(hoja, f, col('transaccional'))) === 'si'
    const nivelColumna = textoCelda(hoja, f, col('nivel'))
    const nivelDerivado = derivarNivel(cuenta)

    filas.push({
      nivel: nivelDerivado !== 'Otro' ? nivelDerivado : nivelColumna || 'Otro',
      transaccional,
      cuenta,
      nombre_cuenta: textoCelda(hoja, f, col('nombre cuenta contable')),
      saldo_inicial: aNumero(valorCelda(hoja, f, col('saldo inicial'))),
      mov_debito: aNumero(valorCelda(hoja, f, col('movimiento debito'))),
      mov_credito: aNumero(valorCelda(hoja, f, col('movimiento credito'))),
      saldo_final: aNumero(valorCelda(hoja, f, col('saldo final'))),
      clase: cuenta[0],
    })
  }

  return { periodo, filas, encabezadosFaltantes: [] }
}
