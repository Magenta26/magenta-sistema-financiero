import { describe, it, expect } from 'vitest'
import { aniosConDatos, anioPorDefecto } from './anios'

describe('aniosConDatos', () => {
  it('devuelve años distintos, de mayor a menor', () => {
    const filas = [{ anio: 2026 }, { anio: 2025 }, { anio: 2026 }, { anio: 2025 }]
    expect(aniosConDatos(filas)).toEqual([2026, 2025])
  })

  it('lista vacía → []', () => {
    expect(aniosConDatos([])).toEqual([])
  })
})

describe('anioPorDefecto', () => {
  const disp = [2026, 2025]

  it('usa la elección del usuario si tiene datos', () => {
    expect(anioPorDefecto(2025, disp, 2026)).toBe(2025)
  })

  it('si la elección no tiene datos, cae al preferido (periodo_actual)', () => {
    expect(anioPorDefecto(2024, disp, 2026)).toBe(2026)
  })

  it('sin elección, usa el preferido si tiene datos', () => {
    expect(anioPorDefecto(null, disp, 2025)).toBe(2025)
  })

  it('sin elección ni preferido válido, usa el más reciente', () => {
    expect(anioPorDefecto(null, disp, 2030)).toBe(2026)
  })

  it('sin años disponibles → null', () => {
    expect(anioPorDefecto(2026, [], 2026)).toBeNull()
  })
})
