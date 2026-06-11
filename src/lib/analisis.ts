import type { ModeloEr } from './estadoResultados'
import { monedaCompacta } from './formato'
import { nombreMes } from '../types/balance'

/**
 * Lógica del módulo de Análisis (PLAN.md sección 6):
 * KPIs del mes, series para gráficos, top variaciones y "lectura del mes".
 * Todo determinístico a partir del modelo del ER.
 */

const valorDerivada = (modelo: ModeloEr, clave: string, mes: number): number =>
  modelo.derivadas.get(clave)?.valores.get(mes) ?? 0

export interface SerieMensual {
  mes: number
  etiqueta: string
  ingresos: number
  costosGastos: number
  utilidadNeta: number
  margenBruto: number | null
  margenOperacional: number | null
  margenNeto: number | null
}

export function construirSeries(modelo: ModeloEr): SerieMensual[] {
  return modelo.mesesConDatos.map((mes) => {
    const ingresos = valorDerivada(modelo, 'TOTAL_INGRESOS', mes)
    const rubro = (codigo: string) =>
      modelo.rubros.find((r) => r.codigo === codigo)?.valores.get(mes) ?? 0
    const costosGastos =
      valorDerivada(modelo, 'TOTAL_COSTO', mes) +
      rubro('GASTO_ADM') +
      rubro('GASTO_VTA') +
      rubro('GASTO_NOOP')
    const margen = (clave: string) =>
      ingresos === 0 ? null : (valorDerivada(modelo, clave, mes) / ingresos) * 100
    return {
      mes,
      etiqueta: nombreMes(mes).slice(0, 3),
      ingresos,
      costosGastos,
      utilidadNeta: valorDerivada(modelo, 'UTILIDAD_NETA', mes),
      margenBruto: margen('UTILIDAD_BRUTA'),
      margenOperacional: margen('UTILIDAD_OPERACIONAL'),
      margenNeto: margen('UTILIDAD_NETA'),
    }
  })
}

export interface Kpi {
  clave: string
  etiqueta: string
  valor: number
  /** % sobre ingresos del mes (null para la tarjeta de ingresos). */
  margen: number | null
  /** Variación % vs mes anterior con datos (null si no hay anterior o anterior = 0). */
  varMesAnterior: number | null
  /** Variación % vs promedio de los meses cargados del año. */
  varPromedio: number | null
}

function variacion(actual: number, base: number): number | null {
  return base === 0 ? null : ((actual - base) / Math.abs(base)) * 100
}

export function mesAnteriorConDatos(modelo: ModeloEr, mes: number): number | null {
  const indice = modelo.mesesConDatos.indexOf(mes)
  return indice > 0 ? modelo.mesesConDatos[indice - 1] : null
}

export function calcularKpis(modelo: ModeloEr, mes: number): Kpi[] {
  const anterior = mesAnteriorConDatos(modelo, mes)
  const ingresosMes = valorDerivada(modelo, 'TOTAL_INGRESOS', mes)

  const construir = (clave: string, etiqueta: string, conMargen: boolean): Kpi => {
    const linea = modelo.derivadas.get(clave)!
    const valor = linea.valores.get(mes) ?? 0
    const promedio =
      modelo.mesesConDatos.reduce((acc, m) => acc + (linea.valores.get(m) ?? 0), 0) /
      Math.max(modelo.mesesConDatos.length, 1)
    return {
      clave,
      etiqueta,
      valor,
      margen: conMargen && ingresosMes !== 0 ? (valor / ingresosMes) * 100 : null,
      varMesAnterior:
        anterior === null ? null : variacion(valor, linea.valores.get(anterior) ?? 0),
      varPromedio: variacion(valor, promedio),
    }
  }

  return [
    construir('TOTAL_INGRESOS', 'Ingresos', false),
    construir('UTILIDAD_BRUTA', 'Utilidad bruta', true),
    construir('UTILIDAD_OPERACIONAL', 'Utilidad operacional', true),
    construir('UTILIDAD_NETA', 'Utilidad neta', true),
  ]
}

/** Utilidad neta acumulada del año hasta el mes indicado (inclusive). */
export function utilidadNetaAcumulada(modelo: ModeloEr, hastaMes: number): number {
  const linea = modelo.derivadas.get('UTILIDAD_NETA')!
  return modelo.mesesConDatos
    .filter((m) => m <= hastaMes)
    .reduce((acc, m) => acc + (linea.valores.get(m) ?? 0), 0)
}

export interface VariacionCuenta {
  cuenta: string
  nombre: string
  rubro: string
  actual: number
  anterior: number
  delta: number
}

/** Top N cuentas del ER con mayor cambio ABSOLUTO vs el mes anterior con datos. */
export function topVariaciones(modelo: ModeloEr, mes: number, n = 10): VariacionCuenta[] {
  const anterior = mesAnteriorConDatos(modelo, mes)
  if (anterior === null) return []
  const variaciones: VariacionCuenta[] = []
  for (const bloque of modelo.rubros) {
    for (const cuenta of bloque.cuentas) {
      const actual = cuenta.valores.get(mes) ?? 0
      const previo = cuenta.valores.get(anterior) ?? 0
      const delta = actual - previo
      if (delta !== 0) {
        variaciones.push({
          cuenta: cuenta.cuenta,
          nombre: cuenta.nombre,
          rubro: bloque.nombre,
          actual,
          anterior: previo,
          delta,
        })
      }
    }
  }
  return variaciones.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, n)
}

/** "Lectura del mes": 3-5 frases determinísticas en español natural. */
export function lecturaDelMes(modelo: ModeloEr, mes: number): string[] {
  const frases: string[] = []
  const nombre = nombreMes(mes)
  const ingresos = modelo.derivadas.get('TOTAL_INGRESOS')!

  // 1) Posición del mes en ingresos dentro del año
  const ranking = [...modelo.mesesConDatos].sort(
    (a, b) => (ingresos.valores.get(b) ?? 0) - (ingresos.valores.get(a) ?? 0)
  )
  const posicion = ranking.indexOf(mes) + 1
  const ingresosMes = ingresos.valores.get(mes) ?? 0
  if (posicion === 1) {
    frases.push(
      `${nombre} es el mejor mes del año en ingresos (${monedaCompacta(ingresosMes)}).`
    )
  } else if (posicion === ranking.length) {
    frases.push(
      `${nombre} es el mes más bajo del año en ingresos (${monedaCompacta(ingresosMes)}).`
    )
  } else {
    frases.push(
      `${nombre} ocupa el puesto ${posicion} de ${ranking.length} meses del año en ingresos (${monedaCompacta(ingresosMes)}).`
    )
  }

  const anterior = mesAnteriorConDatos(modelo, mes)
  if (anterior !== null) {
    const nombreAnterior = nombreMes(anterior)

    // 2) Margen neto: subió o bajó
    const margenDe = (m: number) => {
      const ing = ingresos.valores.get(m) ?? 0
      return ing === 0 ? null : ((valorDerivada(modelo, 'UTILIDAD_NETA', m) ?? 0) / ing) * 100
    }
    const margenActual = margenDe(mes)
    const margenAnterior = margenDe(anterior)
    if (margenActual !== null && margenAnterior !== null) {
      const puntos = margenActual - margenAnterior
      const direccion = puntos >= 0 ? 'subió' : 'bajó'
      frases.push(
        `El margen neto ${direccion} de ${margenAnterior.toFixed(1).replace('.', ',')} % a ${margenActual.toFixed(1).replace('.', ',')} % (${Math.abs(puntos).toFixed(1).replace('.', ',')} puntos).`
      )
    }

    // 3) Rubro de costo/gasto que más creció
    const rubrosCostoGasto = modelo.rubros.filter((r) =>
      ['COSTO_MP', 'COSTO_PER', 'COSTO_SER', 'GASTO_ADM', 'GASTO_VTA', 'GASTO_NOOP'].includes(r.codigo)
    )
    let mayorCrecimiento: { nombre: string; delta: number } | null = null
    for (const rubro of rubrosCostoGasto) {
      const delta = (rubro.valores.get(mes) ?? 0) - (rubro.valores.get(anterior) ?? 0)
      if (!mayorCrecimiento || delta > mayorCrecimiento.delta) {
        mayorCrecimiento = { nombre: rubro.nombre, delta }
      }
    }
    if (mayorCrecimiento && mayorCrecimiento.delta > 0) {
      frases.push(
        `El rubro que más creció frente a ${nombreAnterior} fue ${mayorCrecimiento.nombre.toLowerCase()}: +${monedaCompacta(mayorCrecimiento.delta)}.`
      )
    }

    // 4) Cuenta con la variación más fuerte
    const [top] = topVariaciones(modelo, mes, 1)
    if (top) {
      const signo = top.delta > 0 ? 'aumentó' : 'disminuyó'
      frases.push(
        `La cuenta con la variación más fuerte fue ${top.cuenta} ${top.nombre} (${top.rubro.toLowerCase()}): ${signo} ${monedaCompacta(Math.abs(top.delta))} frente a ${nombreAnterior}.`
      )
    }
  }

  // 5) Utilidad neta vs promedio del año
  const neta = modelo.derivadas.get('UTILIDAD_NETA')!
  const valorNeta = neta.valores.get(mes) ?? 0
  const promedio =
    modelo.mesesConDatos.reduce((acc, m) => acc + (neta.valores.get(m) ?? 0), 0) /
    Math.max(modelo.mesesConDatos.length, 1)
  if (promedio !== 0) {
    const relacion = valorNeta >= promedio ? 'por encima' : 'por debajo'
    frases.push(
      `La utilidad neta del mes (${monedaCompacta(valorNeta)}) está ${relacion} del promedio del año (${monedaCompacta(promedio)}).`
    )
  }

  return frases.slice(0, 5)
}
