import { describe, it, expect } from 'vitest'
import { resolverReporteEmpleado, totalGeneralReporte, totalMesReporte } from './natilleraReporte'
import type { NovedadNatillera } from '../types/natillera'

function nov(p: Partial<NovedadNatillera> & Pick<NovedadNatillera, 'anio' | 'mes' | 'tipo'>): NovedadNatillera {
  return {
    id: `${p.tipo}-${p.anio}-${p.mes}`,
    empleado_id: 'e',
    valor: null,
    nota: null,
    creado_en: '2026-01-01T00:00:00Z',
    ...p,
  }
}

const HOY = { anio: 2026, mes: 12 } // diciembre: todo el año 2026 ya generado
const empleadoBase = { cuota_mensual: 50_000, fecha_ingreso: '2026-01-01', fecha_retiro: null }

describe('resolverReporteEmpleado', () => {
  it('cuota base en todos los meses cuando no hay novedades', () => {
    const r = resolverReporteEmpleado(empleadoBase, [], 0, 2026, HOY)
    expect(r.meses).toEqual(Array(12).fill(50_000))
    expect(r.cuotaVigente).toBe(50_000)
    expect(r.total).toBe(600_000)
  })

  it('cambio de cuota a mitad de año aplica desde su mes en adelante', () => {
    const novedades = [nov({ anio: 2026, mes: 7, tipo: 'cambio_cuota', valor: 80_000 })]
    const r = resolverReporteEmpleado(empleadoBase, novedades, 0, 2026, HOY)
    // ene-jun = 50.000 ; jul-dic = 80.000
    expect(r.meses.slice(0, 6)).toEqual(Array(6).fill(50_000))
    expect(r.meses.slice(6)).toEqual(Array(6).fill(80_000))
    expect(r.cuotaVigente).toBe(80_000)
    expect(r.total).toBe(50_000 * 6 + 80_000 * 6)
  })

  it("'no_aporto' pone 0 ese mes", () => {
    const novedades = [nov({ anio: 2026, mes: 3, tipo: 'no_aporto' })]
    const r = resolverReporteEmpleado(empleadoBase, novedades, 0, 2026, HOY)
    expect(r.meses[2]).toBe(0)
    expect(r.total).toBe(50_000 * 11)
  })

  it("'abono' usa el monto real de ese mes", () => {
    const novedades = [nov({ anio: 2026, mes: 4, tipo: 'abono', valor: 120_000 })]
    const r = resolverReporteEmpleado(empleadoBase, novedades, 0, 2026, HOY)
    expect(r.meses[3]).toBe(120_000)
    expect(r.total).toBe(50_000 * 11 + 120_000)
  })

  it('el retiro corta los meses siguientes (incluye el mes de retiro)', () => {
    const novedades = [nov({ anio: 2026, mes: 5, tipo: 'retiro' })]
    const r = resolverReporteEmpleado(empleadoBase, novedades, 0, 2026, HOY)
    expect(r.meses.slice(0, 5)).toEqual(Array(5).fill(50_000)) // ene-may
    expect(r.meses.slice(5)).toEqual(Array(7).fill(null)) // jun-dic vacíos
    expect(r.total).toBe(50_000 * 5)
  })

  it('mes futuro respecto a hoy queda vacío', () => {
    const hoy = { anio: 2026, mes: 6 } // hoy = junio
    const r = resolverReporteEmpleado(empleadoBase, [], 0, 2026, hoy)
    expect(r.meses.slice(0, 6)).toEqual(Array(6).fill(50_000)) // ene-jun
    expect(r.meses.slice(6)).toEqual(Array(6).fill(null)) // jul-dic futuros
    expect(r.total).toBe(50_000 * 6)
  })

  it('meses anteriores al ingreso quedan vacíos', () => {
    const emp = { ...empleadoBase, fecha_ingreso: '2026-04-01' }
    const r = resolverReporteEmpleado(emp, [], 0, 2026, HOY)
    expect(r.meses.slice(0, 3)).toEqual(Array(3).fill(null)) // ene-mar
    expect(r.meses.slice(3)).toEqual(Array(9).fill(50_000)) // abr-dic
  })

  it('total = saldo inicial + suma de meses resueltos', () => {
    const r = resolverReporteEmpleado(empleadoBase, [], 1_000_000, 2026, HOY)
    expect(r.total).toBe(1_000_000 + 600_000)
  })

  it('año futuro completo: todos los meses vacíos', () => {
    const r = resolverReporteEmpleado(empleadoBase, [], 200_000, 2027, HOY)
    expect(r.meses).toEqual(Array(12).fill(null))
    expect(r.total).toBe(200_000) // solo el saldo inicial
  })

  it('cambio_cuota de un año previo sigue vigente al año siguiente', () => {
    const novedades = [nov({ anio: 2025, mes: 6, tipo: 'cambio_cuota', valor: 70_000 })]
    const r = resolverReporteEmpleado(empleadoBase, novedades, 0, 2026, HOY)
    expect(r.meses).toEqual(Array(12).fill(70_000))
  })
})

describe('totales del reporte', () => {
  it('total por mes y total general suman los reportes', () => {
    const a = resolverReporteEmpleado(empleadoBase, [], 100_000, 2026, HOY)
    const b = resolverReporteEmpleado(
      { cuota_mensual: 30_000, fecha_ingreso: '2026-01-01', fecha_retiro: null },
      [],
      0,
      2026,
      HOY
    )
    expect(totalMesReporte([a, b], 0)).toBe(80_000) // enero: 50k + 30k
    expect(totalGeneralReporte([a, b])).toBe(100_000 + 600_000 + 360_000)
  })
})
