import { describe, expect, it } from 'vitest'
import {
  construirLiquidacion,
  deduccionNatillera,
  fechaEnQuincena,
  filtrarExternos,
  liquidarExterno,
  opcionesNatillera,
  quincenaActual,
  rangoQuincena,
  siguienteCodigoExterno,
  totalesProduccion,
  ultimoDiaDelMes,
  validarCodigoExterno,
} from './externos'
import type {
  DeduccionExterno,
  Externo,
  RegistroExterno,
  TarifasExternos,
} from '../types/externos'
import type { EmpleadoNatillera } from '../types/natillera'

const TARIFAS: TarifasExternos = { maquillada_valor: 85, hydratada_valor: 65, hora_valor: 10000 }

function registro(parcial: Partial<RegistroExterno>): RegistroExterno {
  return {
    id: 'r',
    externo_id: '1',
    fecha: '2026-06-03',
    maquillada_tallos: 0,
    hydratada_tallos: 0,
    horas: 0,
    ...parcial,
  }
}

function deduccion(parcial: Partial<DeduccionExterno>): DeduccionExterno {
  return {
    id: 'd',
    externo_id: '1',
    anio: 2026,
    quincena: 1,
    tipo: 'prestamo',
    valor: 0,
    nota: null,
    ...parcial,
  }
}

function externo(parcial: Partial<Externo>): Externo {
  return {
    id: 'x',
    codigo: 'EXT-001',
    nombre_completo: 'Persona',
    cedula: null,
    activo: true,
    natillera_empleado_id: null,
    creado_en: null,
    ...parcial,
  }
}

function natEmp(parcial: Partial<EmpleadoNatillera>): EmpleadoNatillera {
  return {
    id: 'n',
    empleado_id: null,
    codigo: 'EXT-001',
    nombre: 'Ahorrador',
    cuota_mensual: 50000,
    activo: true,
    fecha_ingreso: null,
    fecha_retiro: null,
    creado_en: null,
    ...parcial,
  }
}

describe('siguienteCodigoExterno', () => {
  it('arranca en EXT-001 sin códigos previos', () => {
    expect(siguienteCodigoExterno([])).toBe('EXT-001')
  })

  it('toma el mayor EXT-### y suma 1 (ignora otros prefijos)', () => {
    expect(siguienteCodigoExterno(['EXT-001', 'EXT-007', 'EMP-099', null])).toBe('EXT-008')
  })
})

describe('validarCodigoExterno', () => {
  it('requerido si está vacío', () => {
    expect(validarCodigoExterno('   ', [])).toBe('requerido')
  })

  it('duplicado case-insensitive', () => {
    expect(validarCodigoExterno('ext-001', ['EXT-001'])).toBe('duplicado')
  })

  it('válido si no choca', () => {
    expect(validarCodigoExterno('EXT-002', ['EXT-001'])).toBeNull()
  })

  it('al editar, ignora el código propio', () => {
    expect(validarCodigoExterno('EXT-001', ['EXT-001', 'EXT-002'], 'EXT-001')).toBeNull()
  })
})

describe('opcionesNatillera', () => {
  it('solo activos, ordenados por código', () => {
    const lista = [
      natEmp({ id: 'b', codigo: 'EXT-005', activo: true }),
      natEmp({ id: 'c', codigo: 'EXT-002', activo: false }),
      natEmp({ id: 'a', codigo: 'EXT-001', activo: true }),
    ]
    expect(opcionesNatillera(lista).map((e) => e.id)).toEqual(['a', 'b'])
  })
})

describe('filtrarExternos', () => {
  const lista = [
    externo({ id: '1', codigo: 'EXT-001', nombre_completo: 'Ana López', cedula: '123' }),
    externo({ id: '2', codigo: 'EXT-002', nombre_completo: 'Beto Ruiz', cedula: '999' }),
  ]

  it('sin búsqueda devuelve todo', () => {
    expect(filtrarExternos(lista, '  ')).toHaveLength(2)
  })

  it('filtra por nombre, código o cédula', () => {
    expect(filtrarExternos(lista, 'ana').map((e) => e.id)).toEqual(['1'])
    expect(filtrarExternos(lista, 'ext-002').map((e) => e.id)).toEqual(['2'])
    expect(filtrarExternos(lista, '999').map((e) => e.id)).toEqual(['2'])
  })
})

// ── Entrega 2: producción + liquidación ──

describe('ultimoDiaDelMes', () => {
  it('febrero no bisiesto = 28', () => {
    expect(ultimoDiaDelMes(2026, 2)).toBe(28)
  })
  it('febrero bisiesto = 29', () => {
    expect(ultimoDiaDelMes(2024, 2)).toBe(29)
  })
  it('meses de 30 y 31 días', () => {
    expect(ultimoDiaDelMes(2026, 4)).toBe(30)
    expect(ultimoDiaDelMes(2026, 12)).toBe(31)
  })
})

describe('rangoQuincena', () => {
  it('quincena 1 = 01–15', () => {
    expect(rangoQuincena(2026, 6, 1)).toEqual({ inicio: '2026-06-01', fin: '2026-06-15' })
  })
  it('quincena 2 = 16–fin (junio: 30)', () => {
    expect(rangoQuincena(2026, 6, 2)).toEqual({ inicio: '2026-06-16', fin: '2026-06-30' })
  })
  it('quincena 2 de febrero no bisiesto termina el 28', () => {
    expect(rangoQuincena(2026, 2, 2)).toEqual({ inicio: '2026-02-16', fin: '2026-02-28' })
  })
  it('quincena 2 de febrero bisiesto termina el 29', () => {
    expect(rangoQuincena(2024, 2, 2)).toEqual({ inicio: '2024-02-16', fin: '2024-02-29' })
  })
})

describe('fechaEnQuincena', () => {
  it('clasifica los bordes (15 y 16) correctamente', () => {
    expect(fechaEnQuincena('2026-06-15', 2026, 6, 1)).toBe(true)
    expect(fechaEnQuincena('2026-06-16', 2026, 6, 1)).toBe(false)
    expect(fechaEnQuincena('2026-06-16', 2026, 6, 2)).toBe(true)
    expect(fechaEnQuincena('2026-06-28', 2026, 2, 2)).toBe(false) // otro mes
  })
})

describe('quincenaActual', () => {
  it('día ≤ 15 → quincena 1; día > 15 → quincena 2', () => {
    expect(quincenaActual({ anio: 2026, mes: 6, dia: 1 })).toEqual({ anio: 2026, mes: 6, quincena: 1 })
    expect(quincenaActual({ anio: 2026, mes: 6, dia: 15 })).toEqual({ anio: 2026, mes: 6, quincena: 1 })
    expect(quincenaActual({ anio: 2026, mes: 6, dia: 16 })).toEqual({ anio: 2026, mes: 6, quincena: 2 })
    expect(quincenaActual({ anio: 2026, mes: 6, dia: 30 })).toEqual({ anio: 2026, mes: 6, quincena: 2 })
  })
})

describe('totalesProduccion', () => {
  it('suma tallos y horas y los valoriza con las tarifas', () => {
    const regs = [
      registro({ maquillada_tallos: 100, hydratada_tallos: 50, horas: 2 }),
      registro({ maquillada_tallos: 100, horas: 1.5 }),
    ]
    const t = totalesProduccion(regs, TARIFAS)
    expect(t.maquillada_tallos).toBe(200)
    expect(t.hydratada_tallos).toBe(50)
    expect(t.horas).toBe(3.5)
    expect(t.maquillada_valor).toBe(200 * 85) // 17.000
    expect(t.hydratada_valor).toBe(50 * 65) // 3.250
    expect(t.horas_valor).toBe(3.5 * 10000) // 35.000
    expect(t.bruto).toBe(17000 + 3250 + 35000) // 55.250
  })
})

describe('deduccionNatillera', () => {
  it('50% de la cuota mensual si ahorra', () => {
    expect(deduccionNatillera(externo({ natillera_empleado_id: 'n1' }), 50000)).toBe(25000)
  })
  it('0 si el externo no tiene vínculo de natillera', () => {
    expect(deduccionNatillera(externo({ natillera_empleado_id: null }), 50000)).toBe(0)
  })
  it('redondea al peso', () => {
    expect(deduccionNatillera(externo({ natillera_empleado_id: 'n1' }), 50001)).toBe(25001)
  })
})

describe('liquidarExterno', () => {
  it('externo con tallos + horas, sin natillera ni manuales', () => {
    const l = liquidarExterno(
      externo({ id: '1', natillera_empleado_id: null }),
      [registro({ maquillada_tallos: 100, hydratada_tallos: 100, horas: 4 })],
      [],
      TARIFAS,
      0
    )
    // 100*85 + 100*65 + 4*10000 = 8500 + 6500 + 40000 = 55.000
    expect(l.produccion.bruto).toBe(55000)
    expect(l.deduccionNatillera).toBe(0)
    expect(l.deduccionesManuales).toBe(0)
    expect(l.totalAPagar).toBe(55000)
  })

  it('externo que ahorra: descuenta el 50% de la cuota', () => {
    const l = liquidarExterno(
      externo({ id: '1', natillera_empleado_id: 'n1' }),
      [registro({ maquillada_tallos: 100 })], // 8.500
      [],
      TARIFAS,
      4000 // cuota mensual → 2.000 por quincena
    )
    expect(l.produccion.bruto).toBe(8500)
    expect(l.deduccionNatillera).toBe(2000)
    expect(l.totalAPagar).toBe(6500)
  })

  it('resta las deducciones manuales (préstamo + otra)', () => {
    const l = liquidarExterno(
      externo({ id: '1', natillera_empleado_id: 'n1' }),
      [registro({ maquillada_tallos: 1000 })], // 85.000
      [deduccion({ tipo: 'prestamo', valor: 20000 }), deduccion({ tipo: 'otro', valor: 5000 })],
      TARIFAS,
      4000 // → 2.000 natillera
    )
    expect(l.produccion.bruto).toBe(85000)
    expect(l.deduccionNatillera).toBe(2000)
    expect(l.deduccionesManuales).toBe(25000)
    expect(l.totalAPagar).toBe(85000 - 2000 - 25000) // 58.000
  })
})

describe('construirLiquidacion', () => {
  const externos = [
    externo({ id: '1', codigo: 'EXT-002', natillera_empleado_id: 'n1' }),
    externo({ id: '2', codigo: 'EXT-001', natillera_empleado_id: null }),
    externo({ id: '3', codigo: 'EXT-003', natillera_empleado_id: null }), // sin producción
  ]
  const registros = [
    registro({ id: 'a', externo_id: '1', fecha: '2026-06-05', maquillada_tallos: 100 }), // q1
    registro({ id: 'b', externo_id: '2', fecha: '2026-06-10', horas: 3 }), // q1
    registro({ id: 'c', externo_id: '1', fecha: '2026-06-20', maquillada_tallos: 999 }), // q2 (fuera)
  ]
  const deducciones = [
    deduccion({ externo_id: '1', anio: 2026, quincena: 1, valor: 1000 }),
    deduccion({ externo_id: '1', anio: 2026, quincena: 2, valor: 9999 }), // otra quincena
  ]
  const cuotas = new Map<string, number>([['n1', 4000]])

  it('solo incluye externos con producción en la quincena, ordenados por código', () => {
    const { lineas } = construirLiquidacion(externos, registros, deducciones, TARIFAS, cuotas, 2026, 6, 1)
    expect(lineas.map((l) => l.externo.codigo)).toEqual(['EXT-001', 'EXT-002'])
  })

  it('aísla los registros y deducciones de la quincena 1', () => {
    const { lineas, totales } = construirLiquidacion(externos, registros, deducciones, TARIFAS, cuotas, 2026, 6, 1)
    const ext1 = lineas.find((l) => l.externo.id === '1')!
    expect(ext1.produccion.maquillada_tallos).toBe(100) // no el registro de q2
    expect(ext1.deduccionNatillera).toBe(2000)
    expect(ext1.deduccionesManuales).toBe(1000) // no la deducción de q2
    expect(ext1.totalAPagar).toBe(8500 - 2000 - 1000) // 5.500

    const ext2 = lineas.find((l) => l.externo.id === '2')!
    expect(ext2.produccion.horas_valor).toBe(30000)
    expect(ext2.deduccionNatillera).toBe(0) // no ahorra

    // Totales de pie
    expect(totales.bruto).toBe(8500 + 30000)
    expect(totales.deduccionNatillera).toBe(2000)
    expect(totales.deduccionesManuales).toBe(1000)
    expect(totales.totalAPagar).toBe(8500 + 30000 - 2000 - 1000)
  })
})
