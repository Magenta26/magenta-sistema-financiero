/**
 * Lógica pura del módulo PAGO A EXTERNOS.
 * Entrega 1: catálogo. Entrega 2: producción + liquidación quincenal.
 * Sin acceso a red ni a React; testeable de forma aislada.
 */
import { siguienteCodigoConPrefijo } from './natillera'
import type {
  DeduccionExterno,
  Externo,
  Quincena,
  RegistroExterno,
  TarifasExternos,
} from '../types/externos'
import type { EmpleadoNatillera } from '../types/natillera'

/**
 * Siguiente código de externo (EXT-###) entre los códigos del catálogo. Reusa el
 * helper genérico de prefijos de la natillera (mismo formato con relleno a 3).
 */
export function siguienteCodigoExterno(codigos: (string | null | undefined)[]): string {
  return siguienteCodigoConPrefijo(codigos, 'EXT')
}

/**
 * Valida el código del catálogo: requerido + único (case-insensitive). Al editar
 * se excluye el código propio (`codigoActual`). Devuelve la clave del error o
 * null si es válido.
 */
export function validarCodigoExterno(
  codigo: string,
  codigosExistentes: (string | null | undefined)[],
  codigoActual?: string | null
): 'requerido' | 'duplicado' | null {
  const limpio = codigo.trim().toLowerCase()
  if (limpio === '') return 'requerido'
  const actual = (codigoActual ?? '').trim().toLowerCase()
  const otros = codigosExistentes
    .map((c) => (c ?? '').trim().toLowerCase())
    .filter((c) => c !== '' && c !== actual)
  return otros.includes(limpio) ? 'duplicado' : null
}

/**
 * Opciones de natillera para el vínculo: empleados ACTIVOS de la natillera (los
 * que ahorran), ordenados por código. Se usan para el dropdown "¿Ahorra en la
 * natillera?". Si una opción ya está vinculada a otro externo, igual se muestra
 * (no se fuerza unicidad del vínculo en la Entrega 1).
 */
export function opcionesNatillera(empleados: EmpleadoNatillera[]): EmpleadoNatillera[] {
  return empleados
    .filter((e) => e.activo)
    .slice()
    .sort((a, b) => (a.codigo ?? '').localeCompare(b.codigo ?? ''))
}

/** Filtra el catálogo por nombre, código o cédula (case-insensitive, parcial). */
export function filtrarExternos(externos: Externo[], busqueda: string): Externo[] {
  const q = busqueda.trim().toLowerCase()
  if (q === '') return externos
  return externos.filter(
    (e) =>
      e.nombre_completo.toLowerCase().includes(q) ||
      e.codigo.toLowerCase().includes(q) ||
      (e.cedula ?? '').toLowerCase().includes(q)
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Entrega 2 — Producción + liquidación quincenal (lógica pura, es dinero real).
// ════════════════════════════════════════════════════════════════════════════

/** Tarifas por defecto (fallback si la fila de config no se cargó; la fuente
 *  real es `externos_tarifas`). NO usar para sobreescribir lo que venga de la BD. */
export const TARIFAS_DEFECTO: TarifasExternos = {
  maquillada_valor: 85,
  hydratada_valor: 65,
  hora_valor: 10000,
}

const dos = (n: number) => String(n).padStart(2, '0')

/** Último día del mes (mes 1–12). Maneja febrero 28/29 con el calendario real. */
export function ultimoDiaDelMes(anio: number, mes: number): number {
  // El día 0 del mes siguiente es el último del mes pedido (mes ya es 1-indexado).
  return new Date(anio, mes, 0).getDate()
}

/**
 * Rango de fechas [inicio, fin] (YYYY-MM-DD, inclusivo) de una quincena FIJA:
 * quincena 1 = días 1–15 · quincena 2 = días 16–último día del mes.
 */
export function rangoQuincena(
  anio: number,
  mes: number,
  quincena: Quincena
): { inicio: string; fin: string } {
  const mm = dos(mes)
  if (quincena === 1) return { inicio: `${anio}-${mm}-01`, fin: `${anio}-${mm}-15` }
  return { inicio: `${anio}-${mm}-16`, fin: `${anio}-${mm}-${dos(ultimoDiaDelMes(anio, mes))}` }
}

/** ¿La fecha 'YYYY-MM-DD' cae dentro de la quincena (anio, mes, quincena)? */
export function fechaEnQuincena(
  fecha: string,
  anio: number,
  mes: number,
  quincena: Quincena
): boolean {
  const { inicio, fin } = rangoQuincena(anio, mes, quincena)
  // Comparación lexicográfica: válida para fechas ISO 'YYYY-MM-DD'.
  return fecha >= inicio && fecha <= fin
}

/** Quincena que contiene el día de hoy (default del selector de liquidación). */
export function quincenaActual(hoy: { anio: number; mes: number; dia: number }): {
  anio: number
  mes: number
  quincena: Quincena
} {
  return { anio: hoy.anio, mes: hoy.mes, quincena: hoy.dia <= 15 ? 1 : 2 }
}

/** Registros de un externo que caen en la quincena. */
export function registrosDeQuincena(
  registros: RegistroExterno[],
  anio: number,
  mes: number,
  quincena: Quincena
): RegistroExterno[] {
  return registros.filter((r) => fechaEnQuincena(r.fecha, anio, mes, quincena))
}

/** Totales de producción (cantidades y $) de un conjunto de registros. */
export interface TotalesProduccion {
  maquillada_tallos: number
  hydratada_tallos: number
  horas: number
  maquillada_valor: number
  hydratada_valor: number
  horas_valor: number
  /** Pago bruto = maquillada$ + hydratada$ + horas$. */
  bruto: number
}

export function totalesProduccion(
  registros: RegistroExterno[],
  tarifas: TarifasExternos
): TotalesProduccion {
  let maq = 0
  let hyd = 0
  let hrs = 0
  for (const r of registros) {
    maq += r.maquillada_tallos
    hyd += r.hydratada_tallos
    hrs += r.horas
  }
  const maquillada_valor = maq * tarifas.maquillada_valor
  const hydratada_valor = hyd * tarifas.hydratada_valor
  const horas_valor = hrs * tarifas.hora_valor
  return {
    maquillada_tallos: maq,
    hydratada_tallos: hyd,
    horas: hrs,
    maquillada_valor,
    hydratada_valor,
    horas_valor,
    bruto: maquillada_valor + hydratada_valor + horas_valor,
  }
}

/**
 * Deducción de natillera (AUTOMÁTICA) de una quincena = 50% de la cuota mensual
 * del registro vinculado (el ahorro mensual se parte en 2 quincenas). 0 si el
 * externo no ahorra (sin `natillera_empleado_id`). No se persiste; se calcula al
 * vuelo. Se redondea al peso (COP sin decimales).
 */
export function deduccionNatillera(externo: Externo, cuotaMensual: number): number {
  if (!externo.natillera_empleado_id) return 0
  return Math.round(cuotaMensual * 0.5)
}

/** Suma de las deducciones manuales (préstamo / otras) de una quincena. */
export function totalDeduccionesManuales(deducciones: DeduccionExterno[]): number {
  return deducciones.reduce((acc, d) => acc + d.valor, 0)
}

/** Línea de liquidación de un externo en una quincena. */
export interface LineaLiquidacion {
  externo: Externo
  produccion: TotalesProduccion
  deduccionNatillera: number
  deduccionesManuales: number
  /** TOTAL A PAGAR = bruto − natillera − manuales. */
  totalAPagar: number
}

/**
 * Liquida un externo a partir de SUS registros y SUS deducciones manuales de la
 * quincena, las tarifas y la cuota mensual del registro de natillera vinculado
 * (0 si no ahorra). Funciones puras: el filtrado por quincena se hace antes.
 */
export function liquidarExterno(
  externo: Externo,
  registrosQuincena: RegistroExterno[],
  deduccionesQuincena: DeduccionExterno[],
  tarifas: TarifasExternos,
  cuotaMensual: number
): LineaLiquidacion {
  const produccion = totalesProduccion(registrosQuincena, tarifas)
  const dedNat = deduccionNatillera(externo, cuotaMensual)
  const dedMan = totalDeduccionesManuales(deduccionesQuincena)
  return {
    externo,
    produccion,
    deduccionNatillera: dedNat,
    deduccionesManuales: dedMan,
    totalAPagar: produccion.bruto - dedNat - dedMan,
  }
}

/** Totales (fila de pie) de una liquidación completa. */
export interface TotalesLiquidacion {
  maquillada_tallos: number
  hydratada_tallos: number
  horas: number
  maquillada_valor: number
  hydratada_valor: number
  horas_valor: number
  bruto: number
  deduccionNatillera: number
  deduccionesManuales: number
  totalAPagar: number
}

/**
 * Construye la liquidación de la quincena: una línea por externo CON producción
 * en el período (los demás se omiten), ordenadas por código, más los totales de
 * pie. Recibe los datos completos y filtra por quincena internamente.
 */
export function construirLiquidacion(
  externos: Externo[],
  registros: RegistroExterno[],
  deducciones: DeduccionExterno[],
  tarifas: TarifasExternos,
  cuotaPorNatId: Map<string, number>,
  anio: number,
  mes: number,
  quincena: Quincena
): { lineas: LineaLiquidacion[]; totales: TotalesLiquidacion } {
  const regsPorExterno = new Map<string, RegistroExterno[]>()
  for (const r of registros) {
    if (!fechaEnQuincena(r.fecha, anio, mes, quincena)) continue
    const arr = regsPorExterno.get(r.externo_id)
    if (arr) arr.push(r)
    else regsPorExterno.set(r.externo_id, [r])
  }
  const dedPorExterno = new Map<string, DeduccionExterno[]>()
  for (const d of deducciones) {
    if (d.anio !== anio || d.quincena !== quincena) continue
    const arr = dedPorExterno.get(d.externo_id)
    if (arr) arr.push(d)
    else dedPorExterno.set(d.externo_id, [d])
  }

  const lineas: LineaLiquidacion[] = []
  for (const externo of externos) {
    const regs = regsPorExterno.get(externo.id) ?? []
    // Solo se liquida quien tiene producción en la quincena.
    if (regs.length === 0) continue
    const cuota = externo.natillera_empleado_id
      ? cuotaPorNatId.get(externo.natillera_empleado_id) ?? 0
      : 0
    lineas.push(liquidarExterno(externo, regs, dedPorExterno.get(externo.id) ?? [], tarifas, cuota))
  }
  lineas.sort((a, b) => a.externo.codigo.localeCompare(b.externo.codigo))

  const totales: TotalesLiquidacion = {
    maquillada_tallos: 0,
    hydratada_tallos: 0,
    horas: 0,
    maquillada_valor: 0,
    hydratada_valor: 0,
    horas_valor: 0,
    bruto: 0,
    deduccionNatillera: 0,
    deduccionesManuales: 0,
    totalAPagar: 0,
  }
  for (const l of lineas) {
    totales.maquillada_tallos += l.produccion.maquillada_tallos
    totales.hydratada_tallos += l.produccion.hydratada_tallos
    totales.horas += l.produccion.horas
    totales.maquillada_valor += l.produccion.maquillada_valor
    totales.hydratada_valor += l.produccion.hydratada_valor
    totales.horas_valor += l.produccion.horas_valor
    totales.bruto += l.produccion.bruto
    totales.deduccionNatillera += l.deduccionNatillera
    totales.deduccionesManuales += l.deduccionesManuales
    totales.totalAPagar += l.totalAPagar
  }
  return { lineas, totales }
}
