import { describe, expect, it } from 'vitest'
import { construirModeloEr } from './estadoResultados'
import {
  calcularKpis,
  construirSeries,
  lecturaDelMes,
  mesAnteriorConDatos,
  topVariaciones,
  utilidadNetaAcumulada,
} from './analisis'
import type { ErDetalleFila, ErRubroFila } from '../types/informes'

const rubro = (codigo: string, mes: number, total: number, orden: number, naturaleza: 'CR' | 'DB'): ErRubroFila => ({
  anio: 2026,
  mes,
  codigo,
  nombre: codigo,
  orden,
  naturaleza,
  total,
})

// Dos meses: ingresos 1000 -> 2000; costos estables; gasto admin sube fuerte.
const RUBROS: ErRubroFila[] = [
  rubro('ING_OP', 1, 1000, 10, 'CR'),
  rubro('ING_OP', 2, 2000, 10, 'CR'),
  rubro('COSTO_MP', 1, 400, 20, 'DB'),
  rubro('COSTO_MP', 2, 400, 20, 'DB'),
  rubro('GASTO_ADM', 1, 100, 50, 'DB'),
  rubro('GASTO_ADM', 2, 600, 50, 'DB'),
]

const DETALLE: ErDetalleFila[] = [
  { rubro_codigo: 'ING_OP', cuenta: '41052501', nombre: 'VENTAS', naturaleza: 'CR', anio: 2026, mes: 1, valor: 1000 },
  { rubro_codigo: 'ING_OP', cuenta: '41052501', nombre: 'VENTAS', naturaleza: 'CR', anio: 2026, mes: 2, valor: 2000 },
  { rubro_codigo: 'GASTO_ADM', cuenta: '5105', nombre: 'PERSONAL ADMIN', naturaleza: 'DB', anio: 2026, mes: 1, valor: 100 },
  { rubro_codigo: 'GASTO_ADM', cuenta: '5105', nombre: 'PERSONAL ADMIN', naturaleza: 'DB', anio: 2026, mes: 2, valor: 600 },
]

const modelo = construirModeloEr(DETALLE, RUBROS, [], 2026)

describe('construirSeries', () => {
  it('arma ingresos, costos+gastos y márgenes por mes', () => {
    const series = construirSeries(modelo)
    expect(series).toHaveLength(2)
    expect(series[0]).toMatchObject({ mes: 1, ingresos: 1000, costosGastos: 500, utilidadNeta: 500 })
    expect(series[0].margenNeto).toBeCloseTo(50)
    expect(series[1].margenNeto).toBeCloseTo(50) // (2000-400-600)/2000
  })
})

describe('calcularKpis', () => {
  it('calcula valor, margen y variaciones', () => {
    const kpis = calcularKpis(modelo, 2)
    const ingresos = kpis.find((k) => k.clave === 'TOTAL_INGRESOS')!
    expect(ingresos.valor).toBe(2000)
    expect(ingresos.varMesAnterior).toBeCloseTo(100) // 1000 -> 2000
    expect(ingresos.varPromedio).toBeCloseTo(33.333, 2) // promedio 1500

    const neta = kpis.find((k) => k.clave === 'UTILIDAD_NETA')!
    expect(neta.valor).toBe(1000) // 2000-400-600
    expect(neta.margen).toBeCloseTo(50)
  })

  it('primer mes: sin variación vs anterior', () => {
    const kpis = calcularKpis(modelo, 1)
    expect(kpis[0].varMesAnterior).toBeNull()
    expect(mesAnteriorConDatos(modelo, 1)).toBeNull()
  })
})

describe('utilidadNetaAcumulada', () => {
  it('acumula hasta el mes indicado', () => {
    expect(utilidadNetaAcumulada(modelo, 1)).toBe(500)
    expect(utilidadNetaAcumulada(modelo, 2)).toBe(1500)
  })
})

describe('topVariaciones', () => {
  it('ordena por cambio absoluto y trae datos de la cuenta', () => {
    const top = topVariaciones(modelo, 2)
    expect(top[0]).toMatchObject({ cuenta: '41052501', delta: 1000 })
    expect(top[1]).toMatchObject({ cuenta: '5105', delta: 500 })
  })

  it('sin mes anterior devuelve vacío', () => {
    expect(topVariaciones(modelo, 1)).toEqual([])
  })
})

describe('lecturaDelMes', () => {
  it('genera frases coherentes para el mejor mes', () => {
    const frases = lecturaDelMes(modelo, 2)
    expect(frases.length).toBeGreaterThanOrEqual(3)
    expect(frases.length).toBeLessThanOrEqual(5)
    expect(frases[0]).toContain('mejor mes del año en ingresos')
    expect(frases.join(' ')).toContain('41052501')
  })

  it('para el primer mes omite comparaciones sin base', () => {
    const frases = lecturaDelMes(modelo, 1)
    expect(frases[0]).toContain('más bajo')
    expect(frases.join(' ')).not.toContain('frente a')
  })
})
