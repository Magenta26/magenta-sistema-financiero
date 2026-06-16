import { utils, writeFileXLSX } from 'xlsx'
import { nombreMes } from '../types/balance'
import type { ModoBg, ModoEr } from '../types/informes'
import type { ModeloEr } from './estadoResultados'
import { transformarTotalAnio, transformarValor } from './estadoResultados'
import type { ModeloBg } from './balanceGeneral'
import { localeActual } from '../i18n/idioma'
import type { Diccionario } from '../i18n/es'

/** Exports a Excel en el idioma activo: encabezados y nombres de línea del diccionario. */

function encabezado(t: Diccionario, titulo: string, subtitulo: string): unknown[][] {
  return [
    [t.exportar.empresa],
    [titulo],
    [subtitulo],
    [t.exportar.unidades],
    [t.exportar.generado(new Date().toLocaleString(localeActual()))],
    [],
  ]
}

/** Nota financiera mínima para el export (el comentario viaja con las cifras). */
export interface NotaExport {
  mes: number
  contenido: string
}

/** Exporta el ER del modo activo a un .xlsx (descarga en el navegador). */
export function exportarEr(
  modelo: ModeloEr,
  modo: ModoEr,
  t: Diccionario,
  notas: NotaExport[] = []
): void {
  const meses = modelo.mesesConDatos
  const cabecera = [t.comun.linea, ...meses.map((m) => nombreMes(m)), t.comun.totalAnio]

  const filaDe = (etiqueta: string, valores: Map<number, number>, totalAnio: number): unknown[] => [
    etiqueta,
    ...meses.map((mes) => transformarValor(modo, valores, mes, modelo)),
    transformarTotalAnio(modo, totalAnio, modelo),
  ]

  const filaDerivada = (clave: string): unknown[] => {
    const linea = modelo.derivadas.get(clave)!
    return filaDe(t.derivadas[clave] ?? linea.etiqueta, linea.valores, linea.totalAnio)
  }

  const filas: unknown[][] = [cabecera]
  for (const bloque of modelo.rubros) {
    for (const cuenta of bloque.cuentas) {
      filas.push(filaDe(`    ${cuenta.cuenta} ${cuenta.nombre}`, cuenta.valores, cuenta.totalAnio))
    }
    const nombreRubro = t.rubros[bloque.codigo] ?? bloque.nombre
    filas.push(filaDe(nombreRubro.toUpperCase(), bloque.valores, bloque.totalAnio))

    if (bloque.codigo === 'ING_OP') filas.push(filaDerivada('TOTAL_INGRESOS'))
    if (bloque.codigo === 'COSTO_SER') {
      filas.push(filaDerivada('TOTAL_COSTO'), filaDerivada('UTILIDAD_BRUTA'))
    }
    if (bloque.codigo === 'GASTO_VTA') filas.push(filaDerivada('UTILIDAD_OPERACIONAL'))
    if (bloque.codigo === 'GASTO_NOOP') filas.push(filaDerivada('UTILIDAD_NETA'))
  }

  if (modelo.chequeos.length > 0) {
    filas.push([])
    filas.push([t.exportar.chequeosTitulo])
    for (const ch of modelo.chequeos) {
      filas.push([
        t.exportar.chequeoGrupo(ch.grupo),
        ...meses.map((mes) => ch.diferencias.get(mes) ?? 0),
        [...ch.diferencias.values()].reduce((a, b) => a + b, 0),
      ])
    }
  }

  // Notas financieras de los meses visibles (el comentario viaja con las cifras).
  const notasVisibles = notas
    .filter((n) => meses.includes(n.mes) && n.contenido.trim() !== '')
    .sort((a, b) => a.mes - b.mes)
  if (notasVisibles.length > 0) {
    filas.push([])
    filas.push([t.exportar.notasTitulo])
    for (const n of notasVisibles) {
      filas.push([t.exportar.notaMes(nombreMes(n.mes)), n.contenido])
    }
  }

  const hoja = utils.aoa_to_sheet([
    ...encabezado(t, t.exportar.erTitulo(modelo.anio), t.exportar.modo(t.exportar.modoEr[modo])),
    ...filas,
  ])
  hoja['!cols'] = [{ wch: 45 }, ...meses.map(() => ({ wch: 16 })), { wch: 18 }]
  const libro = utils.book_new()
  utils.book_append_sheet(libro, hoja, t.exportar.erHoja(modelo.anio))
  writeFileXLSX(libro, t.exportar.erArchivo(modelo.anio, modo))
}

/** Exporta el BG del modo activo a un .xlsx (descarga en el navegador). */
export function exportarBg(modelo: ModeloBg, modo: ModoBg, t: Diccionario): void {
  const meses = modelo.mesesConDatos
  const esVariacion = modo === 'variacion'
  const cabecera = [
    t.comun.linea,
    ...meses.map((m) => nombreMes(m)),
    ...(esVariacion ? [t.comun.totalAnio] : []),
  ]
  const filas: unknown[][] = [cabecera]

  for (const seccion of [modelo.activo, modelo.pasivo, modelo.patrimonio]) {
    const titulo = t.bg.secciones[seccion.clase] ?? seccion.titulo
    filas.push([titulo.toUpperCase()])
    for (const grupo of seccion.grupos) {
      filas.push([
        `    ${grupo.grupo} ${grupo.nombre}`,
        ...meses.map((mes) =>
          esVariacion ? grupo.variaciones.get(mes) ?? 0 : grupo.valores.get(mes) ?? 0
        ),
        ...(esVariacion ? [grupo.totalVariacionAnio] : []),
      ])
    }
    filas.push([
      t.bg.totalSeccion(titulo),
      ...meses.map((mes) =>
        esVariacion ? seccion.totalesVariacion.get(mes) ?? 0 : seccion.totales.get(mes) ?? 0
      ),
      ...(esVariacion ? [seccion.totalVariacionAnio] : []),
    ])
    if (seccion.clase === '3') {
      if (esVariacion) {
        filas.push([
          t.exportar.bgUtilidadMes,
          ...meses.map((mes) => modelo.utilidadNetaMensual.get(mes) ?? 0),
          meses.reduce((acc, mes) => acc + (modelo.utilidadNetaMensual.get(mes) ?? 0), 0),
        ])
      } else {
        filas.push([
          t.exportar.bgResultado,
          ...meses.map((mes) => modelo.resultadoEjercicio.get(mes) ?? 0),
        ])
      }
    }
  }

  filas.push([])
  filas.push([
    esVariacion ? t.exportar.bgCuadreVariacion : t.exportar.bgCuadreSaldos,
    ...meses.map((mes) =>
      esVariacion ? modelo.cuadreVariacion.get(mes) ?? 0 : modelo.cuadre.get(mes) ?? 0
    ),
  ])

  const hoja = utils.aoa_to_sheet([
    ...encabezado(t, t.exportar.bgTitulo(modelo.anio), t.exportar.modo(t.exportar.modoBg[modo])),
    ...filas,
  ])
  hoja['!cols'] = [{ wch: 45 }, ...meses.map(() => ({ wch: 16 })), ...(esVariacion ? [{ wch: 18 }] : [])]
  const libro = utils.book_new()
  utils.book_append_sheet(libro, hoja, t.exportar.bgHoja(modelo.anio))
  writeFileXLSX(libro, t.exportar.bgArchivo(modelo.anio, modo))
}
