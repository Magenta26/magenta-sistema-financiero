import { describe, it, expect } from 'vitest'
import {
  indexarAportes,
  totalAhorradoEmpleado,
  totalDelMes,
  totalGeneral,
  aniosNatillera,
  anioNatilleraPorDefecto,
} from './natillera'
import type { AporteNatillera } from '../types/natillera'

function aporte(empleado_id: string, mes: number, monto: number, anio = 2026): AporteNatillera {
  return { id: `${empleado_id}-${anio}-${mes}`, empleado_id, anio, mes, monto }
}

describe('indexarAportes / total ahorrado', () => {
  const aportes: AporteNatillera[] = [
    aporte('a', 1, 50_000),
    aporte('a', 2, 50_000),
    aporte('a', 3, 30_000),
    aporte('b', 1, 100_000),
    aporte('b', 2, 0),
    // De otro año: no debe contarse
    aporte('a', 1, 999_999, 2025),
  ]

  it('el total ahorrado de un empleado es la suma de sus aportes del año', () => {
    const indice = indexarAportes(aportes, 2026)
    expect(totalAhorradoEmpleado(indice.get('a'))).toBe(130_000)
    expect(totalAhorradoEmpleado(indice.get('b'))).toBe(100_000)
  })

  it('empleado sin aportes → 0', () => {
    const indice = indexarAportes(aportes, 2026)
    expect(totalAhorradoEmpleado(indice.get('c'))).toBe(0)
  })

  it('total por mes suma a todos los empleados', () => {
    const indice = indexarAportes(aportes, 2026)
    expect(totalDelMes(indice, 1)).toBe(150_000)
    expect(totalDelMes(indice, 2)).toBe(50_000)
    expect(totalDelMes(indice, 3)).toBe(30_000)
    expect(totalDelMes(indice, 4)).toBe(0)
  })

  it('total general = suma de todos los aportes del año', () => {
    const indice = indexarAportes(aportes, 2026)
    expect(totalGeneral(indice)).toBe(230_000)
  })
})

describe('aniosNatillera', () => {
  it('incluye los años con datos y SIEMPRE el año en curso, de mayor a menor', () => {
    const aportes = [{ anio: 2025 }, { anio: 2024 }, { anio: 2025 }]
    expect(aniosNatillera(aportes, 2026)).toEqual([2026, 2025, 2024])
  })

  it('sin aportes, devuelve solo el año en curso', () => {
    expect(aniosNatillera([], 2026)).toEqual([2026])
  })

  it('no duplica el año en curso si ya tiene datos', () => {
    expect(aniosNatillera([{ anio: 2026 }], 2026)).toEqual([2026])
  })
})

describe('anioNatilleraPorDefecto', () => {
  const disp = [2026, 2025]
  it('usa la elección si está disponible', () => {
    expect(anioNatilleraPorDefecto(2025, disp, 2026)).toBe(2025)
  })
  it('cae al preferido si la elección no está', () => {
    expect(anioNatilleraPorDefecto(2024, disp, 2026)).toBe(2026)
  })
  it('sin elección ni preferido válido, el más reciente', () => {
    expect(anioNatilleraPorDefecto(null, disp, 2030)).toBe(2026)
  })
  it('sin disponibles → null', () => {
    expect(anioNatilleraPorDefecto(2026, [], 2026)).toBeNull()
  })
})
