import { describe, it, expect } from 'vitest'
import { montoEnLetras } from './montoEnLetras'

describe('montoEnLetras — español', () => {
  it('cero', () => {
    expect(montoEnLetras(0, 'es')).toBe('Cero pesos m/cte')
  })
  it('apócope: un / veintiún / ciento un', () => {
    expect(montoEnLetras(1, 'es')).toBe('Un peso m/cte')
    expect(montoEnLetras(21, 'es')).toBe('Veintiún pesos m/cte')
    expect(montoEnLetras(101, 'es')).toBe('Ciento un pesos m/cte')
  })
  it('cien exacto vs ciento', () => {
    expect(montoEnLetras(100, 'es')).toBe('Cien pesos m/cte')
    expect(montoEnLetras(130_000, 'es')).toBe('Ciento treinta mil pesos m/cte')
  })
  it('mil y decenas de mil', () => {
    expect(montoEnLetras(1000, 'es')).toBe('Mil pesos m/cte')
    expect(montoEnLetras(50_000, 'es')).toBe('Cincuenta mil pesos m/cte')
  })
  it('millones con miles y unidades', () => {
    expect(montoEnLetras(1_234_567, 'es')).toBe(
      'Un millón doscientos treinta y cuatro mil quinientos sesenta y siete pesos m/cte'
    )
  })
  it('centavos como con NN/100', () => {
    expect(montoEnLetras(1234.5, 'es')).toBe('Mil doscientos treinta y cuatro pesos con 50/100 m/cte')
  })
})

describe('montoEnLetras — inglés', () => {
  it('cero y singular', () => {
    expect(montoEnLetras(0, 'en')).toBe('Zero Colombian pesos')
    expect(montoEnLetras(1, 'en')).toBe('One Colombian peso')
  })
  it('millones', () => {
    expect(montoEnLetras(1_234_567, 'en')).toBe(
      'One million two hundred thirty-four thousand five hundred sixty-seven Colombian pesos'
    )
  })
  it('centavos como and NN/100', () => {
    expect(montoEnLetras(1234.5, 'en')).toBe(
      'One thousand two hundred thirty-four Colombian pesos and 50/100'
    )
  })
})
