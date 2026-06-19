/** Reglas del cambio de contraseña obligatorio (primer ingreso). */

/** Contraseña temporal con la que el admin crea los usuarios. No reutilizable. */
export const PASSWORD_TEMPORAL = 'Magenta26'

export const LARGO_MINIMO = 8

export type ErrorPassword = 'corta' | 'temporal' | 'noCoincide' | null

/**
 * Valida la nueva contraseña: largo mínimo, que no sea la temporal y que
 * coincida con la confirmación. Devuelve la clave del error o null si es válida.
 */
export function validarNuevaPassword(
  nueva: string,
  confirmar: string,
  temporal: string = PASSWORD_TEMPORAL
): ErrorPassword {
  if (nueva.length < LARGO_MINIMO) return 'corta'
  if (nueva === temporal) return 'temporal'
  if (nueva !== confirmar) return 'noCoincide'
  return null
}
