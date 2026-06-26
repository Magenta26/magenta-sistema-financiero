import { describe, expect, it } from 'vitest'
import {
  filtrarExternos,
  opcionesNatillera,
  siguienteCodigoExterno,
  validarCodigoExterno,
} from './externos'
import type { Externo } from '../types/externos'
import type { EmpleadoNatillera } from '../types/natillera'

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
