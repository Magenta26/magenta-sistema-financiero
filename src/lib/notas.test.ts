import { describe, it, expect } from 'vitest'
import { estadoNotasPorMes, mesesConNotas, mesPorDefecto } from './notas'

describe('mesesConNotas', () => {
  it('marca solo los meses con datos y contenido no vacío', () => {
    const notas = [
      { mes: 1, contenido: 'Buen mes' },
      { mes: 2, contenido: '   ' }, // solo espacios → vacío
      { mes: 3, contenido: '' },
      { mes: 4, contenido: 'Cierre de Q' },
    ]
    const con = mesesConNotas(notas, [1, 2, 3, 4, 5])
    expect([...con].sort((a, b) => a - b)).toEqual([1, 4])
  })

  it('ignora notas de meses que no están en la lista visible', () => {
    const notas = [{ mes: 11, contenido: 'Nota vieja' }]
    expect(mesesConNotas(notas, [1, 2, 3]).size).toBe(0)
  })
})

describe('estadoNotasPorMes', () => {
  const notas = [
    { mes: 1, contenido: 'Hola', contenido_en: 'Hi' }, // ambas
    { mes: 2, contenido: 'Solo ES', contenido_en: '' }, // una
    { mes: 3, contenido: '', contenido_en: 'Only EN' }, // una
    { mes: 4, contenido: '   ', contenido_en: '' }, // ninguna (espacios)
    { mes: 11, contenido: 'Fuera', contenido_en: 'Out' }, // fuera de rango
  ]

  it('clasifica ambas / una / ninguna', () => {
    const estados = estadoNotasPorMes(notas, [1, 2, 3, 4])
    expect(estados.get(1)).toBe('ambas')
    expect(estados.get(2)).toBe('una')
    expect(estados.get(3)).toBe('una')
    expect(estados.has(4)).toBe(false)
  })

  it('ignora meses fuera de la lista visible', () => {
    expect(estadoNotasPorMes(notas, [1, 2, 3, 4]).has(11)).toBe(false)
  })
})

describe('mesPorDefecto', () => {
  it('usa el mes preferido si tiene datos', () => {
    expect(mesPorDefecto(6, [1, 2, 3, 4, 5, 6])).toBe(6)
  })

  it('cae al último mes con datos si el preferido no los tiene', () => {
    expect(mesPorDefecto(8, [1, 2, 3, 4, 5])).toBe(5)
  })

  it('cae al último mes con datos si no hay preferido', () => {
    expect(mesPorDefecto(null, [1, 2, 3])).toBe(3)
  })

  it('null cuando no hay meses con datos', () => {
    expect(mesPorDefecto(5, [])).toBeNull()
  })
})
