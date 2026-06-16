import { idiomaGlobal } from '../i18n/idioma'

/** Mapa código de cuenta -> nombre en inglés (de la tabla traducciones_cuentas). */
export type MapaTraducciones = Map<string, string>

export interface NombreResuelto {
  texto: string
  /** true solo en modo EN cuando no hay traducción: se muestra el nombre ES. */
  sinTraducir: boolean
}

/**
 * Nombre de una cuenta según el idioma activo:
 *  - ES: siempre el nombre original de SIIGO (`nombreEs`).
 *  - EN: `nombre_en` si existe; si no, el nombre ES marcado como sin traducir
 *    (para que el llamador ponga title="Untranslated").
 */
export function nombreCuenta(
  traducciones: MapaTraducciones,
  cuenta: string,
  nombreEs: string
): NombreResuelto {
  if (idiomaGlobal() !== 'en') return { texto: nombreEs, sinTraducir: false }
  const en = traducciones.get(cuenta)
  if (en && en.trim() !== '') return { texto: en, sinTraducir: false }
  return { texto: nombreEs, sinTraducir: true }
}

/** Igual que nombreCuenta pero devuelve solo el texto (para exports y etiquetas). */
export function nombreCuentaTexto(
  traducciones: MapaTraducciones,
  cuenta: string,
  nombreEs: string
): string {
  return nombreCuenta(traducciones, cuenta, nombreEs).texto
}
