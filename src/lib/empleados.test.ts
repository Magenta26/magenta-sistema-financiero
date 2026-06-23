import { describe, it, expect } from 'vitest'
import { iniciales, colorAvatar, resumenNatillera } from './empleados'
import { siguienteCodigoEmpleado } from './natillera'

describe('iniciales', () => {
  it('primer + último nombre', () => {
    expect(iniciales('Ana María Pérez')).toBe('AP')
  })
  it('un solo nombre → dos primeras letras', () => {
    expect(iniciales('Carlos')).toBe('CA')
  })
  it('vacío → ?', () => {
    expect(iniciales('   ')).toBe('?')
  })
})

describe('colorAvatar', () => {
  it('es determinístico (mismo nombre → mismo color)', () => {
    expect(colorAvatar('Ana Pérez')).toBe(colorAvatar('Ana Pérez'))
  })
  it('devuelve un hex de la paleta', () => {
    expect(colorAvatar('Ana Pérez')).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
})

describe('siguienteCodigoEmpleado (reutilizado para empleados)', () => {
  it('auto-sugiere el mayor sufijo + 1', () => {
    expect(siguienteCodigoEmpleado(['EMP-001', 'EMP-004'])).toBe('EMP-005')
    expect(siguienteCodigoEmpleado([])).toBe('EMP-001')
  })
})

describe('resumenNatillera (lee del vínculo)', () => {
  it('sin natillera vinculada → null', () => {
    expect(resumenNatillera(null, null)).toBeNull()
    expect(resumenNatillera(undefined, { cuotaVigente: 1, total: 2 })).toBeNull()
  })
  it('con vínculo → cuota y total del reporte; ahorrando = activo', () => {
    expect(
      resumenNatillera({ activo: true }, { cuotaVigente: 50_000, total: 600_000 })
    ).toEqual({ ahorrando: true, cuota: 50_000, total: 600_000 })
    expect(
      resumenNatillera({ activo: false }, { cuotaVigente: 50_000, total: 250_000 })
    ).toEqual({ ahorrando: false, cuota: 50_000, total: 250_000 })
  })
})
