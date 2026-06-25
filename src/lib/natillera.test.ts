import { describe, it, expect } from 'vitest'
import {
  siguienteCodigoEmpleado,
  siguienteCodigoExterno,
  aniosNatillera,
  anioNatilleraPorDefecto,
  saldoInicialDe,
} from './natillera'

describe('siguienteCodigoEmpleado', () => {
  it('sin códigos previos arranca en EMP-001', () => {
    expect(siguienteCodigoEmpleado([])).toBe('EMP-001')
    expect(siguienteCodigoEmpleado([null, undefined, ''])).toBe('EMP-001')
  })
  it('toma el mayor EMP-### y suma 1', () => {
    expect(siguienteCodigoEmpleado(['EMP-001', 'EMP-007', 'EMP-003'])).toBe('EMP-008')
  })
  it('ignora formatos que no calzan con EMP-###', () => {
    expect(siguienteCodigoEmpleado(['ABC', 'EMP-002', 'X-9'])).toBe('EMP-003')
  })
  it('conserva al menos 3 dígitos pero crece si hace falta', () => {
    expect(siguienteCodigoEmpleado(['EMP-999'])).toBe('EMP-1000')
  })
})

describe('siguienteCodigoExterno', () => {
  it('sin códigos previos arranca en EXT-001', () => {
    expect(siguienteCodigoExterno([])).toBe('EXT-001')
  })
  it('toma el mayor EXT-### y suma 1, ignorando los EMP-###', () => {
    expect(siguienteCodigoExterno(['EMP-009', 'EXT-002', 'EXT-005'])).toBe('EXT-006')
  })
})

describe('aniosNatillera', () => {
  it('siempre incluye el año en curso, más años de ingreso/retiro/novedades/saldos, desc', () => {
    const empleados = [
      { fecha_ingreso: '2024-03-01', fecha_retiro: null },
      { fecha_ingreso: '2025-01-01', fecha_retiro: '2025-09-01' },
    ]
    const novedades = [{ anio: 2025 }]
    const saldos = [{ anio: 2023 }]
    expect(aniosNatillera(empleados, novedades, saldos, 2026)).toEqual([2026, 2025, 2024, 2023])
  })
  it('sin datos, solo el año en curso', () => {
    expect(aniosNatillera([], [], [], 2026)).toEqual([2026])
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

describe('saldoInicialDe', () => {
  it('lee por (empleado, año); 0 si no hay', () => {
    const m = new Map<string, number>([['a:2026', 500_000]])
    expect(saldoInicialDe(m, 'a', 2026)).toBe(500_000)
    expect(saldoInicialDe(m, 'a', 2025)).toBe(0)
    expect(saldoInicialDe(m, 'b', 2026)).toBe(0)
  })
})
