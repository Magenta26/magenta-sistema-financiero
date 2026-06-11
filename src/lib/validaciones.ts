import type { FilaBalance, Periodo, Validacion } from '../types/balance'
import { nombreMes } from '../types/balance'

/**
 * Validaciones de una carga (PLAN.md sección 5, punto 3).
 * ⛔ bloqueante: impide confirmar. ⚠️ advertencia / ℹ️ info: solo se muestran.
 */

const TOLERANCIA = 1 // $1 por redondeo

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 2,
})

function moneda(valor: number): string {
  return formatoCOP.format(valor)
}

export function validarBalance(opciones: {
  encabezadosFaltantes: string[]
  /** Período efectivo: el detectado por el parser o el seleccionado manualmente. */
  periodo: Periodo | null
  filas: FilaBalance[]
  /** Códigos del catálogo (para detectar cuentas sin cubrir). */
  cuentasCatalogo: string[]
}): Validacion[] {
  const { encabezadosFaltantes, periodo, filas, cuentasCatalogo } = opciones
  const validaciones: Validacion[] = []
  const transaccionales = filas.filter((f) => f.transaccional)

  // ⛔ Encabezados requeridos
  if (encabezadosFaltantes.length > 0) {
    validaciones.push({
      tipo: 'bloqueante',
      mensaje: 'No se encontraron todos los encabezados requeridos.',
      detalle: `Faltan: ${encabezadosFaltantes.join(', ')}. ¿Es un balance de prueba exportado de SIIGO?`,
    })
    return validaciones // sin columnas no hay nada más que validar
  }

  // ⛔ Período
  if (!periodo) {
    validaciones.push({
      tipo: 'bloqueante',
      mensaje: 'Período no detectado.',
      detalle: 'Selecciona el mes y el año manualmente para continuar.',
    })
  } else {
    validaciones.push({
      tipo: 'info',
      mensaje: `Período: ${nombreMes(periodo.mes)} ${periodo.anio}.`,
    })
  }

  // ⛔ Filas transaccionales
  if (transaccionales.length === 0) {
    validaciones.push({
      tipo: 'bloqueante',
      mensaje: 'El archivo no contiene filas transaccionales.',
      detalle: 'No hay movimientos que importar.',
    })
    return validaciones
  }

  // ⚠️ Suma de auxiliares (transaccionales) vs saldo final de cada Clase
  const clases = filas.filter((f) => f.nivel === 'Clase')
  const descuadradas: string[] = []
  for (const clase of clases) {
    const sumaAuxiliares = transaccionales
      .filter((f) => f.clase === clase.cuenta)
      .reduce((acc, f) => acc + f.saldo_final, 0)
    const diferencia = sumaAuxiliares - clase.saldo_final
    if (Math.abs(diferencia) > TOLERANCIA) {
      descuadradas.push(
        `Clase ${clase.cuenta} (${clase.nombre_cuenta}): auxiliares ${moneda(sumaAuxiliares)} vs clase ${moneda(clase.saldo_final)} (dif. ${moneda(diferencia)})`
      )
    }
  }
  if (descuadradas.length > 0) {
    validaciones.push({
      tipo: 'advertencia',
      mensaje: 'La suma de auxiliares no cuadra con el total de alguna clase.',
      detalle: descuadradas.join(' · '),
    })
  } else {
    validaciones.push({
      tipo: 'info',
      mensaje: 'Suma de auxiliares = total de cada clase ✓',
    })
  }

  // ⚠️ Ecuación contable con saldos finales:
  // Activo = Pasivo + Patrimonio + (Ingresos − Gastos − Costos)
  // Convención SIIGO: clases 2, 3 y 4 vienen con saldo negativo (naturaleza crédito).
  const sumaClase = (clase: string) =>
    transaccionales.filter((f) => f.clase === clase).reduce((acc, f) => acc + f.saldo_final, 0)
  const activo = sumaClase('1')
  const pasivo = -sumaClase('2')
  const patrimonio = -sumaClase('3')
  const ingresos = -sumaClase('4')
  const gastos = sumaClase('5')
  const costos = sumaClase('6') + sumaClase('7')
  const resultado = ingresos - gastos - costos
  const diferenciaEcuacion = activo - (pasivo + patrimonio + resultado)
  if (Math.abs(diferenciaEcuacion) > TOLERANCIA) {
    validaciones.push({
      tipo: 'advertencia',
      mensaje: 'La ecuación contable no cuadra.',
      detalle: `Activo ${moneda(activo)} vs Pasivo ${moneda(pasivo)} + Patrimonio ${moneda(patrimonio)} + Resultado ${moneda(resultado)} → diferencia ${moneda(diferenciaEcuacion)}`,
    })
  } else {
    validaciones.push({
      tipo: 'info',
      mensaje: 'Ecuación contable Activo = Pasivo + Patrimonio + Resultado ✓',
    })
  }

  // ℹ️ Cuentas transaccionales no cubiertas por ningún prefijo del catálogo
  const sinCubrir = transaccionales.filter(
    (f) => !cuentasCatalogo.some((codigo) => f.cuenta.startsWith(codigo))
  )
  if (sinCubrir.length > 0) {
    const muestra = sinCubrir
      .slice(0, 15)
      .map((f) => `${f.cuenta} ${f.nombre_cuenta}`)
      .join(' · ')
    validaciones.push({
      tipo: 'info',
      mensaje: `${sinCubrir.length} cuenta(s) nueva(s) que no están en el catálogo.`,
      detalle:
        muestra +
        (sinCubrir.length > 15 ? ` · … y ${sinCubrir.length - 15} más` : '') +
        '. Se agregarán automáticamente al confirmar (quedan pendientes de clasificar).',
    })
  }

  return validaciones
}
