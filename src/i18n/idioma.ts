/**
 * Idioma activo a nivel de módulo: lo leen las utilidades puras
 * (formato de números, nombres de meses) sin atravesar props.
 * El provider de i18n lo sincroniza y fuerza el re-render vía contexto.
 */
export type Idioma = 'es' | 'en'

export const CLAVE_IDIOMA = 'magenta-idioma'

let actual: Idioma = 'es'

export function setIdiomaGlobal(idioma: Idioma): void {
  actual = idioma
}

export function idiomaGlobal(): Idioma {
  return actual
}

export function localeActual(): string {
  return actual === 'es' ? 'es-CO' : 'en-US'
}
