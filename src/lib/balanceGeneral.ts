import type { BgFila } from '../types/informes'

/**
 * Modelo del Balance General (PLAN.md secciones 4 y 6).
 * Dos modos:
 *  - Saldos: saldo final por grupo y mes, pasivo/patrimonio en positivo.
 *    Cuadre: Activo − (Pasivo + Patrimonio + Resultado del ejercicio acumulado).
 *  - Variación del mes: saldo_final − saldo_inicial de cada mes (impacto neto
 *    del período, con signo de presentación). Total año = suma de variaciones
 *    (= saldo final del último mes − saldo inicial del primero).
 *    Cuadre: var. Activo − (var. Pasivo + var. Patrimonio + utilidad neta del mes).
 */

export interface LineaGrupo {
  grupo: string
  nombre: string
  /** mes -> saldo_presentacion */
  valores: Map<number, number>
  /** mes -> variacion_presentacion */
  variaciones: Map<number, number>
  /** Suma de las variaciones del año. */
  totalVariacionAnio: number
}

export interface SeccionBg {
  clase: '1' | '2' | '3'
  titulo: string
  grupos: LineaGrupo[]
  /** mes -> total de la sección (saldos) */
  totales: Map<number, number>
  /** mes -> total de la sección (variaciones) */
  totalesVariacion: Map<number, number>
  totalVariacionAnio: number
}

export interface ModeloBg {
  anio: number
  mesesConDatos: number[]
  activo: SeccionBg
  pasivo: SeccionBg
  patrimonio: SeccionBg
  /** mes -> utilidad neta MENSUAL del ER. */
  utilidadNetaMensual: Map<number, number>
  /** mes -> utilidad neta acumulada del año hasta ese mes. */
  resultadoEjercicio: Map<number, number>
  /** Saldos: mes -> Activo − (Pasivo + Patrimonio + Resultado acumulado). */
  cuadre: Map<number, number>
  /** Variación: mes -> var.Activo − (var.Pasivo + var.Patrimonio + utilidad del mes). */
  cuadreVariacion: Map<number, number>
}

const TITULOS: Record<'1' | '2' | '3', string> = {
  '1': 'Activo',
  '2': 'Pasivo',
  '3': 'Patrimonio',
}

function construirSeccion(filas: BgFila[], clase: '1' | '2' | '3'): SeccionBg {
  const deClase = filas.filter((f) => f.clase === clase)
  const gruposMap = new Map<string, LineaGrupo>()
  const totales = new Map<number, number>()
  const totalesVariacion = new Map<number, number>()
  for (const f of deClase) {
    let linea = gruposMap.get(f.grupo)
    if (!linea) {
      linea = {
        grupo: f.grupo,
        nombre: f.nombre_grupo,
        valores: new Map(),
        variaciones: new Map(),
        totalVariacionAnio: 0,
      }
      gruposMap.set(f.grupo, linea)
    }
    linea.valores.set(f.mes, (linea.valores.get(f.mes) ?? 0) + f.saldo_presentacion)
    linea.variaciones.set(f.mes, (linea.variaciones.get(f.mes) ?? 0) + f.variacion_presentacion)
    totales.set(f.mes, (totales.get(f.mes) ?? 0) + f.saldo_presentacion)
    totalesVariacion.set(f.mes, (totalesVariacion.get(f.mes) ?? 0) + f.variacion_presentacion)
  }
  const grupos = [...gruposMap.values()]
    .map((g) => ({
      ...g,
      totalVariacionAnio: [...g.variaciones.values()].reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => a.grupo.localeCompare(b.grupo))
  return {
    clase,
    titulo: TITULOS[clase],
    grupos,
    totales,
    totalesVariacion,
    totalVariacionAnio: grupos.reduce((acc, g) => acc + g.totalVariacionAnio, 0),
  }
}

export function construirModeloBg(
  filasBg: BgFila[],
  /** mes -> utilidad neta MENSUAL del ER (no acumulada) */
  utilidadNetaMensual: Map<number, number>,
  anio: number
): ModeloBg {
  const filasAnio = filasBg.filter((f) => f.anio === anio)
  const mesesConDatos = [...new Set(filasAnio.map((f) => f.mes))].sort((a, b) => a - b)

  const activo = construirSeccion(filasAnio, '1')
  const pasivo = construirSeccion(filasAnio, '2')
  const patrimonio = construirSeccion(filasAnio, '3')

  // Utilidad neta acumulada hasta cada mes con datos
  const resultadoEjercicio = new Map<number, number>()
  let acumulado = 0
  for (const mes of mesesConDatos) {
    acumulado += utilidadNetaMensual.get(mes) ?? 0
    resultadoEjercicio.set(mes, acumulado)
  }

  const cuadre = new Map<number, number>()
  const cuadreVariacion = new Map<number, number>()
  for (const mes of mesesConDatos) {
    cuadre.set(
      mes,
      (activo.totales.get(mes) ?? 0) -
        ((pasivo.totales.get(mes) ?? 0) +
          (patrimonio.totales.get(mes) ?? 0) +
          (resultadoEjercicio.get(mes) ?? 0))
    )
    cuadreVariacion.set(
      mes,
      (activo.totalesVariacion.get(mes) ?? 0) -
        ((pasivo.totalesVariacion.get(mes) ?? 0) +
          (patrimonio.totalesVariacion.get(mes) ?? 0) +
          (utilidadNetaMensual.get(mes) ?? 0))
    )
  }

  return {
    anio,
    mesesConDatos,
    activo,
    pasivo,
    patrimonio,
    utilidadNetaMensual,
    resultadoEjercicio,
    cuadre,
    cuadreVariacion,
  }
}
