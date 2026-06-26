import { utils, writeFileXLSX } from 'xlsx'
import { nombreMes } from '../types/balance'
import type { ModoBg, ModoEr } from '../types/informes'
import type { ModeloEr } from './estadoResultados'
import { transformarTotalAnio, transformarValor } from './estadoResultados'
import type { ModeloBg } from './balanceGeneral'
import { localeActual } from '../i18n/idioma'
import type { Diccionario } from '../i18n/es'
import { nombreCuentaTexto } from './nombreCuenta'
import type { MapaTraducciones } from './nombreCuenta'
import type { LineaLiquidacion, TotalesLiquidacion } from './externos'
import type { Quincena } from '../types/externos'

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
  notas: NotaExport[] = [],
  traducciones: MapaTraducciones = new Map(),
  ventasEfectivo: Map<number, number> = new Map()
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
      filas.push(
        filaDe(
          `    ${cuenta.cuenta} ${nombreCuentaTexto(traducciones, cuenta.cuenta, cuenta.nombre)}`,
          cuenta.valores,
          cuenta.totalAnio
        )
      )
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

  // Rubros independientes al final (después de Utilidad Neta).
  const lineaEbitda = modelo.derivadas.get('EBITDA')!
  filas.push(filaDe(t.er.ebitda, lineaEbitda.valores, lineaEbitda.totalAnio))
  const totalVentas = meses.reduce((acc, mes) => acc + (ventasEfectivo.get(mes) ?? 0), 0)
  filas.push(filaDe(t.er.ventasEfectivo, ventasEfectivo, totalVentas))

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
export function exportarBg(
  modelo: ModeloBg,
  modo: ModoBg,
  t: Diccionario,
  traducciones: MapaTraducciones = new Map()
): void {
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
        `    ${grupo.grupo} ${nombreCuentaTexto(traducciones, grupo.grupo, grupo.nombre)}`,
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

/** Exporta la liquidación quincenal de externos a un .xlsx (descarga). */
export function exportarLiquidacionExternos(
  lineas: LineaLiquidacion[],
  totales: TotalesLiquidacion,
  periodo: { anio: number; mes: number; quincena: Quincena },
  t: Diccionario
): void {
  const x = t.externos
  const subtitulo = `${nombreMes(periodo.mes)} ${periodo.anio} — ${
    periodo.quincena === 1 ? x.quincena.primera : x.quincena.segunda
  }`

  const cabecera = [
    x.colCodigo,
    x.colNombre,
    `${x.liq.maquilladaTallos}`,
    `${x.liq.maquilladaValor}`,
    `${x.liq.hydratadaTallos}`,
    `${x.liq.hydratadaValor}`,
    `${x.liq.horasCant}`,
    `${x.liq.horasValor}`,
    x.liq.bruto,
    x.liq.dedNatillera,
    x.liq.dedManuales,
    x.liq.totalPagar,
  ]

  const filas: unknown[][] = [cabecera]
  for (const l of lineas) {
    filas.push([
      l.externo.codigo,
      l.externo.nombre_completo,
      l.produccion.maquillada_tallos,
      l.produccion.maquillada_valor,
      l.produccion.hydratada_tallos,
      l.produccion.hydratada_valor,
      l.produccion.horas,
      l.produccion.horas_valor,
      l.produccion.bruto,
      l.deduccionNatillera,
      l.deduccionesManuales,
      l.totalAPagar,
    ])
  }
  filas.push([
    x.liq.totalesFila,
    '',
    totales.maquillada_tallos,
    totales.maquillada_valor,
    totales.hydratada_tallos,
    totales.hydratada_valor,
    totales.horas,
    totales.horas_valor,
    totales.bruto,
    totales.deduccionNatillera,
    totales.deduccionesManuales,
    totales.totalAPagar,
  ])

  const hoja = utils.aoa_to_sheet([
    ...encabezado(t, x.liq.exportTitulo, subtitulo),
    ...filas,
  ])
  hoja['!cols'] = [
    { wch: 12 },
    { wch: 28 },
    ...Array.from({ length: 10 }, () => ({ wch: 14 })),
  ]
  const libro = utils.book_new()
  utils.book_append_sheet(libro, hoja, x.liq.exportHoja)
  writeFileXLSX(libro, x.liq.exportArchivo(periodo.anio, periodo.mes, periodo.quincena))
}
