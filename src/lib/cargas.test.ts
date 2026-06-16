import { describe, it, expect } from 'vitest'
import { recalcularPeriodoActual } from './cargas'
import type { CargaPeriodo } from './cargas'

const activa = (anio: number, mes: number): CargaPeriodo => ({ anio, mes, estado: 'activa' })
const reemplazada = (anio: number, mes: number): CargaPeriodo => ({
  anio,
  mes,
  estado: 'reemplazada',
})

describe('recalcularPeriodoActual', () => {
  it('toma el período activo más reciente que queda', () => {
    const restantes = [activa(2026, 1), activa(2026, 3), activa(2026, 2)]
    expect(recalcularPeriodoActual(restantes, 2026)).toEqual({ anio: 2026, mes: 3 })
  })

  it('cruza años: diciembre de un año < enero del siguiente', () => {
    const restantes = [activa(2025, 12), activa(2026, 1)]
    expect(recalcularPeriodoActual(restantes, 2026)).toEqual({ anio: 2026, mes: 1 })
  })

  it('al borrar el mes de trabajo, retrocede al activo anterior', () => {
    // Estaba en Junio; se borró Junio; quedan Ene–May activas.
    const restantes = [activa(2026, 5), activa(2026, 4), activa(2026, 3)]
    expect(recalcularPeriodoActual(restantes, 2026)).toEqual({ anio: 2026, mes: 5 })
  })

  it('si no queda ninguna carga, vuelve al año actual con mes 0', () => {
    expect(recalcularPeriodoActual([], 2026)).toEqual({ anio: 2026, mes: 0 })
  })

  it('caso especial: solo quedan reemplazadas (mes sin carga activa) → mes 0', () => {
    // Se borró la 'activa' de Junio que tenía una 'reemplazada' del mismo mes;
    // la vieja NO se reactiva, así que no hay ninguna activa.
    const restantes = [reemplazada(2026, 6)]
    expect(recalcularPeriodoActual(restantes, 2026)).toEqual({ anio: 2026, mes: 0 })
  })

  it('ignora las reemplazadas al elegir el período activo más reciente', () => {
    // Junio quedó solo con reemplazada; el activo más reciente es Mayo.
    const restantes = [reemplazada(2026, 6), activa(2026, 5), activa(2026, 4)]
    expect(recalcularPeriodoActual(restantes, 2026)).toEqual({ anio: 2026, mes: 5 })
  })
})
