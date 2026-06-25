/**
 * Lógica pura de la LISTA de empleados (/nomina/empleados): antigüedad desde la
 * fecha de ingreso, promedio, conteo por área, filtrado, orden y la
 * clasificación de área/contrato para los íconos y badges. Todo testeable; la
 * presentación (colores Tailwind, íconos JSX) vive en el componente.
 */
import type { Empleado } from '../types/empleados'

export type ClaveOrden = 'nombre' | 'area' | 'contrato' | 'antiguedad' | 'codigo'
export type DireccionOrden = 'asc' | 'desc'

/** Sentinela del chip "Sin área" (empleados con `equipo` vacío). */
export const SIN_AREA = '__sin_area__'

/** Fecha 'YYYY-MM-DD' anclada a mediodía (evita corrimiento por zona horaria). */
function parseFecha(iso: string): Date {
  return iso.length >= 10 ? new Date(`${iso.slice(0, 10)}T12:00:00`) : new Date(iso)
}

/**
 * Meses COMPLETOS transcurridos desde `fechaIngreso` hasta `hoy`; null si no hay
 * fecha (o es inválida). Resta un mes si aún no se cumple el día del mes.
 */
export function mesesAntiguedad(fechaIngreso: string | null | undefined, hoy: Date): number | null {
  if (!fechaIngreso) return null
  const h = parseFecha(fechaIngreso)
  if (Number.isNaN(h.getTime())) return null
  let m = (hoy.getFullYear() - h.getFullYear()) * 12 + (hoy.getMonth() - h.getMonth())
  if (hoy.getDate() < h.getDate()) m -= 1
  return Math.max(0, m)
}

/** Descompone meses totales en { anios, meses }. */
export function partesAntiguedad(meses: number): { anios: number; meses: number } {
  return { anios: Math.floor(meses / 12), meses: meses % 12 }
}

/** Cuántos empleados tienen fecha de ingreso. */
export function conFechaIngreso(lista: Empleado[]): number {
  return lista.filter((e) => !!e.fecha_ingreso).length
}

/**
 * Promedio (en meses) de antigüedad considerando SOLO a los que tienen fecha de
 * ingreso. Devuelve null si ninguno la tiene (caso actual de producción).
 */
export function antiguedadPromedioMeses(lista: Empleado[], hoy: Date): number | null {
  const ms = lista
    .map((e) => mesesAntiguedad(e.fecha_ingreso, hoy))
    .filter((m): m is number => m != null)
  if (ms.length === 0) return null
  return ms.reduce((a, b) => a + b, 0) / ms.length
}

export interface AreaConteo {
  /** Valor de `equipo` (o SIN_AREA para los vacíos). */
  valor: string
  count: number
  esSinArea: boolean
}

/**
 * Áreas (campo `equipo`) presentes con su conteo, orden alfabético. Agrega un
 * grupo "Sin área" al final si hay empleados sin equipo.
 */
export function areasConConteo(lista: Empleado[]): AreaConteo[] {
  const mapa = new Map<string, number>()
  let sin = 0
  for (const e of lista) {
    const eq = (e.equipo ?? '').trim()
    if (eq === '') sin++
    else mapa.set(eq, (mapa.get(eq) ?? 0) + 1)
  }
  const arr: AreaConteo[] = [...mapa.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([valor, count]) => ({ valor, count, esSinArea: false }))
  if (sin > 0) arr.push({ valor: SIN_AREA, count: sin, esSinArea: true })
  return arr
}

/** Filtra por texto (nombre o código) y por área ('all' = todas, SIN_AREA = sin equipo). */
export function filtrarEmpleados(lista: Empleado[], query: string, area: string): Empleado[] {
  const q = query.trim().toLowerCase()
  return lista.filter((e) => {
    const eq = (e.equipo ?? '').trim()
    const okArea = area === 'all' ? true : area === SIN_AREA ? eq === '' : eq === area
    const okQuery =
      q === '' ||
      e.nombre_completo.toLowerCase().includes(q) ||
      e.codigo.toLowerCase().includes(q)
    return okArea && okQuery
  })
}

/** Ordena (copia) por la clave/dirección dadas; "antiguedad" usa los meses calculados. */
export function ordenarEmpleados(
  lista: Empleado[],
  clave: ClaveOrden,
  dir: DireccionOrden,
  hoy: Date
): Empleado[] {
  const signo = dir === 'asc' ? 1 : -1
  return lista.slice().sort((a, b) => {
    let av: number | string
    let bv: number | string
    if (clave === 'antiguedad') {
      // Sin fecha va al fondo en ascendente (-1).
      av = mesesAntiguedad(a.fecha_ingreso, hoy) ?? -1
      bv = mesesAntiguedad(b.fecha_ingreso, hoy) ?? -1
    } else if (clave === 'codigo') {
      av = a.codigo
      bv = b.codigo
    } else if (clave === 'nombre') {
      av = a.nombre_completo.toLowerCase()
      bv = b.nombre_completo.toLowerCase()
    } else if (clave === 'area') {
      av = (a.equipo ?? '').toLowerCase()
      bv = (b.equipo ?? '').toLowerCase()
    } else {
      av = (a.tipo_contrato ?? '').toLowerCase()
      bv = (b.tipo_contrato ?? '').toLowerCase()
    }
    if (av < bv) return -1 * signo
    if (av > bv) return 1 * signo
    return 0
  })
}

/** Normaliza (minúsculas, sin acentos) para clasificar por palabra clave. */
function norm(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export type IconoArea = 'maletin' | 'planta' | 'caja' | 'equipo'

/** Ícono representativo del área (campo `equipo`), por palabra clave. */
export function iconoArea(equipo: string | null | undefined): IconoArea {
  const e = norm(equipo)
  if (e.includes('administr')) return 'maletin'
  if (e.includes('agric') || e.includes('operario') || e.includes('cultivo')) return 'planta'
  if (e.includes('produc')) return 'caja'
  return 'equipo'
}

export type ClaveContrato = 'indefinido' | 'fijo' | 'obra' | 'aprendizaje' | 'otro'

/** Clasifica el tipo de contrato para el color del badge. */
export function claveContrato(tipo: string | null | undefined): ClaveContrato {
  const c = norm(tipo)
  if (c === '') return 'otro'
  if (c.includes('indefinido')) return 'indefinido'
  if (c.includes('fijo')) return 'fijo'
  if (c.includes('obra') || c.includes('labor')) return 'obra'
  if (c.includes('aprend') || c.includes('sena')) return 'aprendizaje'
  return 'otro'
}
