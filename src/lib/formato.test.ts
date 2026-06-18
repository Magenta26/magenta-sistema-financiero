import { describe, it, expect, afterEach } from 'vitest'
import { monedaMillones, parsearNumero } from './formato'
import { setIdiomaGlobal } from '../i18n/idioma'

afterEach(() => setIdiomaGlobal('es'))

describe('monedaMillones', () => {
  it('ES: millones con coma decimal y sufijo " M"', () => {
    setIdiomaGlobal('es')
    expect(monedaMillones(258_300_000)).toBe('COP $258,3 M')
    expect(monedaMillones(1_500_000)).toBe('COP $1,5 M')
  })

  it('EN: millones con punto decimal y sufijo " M"', () => {
    setIdiomaGlobal('en')
    expect(monedaMillones(258_300_000)).toBe('COP $258.3 M')
  })

  it('negativos con signo menos', () => {
    setIdiomaGlobal('es')
    expect(monedaMillones(-12_000_000)).toBe('−COP $12,0 M')
  })
})

describe('parsearNumero (es-CO: miles "." decimal ",")', () => {
  it('parsea un valor formateado con separadores de miles', () => {
    setIdiomaGlobal('es')
    expect(parsearNumero('100.000,00')).toBe(100000)
    expect(parsearNumero('1.234.567,89')).toBe(1234567.89)
  })

  it('parsea un número plano sin separadores', () => {
    setIdiomaGlobal('es')
    expect(parsearNumero('100000')).toBe(100000)
  })

  it('vacío o no numérico → null', () => {
    setIdiomaGlobal('es')
    expect(parsearNumero('')).toBeNull()
    expect(parsearNumero('   ')).toBeNull()
    expect(parsearNumero('abc')).toBeNull()
  })

  it('redondea ida y vuelta con el decimal en coma', () => {
    setIdiomaGlobal('es')
    expect(parsearNumero('0,50')).toBe(0.5)
  })
})

describe('parsearNumero (en-US: miles "," decimal ".")', () => {
  it('parsea con separadores en inglés', () => {
    setIdiomaGlobal('en')
    expect(parsearNumero('100,000.00')).toBe(100000)
    expect(parsearNumero('1,234,567.89')).toBe(1234567.89)
  })
})
