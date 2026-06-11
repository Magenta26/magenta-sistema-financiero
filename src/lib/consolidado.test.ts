import { describe, expect, it } from 'vitest'
import { calcularValores, conflictoEr, detallePorMes, ultimoPeriodo } from './consolidado'
import type { CuentaCatalogo, MovimientoResumen } from '../types/catalogo'

function mov(parcial: Partial<MovimientoResumen> & { cuenta: string }): MovimientoResumen {
  return {
    anio: 2026,
    mes: 1,
    saldo_inicial: 0,
    mov_debito: 0,
    mov_credito: 0,
    saldo_final: 0,
    ...parcial,
  }
}

function cta(parcial: Partial<CuentaCatalogo> & { cuenta: string }): CuentaCatalogo {
  return {
    nombre: parcial.cuenta,
    naturaleza: 'DB',
    rubro_codigo: null,
    incluir_er: false,
    incluir_bg: false,
    origen: 'seed',
    orden: null,
    ...parcial,
  }
}

describe('calcularValores', () => {
  const movimientos = [
    mov({ cuenta: '41052501', mes: 1, mov_credito: 100, mov_debito: 10 }),
    mov({ cuenta: '41052502', mes: 2, mov_credito: 50 }),
    mov({ cuenta: '52050101', mes: 1, mov_debito: 30 }),
    mov({ cuenta: '11050501', mes: 1, saldo_final: 700 }),
    mov({ cuenta: '11050501', mes: 2, saldo_final: 800 }),
  ]

  it('CR acumula créditos−débitos de todos los meses por prefijo', () => {
    const valores = calcularValores([cta({ cuenta: '4105', naturaleza: 'CR' })], movimientos)
    expect(valores.get('4105')).toBe(140) // (100-10) + 50
  })

  it('DB acumula débitos−créditos', () => {
    const valores = calcularValores([cta({ cuenta: '52', naturaleza: 'DB' })], movimientos)
    expect(valores.get('52')).toBe(30)
  })

  it('clases 1-3 usan el saldo final del último mes cargado', () => {
    const valores = calcularValores([cta({ cuenta: '11050501' })], movimientos)
    expect(valores.get('11050501')).toBe(800) // mes 2, no 700+800
  })

  it('sin movimientos coincidentes -> 0', () => {
    const valores = calcularValores([cta({ cuenta: '9999' })], movimientos)
    expect(valores.get('9999')).toBe(0)
  })
})

describe('conflictoEr', () => {
  const catalogo = [
    cta({ cuenta: '720584', incluir_er: true }),
    cta({ cuenta: '52', incluir_er: false }),
  ]

  it('detecta extensión de un código ya incluido', () => {
    const r = conflictoEr('72058405', catalogo)
    expect(r?.conflicto.cuenta).toBe('720584')
    expect(r?.razon).toContain('duplicaría')
  })

  it('detecta prefijo de un código ya incluido', () => {
    const r = conflictoEr('72', catalogo)
    expect(r?.conflicto.cuenta).toBe('720584')
  })

  it('ignora cuentas no incluidas en ER y códigos sin relación', () => {
    expect(conflictoEr('5205', catalogo)).toBeNull()
    expect(conflictoEr('41052501', catalogo)).toBeNull()
  })
})

describe('detallePorMes / ultimoPeriodo', () => {
  const movimientos = [
    mov({ cuenta: '41052501', mes: 1, mov_credito: 100, saldo_final: -100 }),
    mov({ cuenta: '41052502', mes: 1, mov_credito: 20, saldo_final: -20 }),
    mov({ cuenta: '41052501', mes: 3, mov_credito: 70, saldo_final: -170 }),
  ]

  it('agrega auxiliares por mes y ordena cronológicamente', () => {
    const detalle = detallePorMes('4105', movimientos)
    expect(detalle).toHaveLength(2)
    expect(detalle[0]).toMatchObject({ mes: 1, auxiliares: 2, mov_credito: 120, saldo_final: -120 })
    expect(detalle[1]).toMatchObject({ mes: 3, auxiliares: 1, mov_credito: 70 })
  })

  it('ultimoPeriodo devuelve el mayor anio*100+mes', () => {
    expect(ultimoPeriodo(movimientos)).toBe(202603)
  })
})
