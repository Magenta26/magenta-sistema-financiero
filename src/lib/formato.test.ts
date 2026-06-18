import { describe, it, expect, afterEach } from 'vitest'
import { parsearNumero } from './formato'
import { setIdiomaGlobal } from '../i18n/idioma'

afterEach(() => setIdiomaGlobal('es'))

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
