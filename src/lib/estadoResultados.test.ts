import { describe, it, expect } from 'vitest'
import { construirModeloEr } from './estadoResultados'
import type { ErDetalleFila, ErRubroFila } from '../types/informes'

// Helpers para armar filas mínimas del año 2026, mes 1.
const rubro = (codigo: string, total: number, orden: number): ErRubroFila => ({
  anio: 2026,
  mes: 1,
  codigo,
  nombre: codigo,
  orden,
  naturaleza: codigo.startsWith('ING') ? 'CR' : 'DB',
  total,
})

const detalle = (
  rubro_codigo: string,
  cuenta: string,
  nombre: string,
  valor: number
): ErDetalleFila => ({
  anio: 2026,
  mes: 1,
  rubro_codigo,
  cuenta,
  nombre,
  naturaleza: rubro_codigo.startsWith('ING') ? 'CR' : 'DB',
  valor,
})

// Operacional = Ingresos 1000 − Gasto ADM 300 (de los cuales 120 es depreciación).
// 513505 = Arriendo (no es D&A); 519525 = depreciación por NOMBRE (prefijo 5195
// no está en la lista, pero el nombre contiene "depreciaci" en clase 5).
const RUBROS: ErRubroFila[] = [rubro('ING_OP', 1000, 10), rubro('GASTO_ADM', 300, 50)]
const DETALLE: ErDetalleFila[] = [
  detalle('ING_OP', '41', 'Ventas', 1000),
  detalle('GASTO_ADM', '513505', 'Arriendo', 180),
  detalle('GASTO_ADM', '519525', 'DEPRECIACION EQUIPO', 120),
]

describe('construirModeloEr — EBITDA', () => {
  it('EBITDA = utilidad operacional + D&A del período', () => {
    const modelo = construirModeloEr(DETALLE, RUBROS, [], 2026)
    expect(modelo.derivadas.get('UTILIDAD_OPERACIONAL')!.valores.get(1)).toBe(700) // 1000 − 300
    expect(modelo.derivadas.get('EBITDA')!.valores.get(1)).toBe(820) // 700 + 120 depreciación
  })

  it('lista las cuentas D&A para el tooltip (solo la depreciación, no el arriendo)', () => {
    const modelo = construirModeloEr(DETALLE, RUBROS, [], 2026)
    expect(modelo.cuentasDya.map((c) => c.cuenta)).toEqual(['519525'])
  })

  it('sin cuentas D&A: EBITDA = utilidad operacional', () => {
    const det: ErDetalleFila[] = [
      detalle('ING_OP', '41', 'Ventas', 1000),
      detalle('GASTO_ADM', '513505', 'Arriendo', 300),
    ]
    const modelo = construirModeloEr(det, RUBROS, [], 2026)
    expect(modelo.cuentasDya).toEqual([])
    expect(modelo.derivadas.get('EBITDA')!.valores.get(1)).toBe(700)
    expect(modelo.derivadas.get('UTILIDAD_OPERACIONAL')!.valores.get(1)).toBe(700)
  })

  it('reconoce D&A por prefijo PUC (5160) aunque el nombre no lo diga', () => {
    const rubros: ErRubroFila[] = [rubro('ING_OP', 1000, 10), rubro('GASTO_ADM', 200, 50)]
    const det: ErDetalleFila[] = [
      detalle('ING_OP', '41', 'Ventas', 1000),
      detalle('GASTO_ADM', '51600501', 'GTO DE MAQUINARIA Y EQUIPO', 200),
    ]
    const modelo = construirModeloEr(det, rubros, [], 2026)
    expect(modelo.cuentasDya.map((c) => c.cuenta)).toEqual(['51600501'])
    expect(modelo.derivadas.get('EBITDA')!.valores.get(1)).toBe(1000) // (1000−200) + 200
  })
})
