/**
 * Helpers puros de la Natillera (selector de año, código de empleado, saldos).
 * La resolución del reporte mensual (compute-on-read) vive en
 * `natilleraReporte.ts`.
 */
import type { EmpleadoNatillera, NovedadNatillera, SaldoInicialNatillera } from '../types/natillera'

/**
 * Siguiente código de empleado con el patrón EMP-###: toma el mayor número con
 * ese formato entre los códigos existentes y le suma 1, con relleno a 3 dígitos
 * (mínimo). Si no hay ninguno con el patrón, arranca en EMP-001. Otros formatos
 * de código se ignoran para el conteo (no rompen la sugerencia).
 */
export function siguienteCodigoEmpleado(codigos: (string | null | undefined)[]): string {
  let max = 0
  for (const c of codigos) {
    const m = /^EMP-(\d+)$/.exec((c ?? '').trim())
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `EMP-${String(max + 1).padStart(3, '0')}`
}

/** Año de una fecha 'YYYY-MM-DD'; null si vacía/ inválida. */
function anioDeFecha(fecha: string | null | undefined): number | null {
  if (!fecha) return null
  const anio = Number(fecha.split('-')[0])
  return Number.isFinite(anio) ? anio : null
}

/**
 * Años disponibles para el selector (de mayor a menor, sin repetidos):
 * el año en curso SIEMPRE, más los años con datos relevantes — ingreso/retiro de
 * empleados, novedades y saldos iniciales.
 */
export function aniosNatillera(
  empleados: Pick<EmpleadoNatillera, 'fecha_ingreso' | 'fecha_retiro'>[],
  novedades: Pick<NovedadNatillera, 'anio'>[],
  saldos: Pick<SaldoInicialNatillera, 'anio'>[],
  anioEnCurso: number
): number[] {
  const set = new Set<number>([anioEnCurso])
  for (const e of empleados) {
    const ing = anioDeFecha(e.fecha_ingreso)
    if (ing != null) set.add(ing)
    const ret = anioDeFecha(e.fecha_retiro)
    if (ret != null) set.add(ret)
  }
  for (const n of novedades) set.add(n.anio)
  for (const s of saldos) set.add(s.anio)
  return [...set].sort((a, b) => b - a)
}

/**
 * Año a mostrar por defecto: la elección del usuario si sigue disponible; si no,
 * el preferido (periodo_actual) si está disponible; si no, el más reciente.
 */
export function anioNatilleraPorDefecto(
  anioElegido: number | null,
  disponibles: number[],
  anioPreferido: number | null
): number | null {
  if (anioElegido != null && disponibles.includes(anioElegido)) return anioElegido
  if (anioPreferido != null && disponibles.includes(anioPreferido)) return anioPreferido
  return disponibles[0] ?? null
}

/** Saldo inicial de (empleado, año) desde el mapa keyed `${id}:${anio}`; 0 si no hay. */
export function saldoInicialDe(saldos: Map<string, number>, empleadoId: string, anio: number): number {
  return saldos.get(`${empleadoId}:${anio}`) ?? 0
}

/**
 * Nombre a mostrar de un empleado de la natillera: el `nombre_completo` de la
 * ficha central `empleados` si está vinculado; si no (externo), el `nombre`
 * local. No cambia la lógica de aportes; solo de dónde sale el texto.
 */
export function nombreMostrado(
  emp: Pick<EmpleadoNatillera, 'nombre' | 'nombre_completo'>
): string {
  return emp.nombre_completo?.trim() ? emp.nombre_completo : emp.nombre
}

/** true si la fila no está vinculada a la ficha central `empleados` (externo). */
export function esExterno(emp: Pick<EmpleadoNatillera, 'empleado_id'>): boolean {
  return emp.empleado_id == null
}
