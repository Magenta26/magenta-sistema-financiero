import type { FilaBalance, Periodo, Validacion } from '../types/balance'
import { nombreMes } from '../types/balance'
import { moneda } from './formato'
import type { Diccionario } from '../i18n/es'

/**
 * Validaciones de una carga (PLAN.md sección 5, punto 3).
 * ⛔ bloqueante: impide confirmar. ⚠️ advertencia / ℹ️ info: solo se muestran.
 * Los mensajes salen del diccionario activo (es/en).
 */

export type TextosValidaciones = Diccionario['validaciones']

const TOLERANCIA = 1 // $1 por redondeo

export function validarBalance(
  opciones: {
    encabezadosFaltantes: string[]
    /** Período efectivo: el detectado por el parser o el seleccionado manualmente. */
    periodo: Periodo | null
    filas: FilaBalance[]
    /** Códigos del catálogo (para detectar cuentas sin cubrir). */
    cuentasCatalogo: string[]
  },
  textos: TextosValidaciones
): Validacion[] {
  const { encabezadosFaltantes, periodo, filas, cuentasCatalogo } = opciones
  const validaciones: Validacion[] = []
  const transaccionales = filas.filter((f) => f.transaccional)

  // ⛔ Encabezados requeridos
  if (encabezadosFaltantes.length > 0) {
    validaciones.push({
      tipo: 'bloqueante',
      mensaje: textos.faltanEncabezados,
      detalle: textos.faltanEncabezadosDetalle(encabezadosFaltantes.join(', ')),
    })
    return validaciones // sin columnas no hay nada más que validar
  }

  // ⛔ Período
  if (!periodo) {
    validaciones.push({
      tipo: 'bloqueante',
      mensaje: textos.periodoNoDetectado,
      detalle: textos.periodoNoDetectadoDetalle,
    })
  } else {
    validaciones.push({
      tipo: 'info',
      mensaje: textos.periodoInfo(`${nombreMes(periodo.mes)} ${periodo.anio}`),
    })
  }

  // ⛔ Filas transaccionales
  if (transaccionales.length === 0) {
    validaciones.push({
      tipo: 'bloqueante',
      mensaje: textos.sinTransaccionales,
      detalle: textos.sinTransaccionalesDetalle,
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
        textos.claseDescuadradaDetalle(
          clase.cuenta,
          clase.nombre_cuenta,
          moneda(sumaAuxiliares),
          moneda(clase.saldo_final),
          moneda(diferencia)
        )
      )
    }
  }
  if (descuadradas.length > 0) {
    validaciones.push({
      tipo: 'advertencia',
      mensaje: textos.clasesDescuadradas,
      detalle: descuadradas.join(' · '),
    })
  } else {
    validaciones.push({ tipo: 'info', mensaje: textos.clasesOk })
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
      mensaje: textos.ecuacionDescuadrada,
      detalle: textos.ecuacionDetalle(
        moneda(activo),
        moneda(pasivo),
        moneda(patrimonio),
        moneda(resultado),
        moneda(diferenciaEcuacion)
      ),
    })
  } else {
    validaciones.push({ tipo: 'info', mensaje: textos.ecuacionOk })
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
      mensaje: textos.cuentasNuevas(sinCubrir.length),
      detalle:
        muestra +
        (sinCubrir.length > 15 ? textos.cuentasNuevasDetalleExtra(sinCubrir.length - 15) : '') +
        textos.cuentasNuevasDetalleFin,
    })
  }

  return validaciones
}
