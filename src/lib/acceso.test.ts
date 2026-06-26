import { describe, it, expect } from 'vitest'
import {
  puedeVerFinanzas,
  puedeVerNomina,
  puedeEditarNomina,
  puedeVerExternos,
  puedeEditarExternos,
  esAdmin,
  landingPorRol,
} from './acceso'

describe('acceso por rol', () => {
  it('finanzas: admin y contadora sí; nomina, lider_campo y null no', () => {
    expect(puedeVerFinanzas('admin')).toBe(true)
    expect(puedeVerFinanzas('contadora')).toBe(true)
    expect(puedeVerFinanzas('nomina')).toBe(false)
    expect(puedeVerFinanzas('lider_campo')).toBe(false)
    expect(puedeVerFinanzas(null)).toBe(false)
  })

  it('nómina (núcleo): admin/contadora/nomina entran; lider_campo y null no', () => {
    expect(puedeVerNomina('admin')).toBe(true)
    expect(puedeVerNomina('contadora')).toBe(true)
    expect(puedeVerNomina('nomina')).toBe(true)
    expect(puedeVerNomina('lider_campo')).toBe(false)
    expect(puedeVerNomina(null)).toBe(false)
    // Editar nómina = mismo criterio que verla.
    expect(puedeEditarNomina('nomina')).toBe(true)
    expect(puedeEditarNomina('lider_campo')).toBe(false)
    expect(puedeEditarNomina(null)).toBe(false)
  })

  it('externos: los cuatro roles válidos entran (incluido lider_campo); null no', () => {
    expect(puedeVerExternos('admin')).toBe(true)
    expect(puedeVerExternos('contadora')).toBe(true)
    expect(puedeVerExternos('nomina')).toBe(true)
    expect(puedeVerExternos('lider_campo')).toBe(true)
    expect(puedeVerExternos(null)).toBe(false)
    // Editar externos = mismo criterio.
    expect(puedeEditarExternos('lider_campo')).toBe(true)
    expect(puedeEditarExternos(null)).toBe(false)
  })

  it('admin: solo admin (ni lider_campo)', () => {
    expect(esAdmin('admin')).toBe(true)
    expect(esAdmin('contadora')).toBe(false)
    expect(esAdmin('nomina')).toBe(false)
    expect(esAdmin('lider_campo')).toBe(false)
    expect(esAdmin(null)).toBe(false)
  })

  it('landing: lider_campo → Externos; nomina → su módulo; el resto → Cargas', () => {
    expect(landingPorRol('lider_campo')).toBe('/nomina/externos')
    expect(landingPorRol('nomina')).toBe('/nomina/empleados')
    expect(landingPorRol('admin')).toBe('/finanzas/cargas')
    expect(landingPorRol('contadora')).toBe('/finanzas/cargas')
    expect(landingPorRol(null)).toBe('/finanzas/cargas')
  })
})
