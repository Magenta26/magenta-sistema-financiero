import { describe, it, expect } from 'vitest'
import {
  puedeVerFinanzas,
  puedeVerNomina,
  puedeEditarNomina,
  esAdmin,
  landingPorRol,
} from './acceso'

describe('acceso por rol', () => {
  it('finanzas: admin y contadora sí; nomina y null no', () => {
    expect(puedeVerFinanzas('admin')).toBe(true)
    expect(puedeVerFinanzas('contadora')).toBe(true)
    expect(puedeVerFinanzas('nomina')).toBe(false)
    expect(puedeVerFinanzas(null)).toBe(false)
  })

  it('nómina: los tres roles entran; null no', () => {
    expect(puedeVerNomina('admin')).toBe(true)
    expect(puedeVerNomina('contadora')).toBe(true)
    expect(puedeVerNomina('nomina')).toBe(true)
    expect(puedeVerNomina(null)).toBe(false)
    // Editar nómina = mismo criterio que verla.
    expect(puedeEditarNomina('nomina')).toBe(true)
    expect(puedeEditarNomina(null)).toBe(false)
  })

  it('admin: solo admin', () => {
    expect(esAdmin('admin')).toBe(true)
    expect(esAdmin('contadora')).toBe(false)
    expect(esAdmin('nomina')).toBe(false)
    expect(esAdmin(null)).toBe(false)
  })

  it('landing: nomina aterriza en su módulo; el resto en Cargas', () => {
    expect(landingPorRol('nomina')).toBe('/nomina/empleados')
    expect(landingPorRol('admin')).toBe('/finanzas/cargas')
    expect(landingPorRol('contadora')).toBe('/finanzas/cargas')
    expect(landingPorRol(null)).toBe('/finanzas/cargas')
  })
})
