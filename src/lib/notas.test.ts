import { describe, it, expect } from 'vitest'
import { estadoNotasPorMes, mesPorDefecto, normalizarNota } from './notas'

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

  // Regresión del bug que tumbó el intento anterior: contenido_en undefined/null.
  it('NO truena cuando contenido_en es undefined o null (notas viejas)', () => {
    const viejas = [
      { mes: 1, contenido: 'Nota vieja en español' }, // contenido_en undefined
      { mes: 2, contenido: 'Otra', contenido_en: null }, // contenido_en null
      { mes: 3, contenido: undefined, contenido_en: undefined }, // ambos faltan
    ] as Array<{ mes: number; contenido?: string | null; contenido_en?: string | null }>
    expect(() => estadoNotasPorMes(viejas, [1, 2, 3])).not.toThrow()
    const estados = estadoNotasPorMes(viejas, [1, 2, 3])
    expect(estados.get(1)).toBe('una') // solo ES
    expect(estados.get(2)).toBe('una') // solo ES
    expect(estados.has(3)).toBe(false) // ninguna
  })
})

describe('normalizarNota', () => {
  it('rellena textos faltantes/nulos con cadena vacía', () => {
    const n = normalizarNota({ anio: 2026, mes: 5, contenido: null })
    expect(n.contenido).toBe('')
    expect(n.contenido_en).toBe('')
    expect(n.actualizada_en).toBeNull()
    expect(n.mes).toBe(5)
  })

  it('conserva los textos presentes', () => {
    const n = normalizarNota({
      anio: 2026,
      mes: 6,
      contenido: 'Español',
      contenido_en: 'English',
      actualizada_en: '2026-06-18T00:00:00Z',
      actualizada_por_email: 'a@b.com',
    })
    expect(n.contenido).toBe('Español')
    expect(n.contenido_en).toBe('English')
    expect(n.actualizada_por_email).toBe('a@b.com')
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
