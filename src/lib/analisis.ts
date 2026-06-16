import type { ErDetalleFila, ErRubroFila } from '../types/informes'
import { normalizar } from './parserSiigo'
import { monedaCompacta } from './formato'
import { nombreMes } from '../types/balance'
import type { Diccionario } from '../i18n/es'
import { idiomaGlobal } from '../i18n/idioma'

/**
 * Lógica del módulo de Análisis sobre PERÍODOS agregados:
 * vista mensual (año actual), trimestral (últimos 2 años con datos)
 * o anual (últimos 5 años con datos). Todo determinístico desde las vistas del ER.
 */

export type VistaPeriodo = 'mensual' | 'trimestral' | 'anual'

export interface MesAnio {
  anio: number
  mes: number
}

export interface PeriodoAgregado {
  clave: string // '2026-05' | '2026-Q2' | '2026'
  etiqueta: string // 'Mayo 2026' | 'Q2 2026' | '2026'
  etiquetaEje: string // 'May' | 'Q2 26' | '2026' (+ '*' si es parcial)
  parcial: boolean
  meses: MesAnio[]
}

export interface InfoCuenta {
  nombre: string
  naturaleza: 'CR' | 'DB'
  rubro_codigo: string
}

export interface ValoresPeriodo {
  /** codigo de rubro -> total del período */
  rubros: Map<string, number>
  /** cuenta -> valor del período (signo según naturaleza de la cuenta) */
  cuentas: Map<string, number>
}

export interface ModeloAnalisis {
  vista: VistaPeriodo
  periodos: PeriodoAgregado[]
  /** clave de período -> valores */
  valores: Map<string, ValoresPeriodo>
  /** codigo -> { nombre, orden } de rubros_er */
  rubroInfo: Map<string, { nombre: string; orden: number }>
  cuentasInfo: Map<string, InfoCuenta>
  /** Años con datos, ascendente. */
  aniosConDatos: number[]
}

function clavesMeses(rubros: ErRubroFila[]): MesAnio[] {
  const unicos = new Map<number, MesAnio>()
  for (const r of rubros) unicos.set(r.anio * 100 + r.mes, { anio: r.anio, mes: r.mes })
  return [...unicos.entries()].sort((a, b) => a[0] - b[0]).map(([, m]) => m)
}

export function construirPeriodos(mesesConDatos: MesAnio[], vista: VistaPeriodo): PeriodoAgregado[] {
  if (mesesConDatos.length === 0) return []
  const anios = [...new Set(mesesConDatos.map((m) => m.anio))].sort((a, b) => a - b)

  if (vista === 'mensual') {
    const anioActual = anios[anios.length - 1]
    return mesesConDatos
      .filter((m) => m.anio === anioActual)
      .map((m) => ({
        clave: `${m.anio}-${String(m.mes).padStart(2, '0')}`,
        etiqueta: `${nombreMes(m.mes)} ${m.anio}`,
        etiquetaEje: nombreMes(m.mes).slice(0, 3),
        parcial: false,
        meses: [m],
      }))
  }

  if (vista === 'trimestral') {
    const ultimos = anios.slice(-2)
    const periodos: PeriodoAgregado[] = []
    for (const anio of ultimos) {
      for (let q = 1; q <= 4; q++) {
        const meses = mesesConDatos.filter(
          (m) => m.anio === anio && Math.ceil(m.mes / 3) === q
        )
        if (meses.length === 0) continue
        const parcial = meses.length < 3
        periodos.push({
          clave: `${anio}-Q${q}`,
          etiqueta: `Q${q} ${anio}`,
          etiquetaEje: `Q${q} ${String(anio).slice(2)}${parcial ? '*' : ''}`,
          parcial,
          meses,
        })
      }
    }
    return periodos
  }

  // anual
  return anios.slice(-5).map((anio) => {
    const meses = mesesConDatos.filter((m) => m.anio === anio)
    const parcial = meses.length < 12
    return {
      clave: `${anio}`,
      etiqueta: `${anio}`,
      etiquetaEje: `${anio}${parcial ? '*' : ''}`,
      parcial,
      meses,
    }
  })
}

export function construirModeloAnalisis(
  detalle: ErDetalleFila[],
  rubros: ErRubroFila[],
  vista: VistaPeriodo
): ModeloAnalisis {
  const mesesConDatos = clavesMeses(rubros)
  const periodos = construirPeriodos(mesesConDatos, vista)

  const rubroInfo = new Map<string, { nombre: string; orden: number }>()
  for (const r of rubros) {
    if (!rubroInfo.has(r.codigo)) rubroInfo.set(r.codigo, { nombre: r.nombre, orden: r.orden })
  }

  const cuentasInfo = new Map<string, InfoCuenta>()
  for (const d of detalle) {
    if (!cuentasInfo.has(d.cuenta)) {
      cuentasInfo.set(d.cuenta, {
        nombre: d.nombre,
        naturaleza: d.naturaleza,
        rubro_codigo: d.rubro_codigo,
      })
    }
  }

  const valores = new Map<string, ValoresPeriodo>()
  for (const periodo of periodos) {
    const claves = new Set(periodo.meses.map((m) => m.anio * 100 + m.mes))
    const vp: ValoresPeriodo = { rubros: new Map(), cuentas: new Map() }
    for (const r of rubros) {
      if (!claves.has(r.anio * 100 + r.mes)) continue
      vp.rubros.set(r.codigo, (vp.rubros.get(r.codigo) ?? 0) + r.total)
    }
    for (const d of detalle) {
      if (!claves.has(d.anio * 100 + d.mes)) continue
      vp.cuentas.set(d.cuenta, (vp.cuentas.get(d.cuenta) ?? 0) + d.valor)
    }
    valores.set(periodo.clave, vp)
  }

  return {
    vista,
    periodos,
    valores,
    rubroInfo,
    cuentasInfo,
    aniosConDatos: [...new Set(mesesConDatos.map((m) => m.anio))].sort((a, b) => a - b),
  }
}

// ---------- EBITDA: cuentas de depreciación y amortización ----------

const PREFIJOS_DYA = ['5160', '5165', '5260', '5265', '7360']

/**
 * Identifica cuentas de depreciación/amortización en el catálogo del ER:
 * por prefijo PUC (5160, 5165, 5260, 5265, 7360) o por nombre que contenga
 * "depreciaci"/"amortizaci" (sin tildes/mayúsculas) en clases 5 y 7.
 */
export function cuentasDepreciacionAmortizacion(
  cuentasInfo: Map<string, InfoCuenta>
): Map<string, string> {
  const resultado = new Map<string, string>()
  for (const [cuenta, info] of cuentasInfo) {
    const porPrefijo = PREFIJOS_DYA.some((p) => cuenta.startsWith(p))
    const nombreNorm = normalizar(info.nombre)
    const porNombre =
      ['5', '7'].includes(cuenta[0]) &&
      (nombreNorm.includes('depreciaci') || nombreNorm.includes('amortizaci'))
    if (porPrefijo || porNombre) resultado.set(cuenta, info.nombre)
  }
  return resultado
}

// ---------- Derivados por período ----------

export interface DerivadosPeriodo {
  ingresos: number
  utilidadBruta: number
  totalGastos: number // GASTO_ADM + GASTO_VTA
  utilidadOperacional: number
  utilidadNeta: number
  dya: number
  ebitda: number
  costosGastos: number // costo + gastos op. + gastos no op.
  margenBruto: number | null
  margenOperacional: number | null
  margenNeto: number | null
  margenEbitda: number | null
}

export function derivadosPeriodo(
  modelo: ModeloAnalisis,
  clave: string,
  dya: Map<string, string>
): DerivadosPeriodo {
  const vp = modelo.valores.get(clave)
  const r = (codigo: string) => vp?.rubros.get(codigo) ?? 0
  const ingresos = r('ING_OP')
  const totalCosto = r('COSTO_MP') + r('COSTO_PER') + r('COSTO_SER')
  const utilidadBruta = ingresos - totalCosto
  const totalGastos = r('GASTO_ADM') + r('GASTO_VTA')
  const utilidadOperacional = utilidadBruta - totalGastos
  const utilidadNeta = utilidadOperacional + r('ING_NOOP') - r('GASTO_NOOP')
  let totalDya = 0
  for (const cuenta of dya.keys()) totalDya += vp?.cuentas.get(cuenta) ?? 0
  const ebitda = utilidadOperacional + totalDya
  const margen = (v: number) => (ingresos === 0 ? null : (v / ingresos) * 100)
  return {
    ingresos,
    utilidadBruta,
    totalGastos,
    utilidadOperacional,
    utilidadNeta,
    dya: totalDya,
    ebitda,
    costosGastos: totalCosto + totalGastos + r('GASTO_NOOP'),
    margenBruto: margen(utilidadBruta),
    margenOperacional: margen(utilidadOperacional),
    margenNeto: margen(utilidadNeta),
    margenEbitda: margen(ebitda),
  }
}

// ---------- KPIs ----------

export interface KpiAnalisis {
  clave: string
  etiqueta: string
  valor: number
  /** % sobre ingresos del período (margen o peso). */
  porcentaje: number | null
  etiquetaPorcentaje: string
  varAnterior: number | null
  varPromedio: number | null
  /** true: crecer es malo (gastos) — variación al alza en rojo. */
  invertirColor: boolean
}

function variacion(actual: number, base: number): number | null {
  return base === 0 ? null : ((actual - base) / Math.abs(base)) * 100
}

export function periodoAnterior(modelo: ModeloAnalisis, clave: string): PeriodoAgregado | null {
  const indice = modelo.periodos.findIndex((p) => p.clave === clave)
  return indice > 0 ? modelo.periodos[indice - 1] : null
}

export function calcularKpis(
  modelo: ModeloAnalisis,
  clave: string,
  dya: Map<string, string>
): KpiAnalisis[] {
  const todos = modelo.periodos.map((p) => derivadosPeriodo(modelo, p.clave, dya))
  const indice = modelo.periodos.findIndex((p) => p.clave === clave)
  const actual = todos[indice]
  const anterior = indice > 0 ? todos[indice - 1] : null
  const n = Math.max(todos.length, 1)

  const construir = (
    claveKpi: string,
    etiqueta: string,
    valorDe: (d: DerivadosPeriodo) => number,
    porcentaje: number | null,
    etiquetaPorcentaje: string,
    invertirColor = false
  ): KpiAnalisis => {
    const valor = valorDe(actual)
    const promedio = todos.reduce((acc, d) => acc + valorDe(d), 0) / n
    return {
      clave: claveKpi,
      etiqueta,
      valor,
      porcentaje,
      etiquetaPorcentaje,
      varAnterior: anterior === null ? null : variacion(valor, valorDe(anterior)),
      varPromedio: variacion(valor, promedio),
      invertirColor,
    }
  }

  return [
    construir('INGRESOS', 'Ingresos', (d) => d.ingresos, null, ''),
    construir('UTILIDAD_BRUTA', 'Utilidad bruta', (d) => d.utilidadBruta, actual.margenBruto, 'margen'),
    construir(
      'TOTAL_GASTOS',
      'Total gastos',
      (d) => d.totalGastos,
      actual.ingresos === 0 ? null : (actual.totalGastos / actual.ingresos) * 100,
      'de los ingresos',
      true
    ),
    construir('UTILIDAD_NETA', 'Utilidad neta', (d) => d.utilidadNeta, actual.margenNeto, 'margen'),
    construir('EBITDA', 'EBITDA', (d) => d.ebitda, actual.margenEbitda, 'margen EBITDA'),
  ]
}

// ---------- Series para gráficos ----------

export interface SeriePunto {
  clave: string
  etiqueta: string
  parcial: boolean
  ingresos: number
  costosGastos: number
  utilidadNeta: number
  margenBruto: number | null
  margenOperacional: number | null
  margenNeto: number | null
}

export function construirSeries(modelo: ModeloAnalisis, dya: Map<string, string>): SeriePunto[] {
  return modelo.periodos.map((p) => {
    const d = derivadosPeriodo(modelo, p.clave, dya)
    return {
      clave: p.clave,
      etiqueta: p.etiquetaEje,
      parcial: p.parcial,
      ingresos: d.ingresos,
      costosGastos: d.costosGastos,
      utilidadNeta: d.utilidadNeta,
      margenBruto: d.margenBruto,
      margenOperacional: d.margenOperacional,
      margenNeto: d.margenNeto,
    }
  })
}

// ---------- Top variaciones ----------

export interface VariacionCuenta {
  cuenta: string
  nombre: string
  rubro: string
  actual: number
  anterior: number
  delta: number
}

/** Top N cuentas del ER con mayor cambio ABSOLUTO vs el período anterior. */
export function topVariaciones(modelo: ModeloAnalisis, clave: string, n = 10): VariacionCuenta[] {
  const previo = periodoAnterior(modelo, clave)
  if (!previo) return []
  const vpActual = modelo.valores.get(clave)
  const vpPrevio = modelo.valores.get(previo.clave)
  const variaciones: VariacionCuenta[] = []
  const cuentas = new Set([...(vpActual?.cuentas.keys() ?? []), ...(vpPrevio?.cuentas.keys() ?? [])])
  for (const cuenta of cuentas) {
    const actual = vpActual?.cuentas.get(cuenta) ?? 0
    const anterior = vpPrevio?.cuentas.get(cuenta) ?? 0
    const delta = actual - anterior
    if (delta === 0) continue
    const info = modelo.cuentasInfo.get(cuenta)
    variaciones.push({
      cuenta,
      nombre: info?.nombre ?? cuenta,
      rubro: modelo.rubroInfo.get(info?.rubro_codigo ?? '')?.nombre ?? info?.rubro_codigo ?? '',
      actual,
      anterior,
      delta,
    })
  }
  return variaciones.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, n)
}

// ---------- Lectura del período ----------

/** Textos que necesita la lectura: la sección `analisis.lectura` y los rubros del diccionario. */
export interface TextosLectura {
  lectura: Diccionario['analisis']['lectura']
  rubros: Diccionario['rubros']
}

/** 3-5 frases determinísticas redactadas con el diccionario activo, adaptadas a la vista. */
export function lecturaDelPeriodo(
  modelo: ModeloAnalisis,
  clave: string,
  dya: Map<string, string>,
  textos: TextosLectura,
  /** Traduce el nombre de cuenta al idioma activo (por defecto, identidad). */
  traducirNombre: (cuenta: string, nombre: string) => string = (_c, nombre) => nombre
): string[] {
  const periodo = modelo.periodos.find((p) => p.clave === clave)
  if (!periodo) return []
  const { lectura, rubros } = textos
  const frases: string[] = []
  const sustantivo = lectura.sustantivo[modelo.vista]
  const ambito = modelo.vista === 'mensual' ? lectura.ambitoMensual : lectura.ambitoRango
  const nombreRubro = (codigo: string, alternativo: string) => rubros[codigo] ?? alternativo
  const todos = modelo.periodos.map((p) => ({
    periodo: p,
    derivados: derivadosPeriodo(modelo, p.clave, dya),
  }))
  const actual = todos.find((t) => t.periodo.clave === clave)!

  // 1) Posición del período en ingresos
  const ranking = [...todos].sort((a, b) => b.derivados.ingresos - a.derivados.ingresos)
  const posicion = ranking.findIndex((t) => t.periodo.clave === clave) + 1
  const nota = periodo.parcial ? lectura.notaParcial : ''
  const ingresos = monedaCompacta(actual.derivados.ingresos)
  if (posicion === 1) {
    frases.push(lectura.mejor(periodo.etiqueta, sustantivo, ambito, ingresos, nota))
  } else if (posicion === todos.length) {
    frases.push(lectura.masBajo(periodo.etiqueta, sustantivo, ambito, ingresos, nota))
  } else {
    frases.push(
      lectura.puesto(
        periodo.etiqueta,
        posicion,
        todos.length,
        lectura.sustantivoPlural[modelo.vista],
        ambito,
        ingresos,
        nota
      )
    )
  }

  const previo = periodoAnterior(modelo, clave)
  if (previo) {
    const anterior = todos.find((t) => t.periodo.clave === previo.clave)!

    // 2) Margen neto: subió o bajó
    if (actual.derivados.margenNeto !== null && anterior.derivados.margenNeto !== null) {
      const puntos = actual.derivados.margenNeto - anterior.derivados.margenNeto
      const fmt = (v: number) => porcentajeCorto(v)
      frases.push(
        lectura.margen(
          puntos >= 0,
          fmt(anterior.derivados.margenNeto),
          fmt(actual.derivados.margenNeto),
          fmt(Math.abs(puntos)),
          previo.etiqueta
        )
      )
    }

    // 3) Rubro de costo/gasto que más creció
    const codigosCostoGasto = ['COSTO_MP', 'COSTO_PER', 'COSTO_SER', 'GASTO_ADM', 'GASTO_VTA', 'GASTO_NOOP']
    let mayor: { nombre: string; delta: number } | null = null
    for (const codigo of codigosCostoGasto) {
      const delta =
        (modelo.valores.get(clave)?.rubros.get(codigo) ?? 0) -
        (modelo.valores.get(previo.clave)?.rubros.get(codigo) ?? 0)
      if (!mayor || delta > mayor.delta) {
        mayor = {
          nombre: nombreRubro(codigo, modelo.rubroInfo.get(codigo)?.nombre ?? codigo),
          delta,
        }
      }
    }
    if (mayor && mayor.delta > 0) {
      frases.push(lectura.rubroCrecio(mayor.nombre, monedaCompacta(mayor.delta), previo.etiqueta))
    }

    // 4) Cuenta con la variación más fuerte
    const [top] = topVariaciones(modelo, clave, 1)
    if (top) {
      const info = modelo.cuentasInfo.get(top.cuenta)
      frases.push(
        lectura.cuentaFuerte(
          top.cuenta,
          traducirNombre(top.cuenta, top.nombre),
          nombreRubro(info?.rubro_codigo ?? '', top.rubro),
          top.delta > 0,
          monedaCompacta(Math.abs(top.delta)),
          previo.etiqueta
        )
      )
    }
  }

  // 5) Utilidad neta vs promedio
  const promedio =
    todos.reduce((acc, t) => acc + t.derivados.utilidadNeta, 0) / Math.max(todos.length, 1)
  if (promedio !== 0) {
    frases.push(
      lectura.vsPromedio(
        sustantivo,
        monedaCompacta(actual.derivados.utilidadNeta),
        actual.derivados.utilidadNeta >= promedio,
        ambito,
        monedaCompacta(promedio)
      )
    )
  }

  return frases.slice(0, 5)
}

/** Porcentaje con 1 decimal y separador del idioma activo, sin el símbolo %. */
function porcentajeCorto(valor: number): string {
  const texto = valor.toFixed(1)
  return idiomaGlobal() === 'en' ? texto : texto.replace('.', ',')
}
