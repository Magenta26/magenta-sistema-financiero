import { describe, expect, it } from 'vitest'
import { utils, write } from 'xlsx'
import { normalizar, parsearBalanceSiigo } from './parserSiigo'

/** Construye un .xlsx en memoria a partir de una matriz de celdas. */
function xlsxDesdeMatriz(matriz: unknown[][]): ArrayBuffer {
  const hoja = utils.aoa_to_sheet(matriz)
  const libro = utils.book_new()
  utils.book_append_sheet(libro, hoja, 'Hoja1')
  return write(libro, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

const ENCABEZADOS_CON_CONTROL = [
  'Control',
  'Nivel',
  'Transaccional',
  'Código cuenta contable',
  'Nombre cuenta contable',
  'Saldo inicial',
  'Movimiento débito',
  'Movimiento crédito',
  'Saldo final',
]

const ENCABEZADOS_SIN_CONTROL = ENCABEZADOS_CON_CONTROL.slice(1)

describe('normalizar', () => {
  it('quita tildes, mayúsculas y espacios repetidos', () => {
    expect(normalizar('  Código   Cuenta  Contable ')).toBe('codigo cuenta contable')
    expect(normalizar('Sí')).toBe('si')
    expect(normalizar('Movimiento DÉBITO')).toBe('movimiento debito')
  })
})

describe('parsearBalanceSiigo', () => {
  it('formato Ene-Abr: columna Control y período en B5', () => {
    const datos = xlsxDesdeMatriz([
      [],
      ['', 'Balance de prueba general'],
      ['', 'MAGENTA FARMS S.A.S'],
      ['', '901479899-9'],
      ['', 'De Enero 2026 a Enero 2026'], // B5
      [],
      [],
      ENCABEZADOS_CON_CONTROL, // fila 8
      ['x', 'Clase', 'No', '4', 'INGRESOS', 0, 0, 180000000, -180000000],
      ['x', 'Auxiliar', 'Sí', '41052501', 'VENTAS EXPORTACIONES', 0, 0, 180000000, -180000000],
      ['x', 'Auxiliar', 'Si', '11050501', 'CAJA GENERAL', 1000.5, 200, 100, 1100.5],
      ['x', '', '', '', '', '', '', '', ''], // sin código: se ignora
    ])

    const r = parsearBalanceSiigo(datos)
    expect(r.encabezadosFaltantes).toEqual([])
    expect(r.periodo).toEqual({ anio: 2026, mes: 1 })
    expect(r.filas).toHaveLength(3)

    const clase = r.filas[0]
    expect(clase.cuenta).toBe('4')
    expect(clase.nivel).toBe('Clase')
    expect(clase.transaccional).toBe(false)
    expect(clase.saldo_final).toBe(-180000000)

    const auxiliar = r.filas[1]
    expect(auxiliar.cuenta).toBe('41052501')
    expect(auxiliar.nivel).toBe('Auxiliar')
    expect(auxiliar.transaccional).toBe(true) // "Sí"
    expect(auxiliar.clase).toBe('4')
    expect(auxiliar.mov_credito).toBe(180000000)

    expect(r.filas[2].transaccional).toBe(true) // "Si" sin tilde
    expect(r.filas[2].saldo_inicial).toBe(1000.5)
  })

  it('formato Mayo: sin columna Control y período en A5', () => {
    const datos = xlsxDesdeMatriz([
      [],
      ['Balance de prueba general'],
      ['MAGENTA FARMS S.A.S'],
      ['901479899-9'],
      ['de MAYO de 2026 a MAYO de 2026'], // A5, con "de" intermedio y mayúsculas
      [],
      [],
      ENCABEZADOS_SIN_CONTROL, // fila 8, sin Control
      ['Auxiliar', 'Sí', '41052501', 'VENTAS EXPORTACIONES', 0, 0, 258299361.58, -258299361.58],
      ['Auxiliar', 'Sí', '00012345', 'CODIGO CON CEROS', 0, 10, 0, 10],
    ])

    const r = parsearBalanceSiigo(datos)
    expect(r.encabezadosFaltantes).toEqual([])
    expect(r.periodo).toEqual({ anio: 2026, mes: 5 })
    expect(r.filas).toHaveLength(2)
    expect(r.filas[0].mov_credito).toBeCloseTo(258299361.58, 2)
    expect(r.filas[1].cuenta).toBe('00012345') // preserva ceros a la izquierda
  })

  it('sin fila de período: periodo null pero filas parseadas', () => {
    const datos = xlsxDesdeMatriz([
      ['Balance de prueba general'],
      ['MAGENTA FARMS S.A.S'],
      ENCABEZADOS_SIN_CONTROL,
      ['Auxiliar', 'Sí', '51959504', 'OTROS', 0, 500, 0, 500],
    ])

    const r = parsearBalanceSiigo(datos)
    expect(r.periodo).toBeNull()
    expect(r.encabezadosFaltantes).toEqual([])
    expect(r.filas).toHaveLength(1)
  })

  it('rango de más de un mes: periodo null (selección manual)', () => {
    const datos = xlsxDesdeMatriz([
      ['De Enero 2026 a Mayo 2026'],
      ENCABEZADOS_SIN_CONTROL,
      ['Auxiliar', 'Sí', '51959504', 'OTROS', 0, 500, 0, 500],
    ])

    expect(parsearBalanceSiigo(datos).periodo).toBeNull()
  })

  it('encabezado requerido ausente: lo reporta por nombre', () => {
    const sinSaldoFinal = ENCABEZADOS_SIN_CONTROL.slice(0, -1)
    const datos = xlsxDesdeMatriz([
      ['De Enero 2026 a Enero 2026'],
      sinSaldoFinal,
      ['Auxiliar', 'Sí', '51959504', 'OTROS', 0, 500, 0],
    ])

    const r = parsearBalanceSiigo(datos)
    expect(r.encabezadosFaltantes).toEqual(['Saldo final'])
    expect(r.filas).toEqual([])
  })
})
