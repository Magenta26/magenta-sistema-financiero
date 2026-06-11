import { describe, expect, it } from 'vitest'
import { construirModeloEr, transformarTotalAnio, transformarValor } from './estadoResultados'
import { construirModeloBg } from './balanceGeneral'
import { contable, porcentaje } from './formato'
import type { BgFila, ErChequeoFila, ErDetalleFila, ErRubroFila } from '../types/informes'

const rubro = (codigo: string, mes: number, total: number, orden: number, naturaleza: 'CR' | 'DB'): ErRubroFila => ({
  anio: 2026,
  mes,
  codigo,
  nombre: codigo,
  orden,
  naturaleza,
  total,
})

const RUBROS: ErRubroFila[] = [
  rubro('ING_OP', 1, 1000, 10, 'CR'),
  rubro('ING_OP', 2, 1200, 10, 'CR'),
  rubro('COSTO_MP', 1, 300, 20, 'DB'),
  rubro('COSTO_PER', 1, 100, 30, 'DB'),
  rubro('COSTO_SER', 1, 50, 40, 'DB'),
  rubro('GASTO_ADM', 1, 200, 50, 'DB'),
  rubro('GASTO_VTA', 1, 80, 60, 'DB'),
  rubro('ING_NOOP', 1, 30, 70, 'CR'),
  rubro('GASTO_NOOP', 1, 60, 80, 'DB'),
]

const DETALLE: ErDetalleFila[] = [
  { rubro_codigo: 'ING_OP', cuenta: '41052501', nombre: 'VENTAS', naturaleza: 'CR', anio: 2026, mes: 1, valor: 1100 },
  { rubro_codigo: 'ING_OP', cuenta: '41750501', nombre: 'DEVOLUCIONES', naturaleza: 'DB', anio: 2026, mes: 1, valor: 100 },
]

const CHEQUEOS: ErChequeoFila[] = [
  { anio: 2026, mes: 1, grupo: '41', naturaleza: 'CR', total_crudo: 1000, total_clasificado: 1000, diferencia: 0 },
  { anio: 2026, mes: 2, grupo: '51', naturaleza: 'DB', total_crudo: 500, total_clasificado: 450, diferencia: 50 },
]

describe('construirModeloEr', () => {
  const modelo = construirModeloEr(DETALLE, RUBROS, CHEQUEOS, 2026)

  it('calcula las líneas derivadas con las fórmulas del PLAN', () => {
    expect(modelo.derivadas.get('TOTAL_INGRESOS')!.valores.get(1)).toBe(1000)
    expect(modelo.derivadas.get('TOTAL_COSTO')!.valores.get(1)).toBe(450) // 300+100+50
    expect(modelo.derivadas.get('UTILIDAD_BRUTA')!.valores.get(1)).toBe(550)
    expect(modelo.derivadas.get('UTILIDAD_OPERACIONAL')!.valores.get(1)).toBe(270) // 550-200-80
    expect(modelo.derivadas.get('UTILIDAD_NETA')!.valores.get(1)).toBe(240) // 270+30-60
  })

  it('detecta meses con datos y arma bloques en orden de rubros', () => {
    expect(modelo.mesesConDatos).toEqual([1, 2])
    expect(modelo.rubros[0].codigo).toBe('ING_OP')
    expect(modelo.rubros[0].cuentas.map((c) => c.cuenta)).toEqual(['41052501', '41750501'])
  })

  it('solo incluye chequeos con diferencia distinta de 0', () => {
    expect(modelo.chequeos).toHaveLength(1)
    expect(modelo.chequeos[0].grupo).toBe('51')
    expect(modelo.chequeos[0].diferencias.get(2)).toBe(50)
  })

  it('modo vertical: % sobre TOTAL INGRESOS del mes', () => {
    const costo = modelo.derivadas.get('TOTAL_COSTO')!
    expect(transformarValor('vertical', costo.valores, 1, modelo)).toBeCloseTo(45)
    expect(transformarTotalAnio('vertical', costo.totalAnio, modelo)).toBeCloseTo((450 / 2200) * 100)
  })

  it('modo horizontal: variación % vs mes anterior con datos; primer mes null', () => {
    const ingresos = modelo.derivadas.get('TOTAL_INGRESOS')!
    expect(transformarValor('horizontal', ingresos.valores, 1, modelo)).toBeNull()
    expect(transformarValor('horizontal', ingresos.valores, 2, modelo)).toBeCloseTo(20)
    expect(transformarTotalAnio('horizontal', ingresos.totalAnio, modelo)).toBeNull()
  })
})

describe('construirModeloBg', () => {
  const filas: BgFila[] = [
    { anio: 2026, mes: 1, clase: '1', grupo: '11', nombre_grupo: 'DISPONIBLE', saldo_final: 500, saldo_presentacion: 500 },
    { anio: 2026, mes: 1, clase: '1', grupo: '13', nombre_grupo: 'DEUDORES', saldo_final: 300, saldo_presentacion: 300 },
    { anio: 2026, mes: 1, clase: '2', grupo: '22', nombre_grupo: 'PROVEEDORES', saldo_final: -350, saldo_presentacion: 350 },
    { anio: 2026, mes: 1, clase: '3', grupo: '31', nombre_grupo: 'CAPITAL', saldo_final: -210, saldo_presentacion: 210 },
    { anio: 2026, mes: 2, clase: '1', grupo: '11', nombre_grupo: 'DISPONIBLE', saldo_final: 700, saldo_presentacion: 700 },
    { anio: 2026, mes: 2, clase: '2', grupo: '22', nombre_grupo: 'PROVEEDORES', saldo_final: -300, saldo_presentacion: 300 },
    { anio: 2026, mes: 2, clase: '3', grupo: '31', nombre_grupo: 'CAPITAL', saldo_final: -210, saldo_presentacion: 210 },
  ]
  const utilidadMensual = new Map([
    [1, 240],
    [2, -50],
  ])
  const modelo = construirModeloBg(filas, utilidadMensual, 2026)

  it('agrupa por sección y totaliza por mes', () => {
    expect(modelo.activo.totales.get(1)).toBe(800)
    expect(modelo.pasivo.totales.get(1)).toBe(350)
    expect(modelo.patrimonio.totales.get(1)).toBe(210)
  })

  it('resultado del ejercicio es acumulado', () => {
    expect(modelo.resultadoEjercicio.get(1)).toBe(240)
    expect(modelo.resultadoEjercicio.get(2)).toBe(190) // 240 + (-50)
  })

  it('cuadre = Activo − (Pasivo + Patrimonio + Resultado)', () => {
    expect(modelo.cuadre.get(1)).toBe(0) // 800 - (350+210+240)
    expect(modelo.cuadre.get(2)).toBe(0) // 700 - (300+210+190)
  })
})

describe('formato contable', () => {
  it('negativos entre paréntesis con miles es-CO', () => {
    expect(contable(1234567.5)).toBe('1.234.567,50')
    expect(contable(-1234.5)).toBe('(1.234,50)')
  })
  it('porcentaje con coma y null como guion', () => {
    expect(porcentaje(12.34)).toBe('12,3 %')
    expect(porcentaje(-5)).toBe('(5,0 %)')
    expect(porcentaje(null)).toBe('—')
  })
})
