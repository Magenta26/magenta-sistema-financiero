import { describe, expect, it } from 'vitest'
import {
  calcularKpis,
  construirModeloAnalisis,
  construirPeriodos,
  cuentasDepreciacionAmortizacion,
  derivadosPeriodo,
  lecturaDelPeriodo,
  topVariaciones,
} from './analisis'
import type { ErDetalleFila, ErRubroFila } from '../types/informes'

const rubro = (
  anio: number,
  mes: number,
  codigo: string,
  total: number,
  orden = 10,
  naturaleza: 'CR' | 'DB' = 'DB'
): ErRubroFila => ({ anio, mes, codigo, nombre: codigo, orden, naturaleza, total })

const det = (
  anio: number,
  mes: number,
  cuenta: string,
  nombre: string,
  rubro_codigo: string,
  valor: number,
  naturaleza: 'CR' | 'DB' = 'DB'
): ErDetalleFila => ({ rubro_codigo, cuenta, nombre, naturaleza, anio, mes, valor })

// Datos en dos años: 2025 completo en Q4 (oct-dic), 2026 ene-may.
const RUBROS: ErRubroFila[] = [
  rubro(2025, 10, 'ING_OP', 900, 10, 'CR'),
  rubro(2025, 11, 'ING_OP', 950, 10, 'CR'),
  rubro(2025, 12, 'ING_OP', 1150, 10, 'CR'),
  rubro(2026, 1, 'ING_OP', 1000, 10, 'CR'),
  rubro(2026, 2, 'ING_OP', 1200, 10, 'CR'),
  rubro(2026, 3, 'ING_OP', 800, 10, 'CR'),
  rubro(2026, 4, 'ING_OP', 1500, 10, 'CR'),
  rubro(2026, 5, 'ING_OP', 2000, 10, 'CR'),
  rubro(2026, 1, 'COSTO_MP', 400, 20),
  rubro(2026, 2, 'COSTO_MP', 500, 20),
  rubro(2026, 1, 'GASTO_ADM', 200, 50),
  rubro(2026, 2, 'GASTO_ADM', 250, 50),
  rubro(2026, 1, 'GASTO_VTA', 50, 60),
  rubro(2026, 2, 'GASTO_VTA', 60, 60),
]

const DETALLE: ErDetalleFila[] = [
  det(2026, 1, '41052501', 'VENTAS EXPORTACIONES', 'ING_OP', 1000, 'CR'),
  det(2026, 2, '41052501', 'VENTAS EXPORTACIONES', 'ING_OP', 1200, 'CR'),
  det(2026, 1, '51601005', 'GTO DE MAQUINARIA Y EQUIPO', 'GASTO_ADM', 80),
  det(2026, 2, '51601005', 'GTO DE MAQUINARIA Y EQUIPO', 'GASTO_ADM', 90),
  det(2026, 1, '52050101', 'SUELDOS VENTAS', 'GASTO_VTA', 50),
  det(2026, 2, '52050101', 'SUELDOS VENTAS', 'GASTO_VTA', 60),
  det(2026, 2, '73600101', 'DEPRECIACIÓN CULTIVOS', 'COSTO_SER', 30),
]

describe('construirPeriodos', () => {
  const meses = [
    { anio: 2025, mes: 10 },
    { anio: 2025, mes: 11 },
    { anio: 2025, mes: 12 },
    { anio: 2026, mes: 1 },
    { anio: 2026, mes: 2 },
    { anio: 2026, mes: 3 },
    { anio: 2026, mes: 4 },
    { anio: 2026, mes: 5 },
  ]

  it('mensual: solo el año actual, un período por mes', () => {
    const periodos = construirPeriodos(meses, 'mensual')
    expect(periodos).toHaveLength(5)
    expect(periodos[0].clave).toBe('2026-01')
    expect(periodos.every((p) => !p.parcial)).toBe(true)
  })

  it('trimestral: últimos 2 años, marca trimestres parciales', () => {
    const periodos = construirPeriodos(meses, 'trimestral')
    expect(periodos.map((p) => p.clave)).toEqual(['2025-Q4', '2026-Q1', '2026-Q2'])
    const q4 = periodos[0]
    expect(q4.parcial).toBe(false) // oct, nov, dic completos
    const q2 = periodos[2]
    expect(q2.parcial).toBe(true) // solo abr y may
    expect(q2.etiquetaEje).toContain('*')
  })

  it('anual: últimos 5 años, año incompleto marcado parcial', () => {
    const periodos = construirPeriodos(meses, 'anual')
    expect(periodos.map((p) => p.clave)).toEqual(['2025', '2026'])
    expect(periodos[0].parcial).toBe(true) // 2025 solo tiene 3 meses
    expect(periodos[1].parcial).toBe(true)
  })
})

describe('construirModeloAnalisis + derivados', () => {
  const modelo = construirModeloAnalisis(DETALLE, RUBROS, 'trimestral')
  const dya = cuentasDepreciacionAmortizacion(modelo.cuentasInfo)

  it('agrega rubros por trimestre', () => {
    const q1 = modelo.valores.get('2026-Q1')!
    expect(q1.rubros.get('ING_OP')).toBe(3000) // 1000+1200+800
    expect(q1.rubros.get('COSTO_MP')).toBe(900)
    expect(q1.rubros.get('GASTO_ADM')).toBe(450)
  })

  it('identifica D&A por prefijo PUC y por nombre en clases 5 y 7', () => {
    expect(dya.has('51601005')).toBe(true) // prefijo 5160
    expect(dya.has('73600101')).toBe(true) // prefijo 7360 y nombre "DEPRECIACIÓN"
    expect(dya.has('52050101')).toBe(false)
  })

  it('EBITDA = utilidad operacional + D&A; total gastos = ADM + VTA', () => {
    const d = derivadosPeriodo(modelo, '2026-Q1', dya)
    // UO = 3000 - 900 - (450 + 110) = 1540 ; D&A Q1 = 80 + 30(feb) -> 51601005: 80+90=170, 73600101: 30
    expect(d.totalGastos).toBe(560)
    expect(d.utilidadOperacional).toBe(1540)
    expect(d.dya).toBe(200) // 80 + 90 + 30
    expect(d.ebitda).toBe(1740)
    expect(d.margenEbitda).toBeCloseTo(58, 0)
  })
})

describe('calcularKpis', () => {
  const modelo = construirModeloAnalisis(DETALLE, RUBROS, 'mensual')
  const dya = cuentasDepreciacionAmortizacion(modelo.cuentasInfo)

  it('entrega exactamente 5 tarjetas con gastos en color invertido', () => {
    const kpis = calcularKpis(modelo, '2026-02', dya)
    expect(kpis.map((k) => k.clave)).toEqual([
      'INGRESOS',
      'UTILIDAD_BRUTA',
      'TOTAL_GASTOS',
      'UTILIDAD_NETA',
      'EBITDA',
    ])
    const gastos = kpis.find((k) => k.clave === 'TOTAL_GASTOS')!
    expect(gastos.invertirColor).toBe(true)
    expect(gastos.valor).toBe(310) // 250+60
    const ingresos = kpis[0]
    expect(ingresos.varAnterior).toBeCloseTo(20) // 1000 -> 1200
  })

  it('primer período sin variación vs anterior', () => {
    const kpis = calcularKpis(modelo, '2026-01', dya)
    expect(kpis[0].varAnterior).toBeNull()
  })
})

describe('topVariaciones y lectura por período', () => {
  const modelo = construirModeloAnalisis(DETALLE, RUBROS, 'mensual')
  const dya = cuentasDepreciacionAmortizacion(modelo.cuentasInfo)

  it('top variaciones compara contra el período anterior', () => {
    const top = topVariaciones(modelo, '2026-02')
    expect(top[0]).toMatchObject({ cuenta: '41052501', delta: 200 })
    expect(topVariaciones(modelo, '2026-01')).toEqual([])
  })

  it('lectura trimestral compara Q vs Q anterior', () => {
    const modeloQ = construirModeloAnalisis(DETALLE, RUBROS, 'trimestral')
    const frases = lecturaDelPeriodo(modeloQ, '2026-Q2', dya)
    expect(frases[0]).toContain('trimestre')
    expect(frases.join(' ')).toContain('Q1 2026')
  })

  it('lectura anual compara año vs año anterior y marca parciales', () => {
    const modeloA = construirModeloAnalisis(DETALLE, RUBROS, 'anual')
    const frases = lecturaDelPeriodo(modeloA, '2026', dya)
    expect(frases[0]).toContain('año')
    expect(frases[0]).toContain('parcial')
  })
})
