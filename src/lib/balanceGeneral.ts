import type { BgFila } from '../types/informes'

/**
 * Modelo del Balance General (PLAN.md secciones 4 y 6).
 * Pasivo y patrimonio en positivo (saldo_presentacion de v_bg).
 * "Resultado del ejercicio" = utilidad neta acumulada del año hasta cada mes.
 * Cuadre por mes: Activo − (Pasivo + Patrimonio + Resultado del ejercicio).
 */

export interface LineaGrupo {
  grupo: string
  nombre: string
  /** mes -> saldo_presentacion */
  valores: Map<number, number>
}

export interface SeccionBg {
  clase: '1' | '2' | '3'
  titulo: string
  grupos: LineaGrupo[]
  /** mes -> total de la sección */
  totales: Map<number, number>
}

export interface ModeloBg {
  anio: number
  mesesConDatos: number[]
  activo: SeccionBg
  pasivo: SeccionBg
  patrimonio: SeccionBg
  /** mes -> utilidad neta acumulada del año hasta ese mes */
  resultadoEjercicio: Map<number, number>
  /** mes -> Activo − (Pasivo + Patrimonio + Resultado) */
  cuadre: Map<number, number>
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
  for (const f of deClase) {
    let linea = gruposMap.get(f.grupo)
    if (!linea) {
      linea = { grupo: f.grupo, nombre: f.nombre_grupo, valores: new Map() }
      gruposMap.set(f.grupo, linea)
    }
    linea.valores.set(f.mes, (linea.valores.get(f.mes) ?? 0) + f.saldo_presentacion)
    totales.set(f.mes, (totales.get(f.mes) ?? 0) + f.saldo_presentacion)
  }
  const grupos = [...gruposMap.values()].sort((a, b) => a.grupo.localeCompare(b.grupo))
  return { clase, titulo: TITULOS[clase], grupos, totales }
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
  for (const mes of mesesConDatos) {
    cuadre.set(
      mes,
      (activo.totales.get(mes) ?? 0) -
        ((pasivo.totales.get(mes) ?? 0) +
          (patrimonio.totales.get(mes) ?? 0) +
          (resultadoEjercicio.get(mes) ?? 0))
    )
  }

  return { anio, mesesConDatos, activo, pasivo, patrimonio, resultadoEjercicio, cuadre }
}
