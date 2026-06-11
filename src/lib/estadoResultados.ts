import type { ErChequeoFila, ErDetalleFila, ErRubroFila, ModoEr } from '../types/informes'

/**
 * Modelo del Estado de Resultados (PLAN.md secciones 4 y 6).
 * Derivados:
 *   TOTAL INGRESOS      = ING_OP
 *   TOTAL COSTO         = COSTO_MP + COSTO_PER + COSTO_SER
 *   UTILIDAD BRUTA      = ING_OP − TOTAL COSTO
 *   UTILIDAD OPERACIONAL= UTILIDAD BRUTA − GASTO_ADM − GASTO_VTA
 *   UTILIDAD NETA       = UTILIDAD OPERACIONAL + ING_NOOP − GASTO_NOOP
 */

export interface LineaCuenta {
  cuenta: string
  nombre: string
  /** mes -> valor absoluto */
  valores: Map<number, number>
  totalAnio: number
}

export interface BloqueRubro {
  codigo: string
  nombre: string
  cuentas: LineaCuenta[]
  valores: Map<number, number>
  totalAnio: number
}

export interface LineaDerivada {
  clave: string
  etiqueta: string
  valores: Map<number, number>
  totalAnio: number
}

export interface LineaChequeo {
  grupo: string
  /** mes -> diferencia (solo meses con diferencia ≠ 0) */
  diferencias: Map<number, number>
}

export interface ModeloEr {
  anio: number
  /** Meses (1-12) con datos cargados. */
  mesesConDatos: number[]
  rubros: BloqueRubro[]
  derivadas: Map<string, LineaDerivada>
  chequeos: LineaChequeo[]
}

function sumarMapas(...mapas: Map<number, number>[]): Map<number, number> {
  const resultado = new Map<number, number>()
  for (const mapa of mapas) {
    for (const [mes, valor] of mapa) resultado.set(mes, (resultado.get(mes) ?? 0) + valor)
  }
  return resultado
}

function restarMapas(a: Map<number, number>, ...restas: Map<number, number>[]): Map<number, number> {
  const resultado = new Map(a)
  for (const mapa of restas) {
    for (const [mes, valor] of mapa) resultado.set(mes, (resultado.get(mes) ?? 0) - valor)
  }
  return resultado
}

function totalDe(valores: Map<number, number>): number {
  let total = 0
  for (const v of valores.values()) total += v
  return total
}

export function construirModeloEr(
  detalle: ErDetalleFila[],
  rubros: ErRubroFila[],
  chequeos: ErChequeoFila[],
  anio: number
): ModeloEr {
  const delAnio = <T extends { anio: number }>(filas: T[]) => filas.filter((f) => f.anio === anio)
  const detalleAnio = delAnio(detalle)
  const rubrosAnio = delAnio(rubros)
  const chequeosAnio = delAnio(chequeos)

  const mesesConDatos = [...new Set(rubrosAnio.map((r) => r.mes))].sort((a, b) => a - b)

  // Bloques por rubro, en el orden de rubros_er
  const ordenRubros = [...new Map(rubrosAnio.map((r) => [r.codigo, r])).values()].sort(
    (a, b) => a.orden - b.orden
  )
  const bloques: BloqueRubro[] = ordenRubros.map((rubro) => {
    const cuentasMap = new Map<string, LineaCuenta>()
    for (const d of detalleAnio.filter((d) => d.rubro_codigo === rubro.codigo)) {
      let linea = cuentasMap.get(d.cuenta)
      if (!linea) {
        linea = { cuenta: d.cuenta, nombre: d.nombre, valores: new Map(), totalAnio: 0 }
        cuentasMap.set(d.cuenta, linea)
      }
      linea.valores.set(d.mes, (linea.valores.get(d.mes) ?? 0) + d.valor)
    }
    const cuentas = [...cuentasMap.values()]
      .map((c) => ({ ...c, totalAnio: totalDe(c.valores) }))
      .sort((a, b) => a.cuenta.localeCompare(b.cuenta))

    const valores = new Map<number, number>()
    for (const r of rubrosAnio.filter((r) => r.codigo === rubro.codigo)) {
      valores.set(r.mes, r.total)
    }
    return { codigo: rubro.codigo, nombre: rubro.nombre, cuentas, valores, totalAnio: totalDe(valores) }
  })

  const valoresDe = (codigo: string) =>
    bloques.find((b) => b.codigo === codigo)?.valores ?? new Map<number, number>()

  const ingOp = valoresDe('ING_OP')
  const totalCosto = sumarMapas(valoresDe('COSTO_MP'), valoresDe('COSTO_PER'), valoresDe('COSTO_SER'))
  const utilidadBruta = restarMapas(ingOp, totalCosto)
  const utilidadOperacional = restarMapas(utilidadBruta, valoresDe('GASTO_ADM'), valoresDe('GASTO_VTA'))
  const utilidadNeta = restarMapas(
    sumarMapas(utilidadOperacional, valoresDe('ING_NOOP')),
    valoresDe('GASTO_NOOP')
  )

  const derivadas = new Map<string, LineaDerivada>(
    (
      [
        ['TOTAL_INGRESOS', 'TOTAL INGRESOS', ingOp],
        ['TOTAL_COSTO', 'TOTAL COSTO', totalCosto],
        ['UTILIDAD_BRUTA', 'UTILIDAD BRUTA', utilidadBruta],
        ['UTILIDAD_OPERACIONAL', 'UTILIDAD OPERACIONAL', utilidadOperacional],
        ['UTILIDAD_NETA', 'UTILIDAD NETA', utilidadNeta],
      ] as const
    ).map(([clave, etiqueta, valores]) => [
      clave,
      { clave, etiqueta, valores, totalAnio: totalDe(valores) },
    ])
  )

  // Chequeos: solo grupos con alguna diferencia distinta de 0 (tolerancia medio centavo)
  const chequeosPorGrupo = new Map<string, Map<number, number>>()
  for (const ch of chequeosAnio) {
    if (Math.abs(ch.diferencia) < 0.005) continue
    let mapa = chequeosPorGrupo.get(ch.grupo)
    if (!mapa) {
      mapa = new Map()
      chequeosPorGrupo.set(ch.grupo, mapa)
    }
    mapa.set(ch.mes, ch.diferencia)
  }
  const lineasChequeo = [...chequeosPorGrupo.entries()]
    .map(([grupo, diferencias]) => ({ grupo, diferencias }))
    .sort((a, b) => a.grupo.localeCompare(b.grupo))

  return { anio, mesesConDatos, rubros: bloques, derivadas, chequeos: lineasChequeo }
}

/**
 * Transforma un valor absoluto al modo de visualización.
 * - vertical: % sobre TOTAL INGRESOS del mes (null si ingresos = 0)
 * - horizontal: variación % vs el mes anterior CON DATOS (null para el primero o si el anterior es 0)
 * Devuelve null cuando no aplica (se muestra "—").
 */
export function transformarValor(
  modo: ModoEr,
  valores: Map<number, number>,
  mes: number,
  modelo: ModeloEr
): number | null {
  const valor = valores.get(mes) ?? 0
  if (modo === 'absolutos') return valor
  if (modo === 'vertical') {
    const ingresos = modelo.derivadas.get('TOTAL_INGRESOS')!.valores.get(mes) ?? 0
    return ingresos === 0 ? null : (valor / ingresos) * 100
  }
  // horizontal
  const indice = modelo.mesesConDatos.indexOf(mes)
  if (indice <= 0) return null
  const mesAnterior = modelo.mesesConDatos[indice - 1]
  const anterior = valores.get(mesAnterior) ?? 0
  if (anterior === 0) return null
  return ((valor - anterior) / Math.abs(anterior)) * 100
}

/** Total año transformado: absolutos = suma; vertical = % sobre ingresos del año; horizontal no aplica. */
export function transformarTotalAnio(
  modo: ModoEr,
  totalAnio: number,
  modelo: ModeloEr
): number | null {
  if (modo === 'absolutos') return totalAnio
  if (modo === 'vertical') {
    const ingresosAnio = modelo.derivadas.get('TOTAL_INGRESOS')!.totalAnio
    return ingresosAnio === 0 ? null : (totalAnio / ingresosAnio) * 100
  }
  return null
}
