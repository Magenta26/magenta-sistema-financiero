import { describe, it, expect } from 'vitest'
import {
  aniosVacaciones,
  causaAplica,
  diasAcumulados,
  diasTomados,
  lineasMensualesVacaciones,
  resumenVacaciones,
  valorDia,
} from './vacaciones'

const HOY = { anio: 2026, mes: 6, dia: 23 }

describe('causaAplica', () => {
  it('aplica a término indefinido y fijo (case/acento-insensitive)', () => {
    expect(causaAplica('Término Indefinido')).toBe(true)
    expect(causaAplica('término fijo')).toBe(true)
    expect(causaAplica('CONTRATO A TERMINO FIJO')).toBe(true)
    expect(causaAplica('Indefinido')).toBe(true)
  })
  it('no aplica a otros contratos ni a vacío', () => {
    expect(causaAplica('Obra o labor')).toBe(false)
    expect(causaAplica('Prestación de servicios')).toBe(false)
    expect(causaAplica(null)).toBe(false)
    expect(causaAplica('')).toBe(false)
  })
})

describe('diasAcumulados', () => {
  it('12 meses exactos = 15 días', () => {
    expect(diasAcumulados('2025-06-23', HOY)).toBeCloseTo(15, 6)
  })
  it('1 mes exacto = 1,25 días', () => {
    expect(diasAcumulados('2026-05-23', HOY)).toBeCloseTo(1.25, 6)
  })
  it('suma la fracción del mes en curso (medio mes ≈ 0,625 días)', () => {
    // ingreso el día 8, hoy día 23 de junio → 15/30 de mes ≈ 0,5 mes → 0,625 días
    const dias = diasAcumulados('2026-06-08', HOY)!
    expect(dias).toBeCloseTo((15 / 30) * 1.25, 6)
    // crece suave: un día más acumula más
    const manana = diasAcumulados('2026-06-08', { anio: 2026, mes: 6, dia: 24 })!
    expect(manana).toBeGreaterThan(dias)
  })
  it('sin fecha de ingreso → null', () => {
    expect(diasAcumulados(null, HOY)).toBeNull()
    expect(diasAcumulados('', HOY)).toBeNull()
  })
  it('fecha futura no causa negativo (clamp a 0)', () => {
    expect(diasAcumulados('2027-01-01', HOY)).toBe(0)
  })
})

describe('diasTomados', () => {
  it('suma los días hábiles de los períodos', () => {
    expect(diasTomados([{ dias_habiles: 5 }, { dias_habiles: 3.5 }])).toBeCloseTo(8.5, 6)
    expect(diasTomados([])).toBe(0)
  })
})

describe('resumenVacaciones', () => {
  const empleado = { tipo_contrato: 'Término indefinido', salario: 1_800_000, fecha_ingreso: '2025-06-23' }

  it('contrato que no aplica → estado no_aplica', () => {
    const r = resumenVacaciones({ ...empleado, tipo_contrato: 'Obra o labor' }, [], HOY)
    expect(r.estado).toBe('no_aplica')
  })

  it('causa pero sin fecha de ingreso → estado sin_fecha', () => {
    const r = resumenVacaciones({ ...empleado, fecha_ingreso: null }, [], HOY)
    expect(r.estado).toBe('sin_fecha')
  })

  it('los días tomados restan del acumulado', () => {
    const r = resumenVacaciones(empleado, [{ fecha_inicio: '2026-01-10', dias_habiles: 5 }], HOY)
    expect(r.estado).toBe('ok')
    expect(r.diasAcumulados).toBeCloseTo(15, 6)
    expect(r.diasTomados).toBe(5)
    expect(r.saldoDias).toBeCloseTo(10, 6)
  })

  it('valor del saldo = saldo × salario/30', () => {
    const r = resumenVacaciones(empleado, [{ fecha_inicio: '2026-01-10', dias_habiles: 5 }], HOY)
    expect(r.valorDia).toBeCloseTo(1_800_000 / 30, 6) // 60.000
    expect(r.valorSaldo).toBeCloseTo(10 * (1_800_000 / 30), 4) // 600.000
    expect(r.valorProvisionAcumulada).toBeCloseTo(15 * (1_800_000 / 30), 4) // 900.000
    expect(r.provisionMensual).toBeCloseTo(1.25 * (1_800_000 / 30), 4) // 75.000
  })

  it('valorDia es 0 si no hay salario', () => {
    expect(valorDia(null)).toBe(0)
    expect(valorDia(0)).toBe(0)
  })
})

describe('lineasMensualesVacaciones', () => {
  const empleado = { tipo_contrato: 'Término fijo', salario: 1_500_000, fecha_ingreso: '2025-01-01' }

  it('una línea por mes desde enero hasta el mes actual del año en curso', () => {
    const lineas = lineasMensualesVacaciones(empleado, [], 2026, HOY)
    expect(lineas.map((l) => l.mes)).toEqual([1, 2, 3, 4, 5, 6])
    // meses completos causan 1,25; el mes en curso (junio, día 23) causa una fracción
    expect(lineas[0].causado).toBeCloseTo(1.25, 6)
    expect(lineas[5].causado).toBeLessThan(1.25)
  })

  it('el saldo refleja los períodos tomados', () => {
    const lineas = lineasMensualesVacaciones(
      empleado,
      [{ fecha_inicio: '2026-03-10', dias_habiles: 4 }],
      2026,
      HOY
    )
    const marzo = lineas.find((l) => l.mes === 3)!
    expect(marzo.tomado).toBe(4)
    // acumulado de marzo (15 meses de causación ≈ 18,75) menos 4 tomados
    expect(marzo.saldo).toBeCloseTo(marzo.acumulado - 4, 6)
  })

  it('sin fecha o contrato que no aplica → sin líneas', () => {
    expect(lineasMensualesVacaciones({ ...empleado, fecha_ingreso: null }, [], 2026, HOY)).toEqual([])
    expect(lineasMensualesVacaciones({ ...empleado, tipo_contrato: 'Obra' }, [], 2026, HOY)).toEqual([])
  })
})

describe('aniosVacaciones', () => {
  it('del año de ingreso al año en curso, descendente', () => {
    expect(aniosVacaciones('2024-03-01', 2026)).toEqual([2026, 2025, 2024])
  })
  it('sin fecha → solo el año en curso', () => {
    expect(aniosVacaciones(null, 2026)).toEqual([2026])
  })
})
