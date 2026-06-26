/**
 * Lógica pura del módulo PAGO A EXTERNOS (Entrega 1: catálogo).
 * Sin acceso a red ni a React; testeable de forma aislada.
 */
import { siguienteCodigoConPrefijo } from './natillera'
import type { Externo } from '../types/externos'
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
