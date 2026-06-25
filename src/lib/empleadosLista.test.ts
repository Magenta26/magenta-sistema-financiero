import { describe, it, expect } from 'vitest'
import {
  antiguedadPromedioMeses,
  areasConConteo,
  claveContrato,
  conFechaIngreso,
  filtrarEmpleados,
  iconoArea,
  mesesAntiguedad,
  ordenarEmpleados,
  partesAntiguedad,
  SIN_AREA,
} from './empleadosLista'
import type { Empleado } from '../types/empleados'

// Fábrica de empleados de prueba (solo los campos que usa la lista).
function emp(p: Partial<Empleado>): Empleado {
  return {
    id: p.id ?? p.codigo ?? Math.random().toString(),
    codigo: p.codigo ?? 'EMP-000',
    nombre_completo: p.nombre_completo ?? 'Sin Nombre',
    foto_url: null,
    activo: p.activo ?? true,
    estado_civil: null,
    es_padre: false,
    num_hijos: 0,
    esta_estudiando: false,
    estudio: null,
    tipo_sangre: null,
    eps: null,
    caja_compensacion: null,
    fondo_pension: null,
    tipo_contrato: p.tipo_contrato ?? null,
    salario: null,
    fecha_ingreso: p.fecha_ingreso ?? null,
    aplica_auxilio_transporte: false,
    jornada_inicio: null,
    jornada_fin: null,
    equipo: p.equipo ?? null,
    beneficio_lentes: false,
  }
}

const HOY = new Date(2026, 5, 24) // 24-jun-2026

describe('mesesAntiguedad', () => {
  it('null si no hay fecha', () => {
    expect(mesesAntiguedad(null, HOY)).toBeNull()
    expect(mesesAntiguedad(undefined, HOY)).toBeNull()
  })
  it('cuenta meses completos', () => {
    expect(mesesAntiguedad('2025-06-24', HOY)).toBe(12)
    expect(mesesAntiguedad('2026-03-24', HOY)).toBe(3)
  })
  it('resta un mes si aún no se cumple el día', () => {
    // del 25-mar al 24-jun NO completa el 3er mes
    expect(mesesAntiguedad('2026-03-25', HOY)).toBe(2)
  })
  it('nunca es negativo (fecha futura)', () => {
    expect(mesesAntiguedad('2027-01-01', HOY)).toBe(0)
  })
})

describe('partesAntiguedad', () => {
  it('descompone en años y meses', () => {
    expect(partesAntiguedad(0)).toEqual({ anios: 0, meses: 0 })
    expect(partesAntiguedad(13)).toEqual({ anios: 1, meses: 1 })
    expect(partesAntiguedad(27)).toEqual({ anios: 2, meses: 3 })
  })
})

describe('antiguedadPromedioMeses / conFechaIngreso', () => {
  it('null si ninguno tiene fecha (caso actual)', () => {
    const lista = [emp({ fecha_ingreso: null }), emp({ fecha_ingreso: null })]
    expect(antiguedadPromedioMeses(lista, HOY)).toBeNull()
    expect(conFechaIngreso(lista)).toBe(0)
  })
  it('promedia SOLO los que tienen fecha', () => {
    const lista = [
      emp({ fecha_ingreso: '2025-06-24' }), // 12
      emp({ fecha_ingreso: '2024-06-24' }), // 24
      emp({ fecha_ingreso: null }), // se ignora
    ]
    expect(antiguedadPromedioMeses(lista, HOY)).toBe(18)
    expect(conFechaIngreso(lista)).toBe(2)
  })
})

describe('areasConConteo', () => {
  it('cuenta por equipo, alfabético, con grupo "sin área" al final', () => {
    const lista = [
      emp({ equipo: 'Operario Agrícola' }),
      emp({ equipo: 'Administrativa' }),
      emp({ equipo: 'Operario Agrícola' }),
      emp({ equipo: null }),
    ]
    const r = areasConConteo(lista)
    expect(r).toEqual([
      { valor: 'Administrativa', count: 1, esSinArea: false },
      { valor: 'Operario Agrícola', count: 2, esSinArea: false },
      { valor: SIN_AREA, count: 1, esSinArea: true },
    ])
  })
})

describe('filtrarEmpleados', () => {
  const lista = [
    emp({ codigo: 'EMP-001', nombre_completo: 'Ana López', equipo: 'Administrativa' }),
    emp({ codigo: 'EMP-002', nombre_completo: 'Beto Ruiz', equipo: 'Operario Agrícola' }),
    emp({ codigo: 'EMP-003', nombre_completo: 'Carla Díaz', equipo: null }),
  ]
  it('filtra por nombre o código', () => {
    expect(filtrarEmpleados(lista, 'beto', 'all').map((e) => e.codigo)).toEqual(['EMP-002'])
    expect(filtrarEmpleados(lista, 'emp-003', 'all').map((e) => e.codigo)).toEqual(['EMP-003'])
  })
  it('filtra por área y por "sin área"', () => {
    expect(filtrarEmpleados(lista, '', 'Administrativa').map((e) => e.codigo)).toEqual(['EMP-001'])
    expect(filtrarEmpleados(lista, '', SIN_AREA).map((e) => e.codigo)).toEqual(['EMP-003'])
  })
})

describe('ordenarEmpleados', () => {
  const lista = [
    emp({ codigo: 'EMP-002', nombre_completo: 'Beto', fecha_ingreso: '2025-06-24' }), // 12
    emp({ codigo: 'EMP-001', nombre_completo: 'Ana', fecha_ingreso: null }),
    emp({ codigo: 'EMP-003', nombre_completo: 'Carla', fecha_ingreso: '2024-06-24' }), // 24
  ]
  it('por nombre asc', () => {
    expect(ordenarEmpleados(lista, 'nombre', 'asc', HOY).map((e) => e.nombre_completo)).toEqual([
      'Ana',
      'Beto',
      'Carla',
    ])
  })
  it('por antigüedad desc; sin fecha al fondo', () => {
    expect(ordenarEmpleados(lista, 'antiguedad', 'desc', HOY).map((e) => e.codigo)).toEqual([
      'EMP-003',
      'EMP-002',
      'EMP-001',
    ])
  })
  it('no muta el arreglo original', () => {
    const copia = [...lista]
    ordenarEmpleados(lista, 'codigo', 'desc', HOY)
    expect(lista).toEqual(copia)
  })
})

describe('iconoArea', () => {
  it('clasifica por palabra clave (sin acentos)', () => {
    expect(iconoArea('Administrativa')).toBe('maletin')
    expect(iconoArea('Operario Agrícola')).toBe('planta')
    expect(iconoArea('Ayudante de Producción')).toBe('caja')
    expect(iconoArea('Otra cosa')).toBe('equipo')
    expect(iconoArea(null)).toBe('equipo')
  })
})

describe('claveContrato', () => {
  it('clasifica los tipos de contrato', () => {
    expect(claveContrato('Término indefinido')).toBe('indefinido')
    expect(claveContrato('Término fijo')).toBe('fijo')
    expect(claveContrato('Obra o labor')).toBe('obra')
    expect(claveContrato('Aprendizaje SENA')).toBe('aprendizaje')
    expect(claveContrato(null)).toBe('otro')
    expect(claveContrato('Otro')).toBe('otro')
  })
})
