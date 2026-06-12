import { utils, writeFileXLSX } from 'xlsx'
import { nombreMes } from '../types/balance'
import type { ModoBg, ModoEr } from '../types/informes'
import type { ModeloEr } from './estadoResultados'
import { transformarTotalAnio, transformarValor } from './estadoResultados'
import type { ModeloBg } from './balanceGeneral'

const EMPRESA = 'Magenta Farms S.A.S. — NIT 901.479.899-9'

const NOMBRE_MODO: Record<ModoEr, string> = {
  absolutos: 'Absolutos',
  vertical: 'Vertical (% sobre ingresos)',
  horizontal: 'Horizontal (variación % vs mes anterior)',
}

function encabezado(titulo: string, subtitulo: string): unknown[][] {
  return [
    [EMPRESA],
    [titulo],
    [subtitulo],
    [`Generado: ${new Date().toLocaleString('es-CO')}`],
    [],
  ]
}

/** Exporta el ER del modo activo a un .xlsx (descarga en el navegador). */
export function exportarEr(modelo: ModeloEr, modo: ModoEr): void {
  const meses = modelo.mesesConDatos
  const cabecera = ['Línea', ...meses.map((m) => nombreMes(m)), 'Total año']

  const filaDe = (etiqueta: string, valores: Map<number, number>, totalAnio: number): unknown[] => [
    etiqueta,
    ...meses.map((mes) => transformarValor(modo, valores, mes, modelo)),
    transformarTotalAnio(modo, totalAnio, modelo),
  ]

  const filas: unknown[][] = [cabecera]
  for (const bloque of modelo.rubros) {
    for (const cuenta of bloque.cuentas) {
      filas.push(filaDe(`    ${cuenta.cuenta} ${cuenta.nombre}`, cuenta.valores, cuenta.totalAnio))
    }
    filas.push(filaDe(bloque.nombre.toUpperCase(), bloque.valores, bloque.totalAnio))

    if (bloque.codigo === 'ING_OP') filas.push(filaDerivada('TOTAL_INGRESOS'))
    if (bloque.codigo === 'COSTO_SER') {
      filas.push(filaDerivada('TOTAL_COSTO'), filaDerivada('UTILIDAD_BRUTA'))
    }
    if (bloque.codigo === 'GASTO_VTA') filas.push(filaDerivada('UTILIDAD_OPERACIONAL'))
    if (bloque.codigo === 'GASTO_NOOP') filas.push(filaDerivada('UTILIDAD_NETA'))
  }

  function filaDerivada(clave: string): unknown[] {
    const linea = modelo.derivadas.get(clave)!
    return filaDe(linea.etiqueta, linea.valores, linea.totalAnio)
  }

  if (modelo.chequeos.length > 0) {
    filas.push([])
    filas.push(['CHEQUEOS POR GRUPO (diferencia crudo vs clasificado)'])
    for (const ch of modelo.chequeos) {
      filas.push([
        `Chequeo grupo ${ch.grupo}`,
        ...meses.map((mes) => ch.diferencias.get(mes) ?? 0),
        [...ch.diferencias.values()].reduce((a, b) => a + b, 0),
      ])
    }
  }

  const hoja = utils.aoa_to_sheet([
    ...encabezado(`Estado de Resultados ${modelo.anio}`, `Modo: ${NOMBRE_MODO[modo]}`),
    ...filas,
  ])
  hoja['!cols'] = [{ wch: 45 }, ...meses.map(() => ({ wch: 16 })), { wch: 18 }]
  const libro = utils.book_new()
  utils.book_append_sheet(libro, hoja, `ER ${modelo.anio}`)
  writeFileXLSX(libro, `Estado_Resultados_${modelo.anio}_${modo}.xlsx`)
}

const NOMBRE_MODO_BG: Record<ModoBg, string> = {
  saldos: 'Saldos (saldo final por mes)',
  variacion: 'Variación del mes (saldo final − saldo inicial)',
}

/** Exporta el BG del modo activo a un .xlsx (descarga en el navegador). */
export function exportarBg(modelo: ModeloBg, modo: ModoBg = 'saldos'): void {
  const meses = modelo.mesesConDatos
  const esVariacion = modo === 'variacion'
  const cabecera = [
    'Línea',
    ...meses.map((m) => nombreMes(m)),
    ...(esVariacion ? ['Total año'] : []),
  ]
  const filas: unknown[][] = [cabecera]

  for (const seccion of [modelo.activo, modelo.pasivo, modelo.patrimonio]) {
    filas.push([seccion.titulo.toUpperCase()])
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
      `TOTAL ${seccion.titulo.toUpperCase()}`,
      ...meses.map((mes) =>
        esVariacion ? seccion.totalesVariacion.get(mes) ?? 0 : seccion.totales.get(mes) ?? 0
      ),
      ...(esVariacion ? [seccion.totalVariacionAnio] : []),
    ])
    if (seccion.clase === '3') {
      if (esVariacion) {
        filas.push([
          'Utilidad neta del mes (desde el ER)',
          ...meses.map((mes) => modelo.utilidadNetaMensual.get(mes) ?? 0),
          meses.reduce((acc, mes) => acc + (modelo.utilidadNetaMensual.get(mes) ?? 0), 0),
        ])
      } else {
        filas.push([
          'Resultado del ejercicio (utilidad acumulada)',
          ...meses.map((mes) => modelo.resultadoEjercicio.get(mes) ?? 0),
        ])
      }
    }
  }

  filas.push([])
  filas.push([
    esVariacion
      ? 'CUADRE: var. Activo − (var. Pasivo + var. Patrimonio + utilidad del mes)'
      : 'CUADRE: Activo − (Pasivo + Patrimonio + Resultado)',
    ...meses.map((mes) =>
      esVariacion ? modelo.cuadreVariacion.get(mes) ?? 0 : modelo.cuadre.get(mes) ?? 0
    ),
  ])

  const hoja = utils.aoa_to_sheet([
    ...encabezado(`Balance General ${modelo.anio}`, `Modo: ${NOMBRE_MODO_BG[modo]}`),
    ...filas,
  ])
  hoja['!cols'] = [{ wch: 45 }, ...meses.map(() => ({ wch: 16 })), ...(esVariacion ? [{ wch: 18 }] : [])]
  const libro = utils.book_new()
  utils.book_append_sheet(libro, hoja, `BG ${modelo.anio}`)
  writeFileXLSX(libro, `Balance_General_${modelo.anio}_${modo}.xlsx`)
}
