/**
 * Formateo de números y fechas según el idioma activo:
 * ES: 1.234.567,89 (es-CO) · EN: 1,234,567.89 (en-US).
 * Los montos indican la moneda (COP) para que nadie asuma USD.
 */
import { idiomaGlobal, localeActual } from '../i18n/idioma'

const cacheFormatos = new Map<string, Intl.NumberFormat>()

function formato(opciones: Intl.NumberFormatOptions & { clave: string }): Intl.NumberFormat {
  const locale = localeActual()
  const clave = `${locale}:${opciones.clave}`
  let f = cacheFormatos.get(clave)
  if (!f) {
    const { clave: _ignorada, ...resto } = opciones
    void _ignorada
    f = new Intl.NumberFormat(locale, resto)
    cacheFormatos.set(clave, f)
  }
  return f
}

const decimales = (dec = 2) =>
  formato({ clave: `dec${dec}`, minimumFractionDigits: dec, maximumFractionDigits: dec })

/**
 * Monto con moneda explícita: "COP $1.234,56" / "COP $1,234.56".
 * `decimales` por defecto 2 (centavos); pasar 0 para redondear al peso entero.
 */
export function moneda(valor: number, opciones?: { decimales?: number }): string {
  return `COP $${decimales(opciones?.decimales ?? 2).format(valor)}`
}

export function entero(valor: number): string {
  return formato({ clave: 'int' }).format(valor)
}

/** Moneda compacta para tarjetas: ES "COP $258,3 M" · EN "COP $258.3M". */
export function monedaCompacta(valor: number): string {
  const absoluto = Math.abs(valor)
  const signo = valor < 0 ? '−' : ''
  const num = (v: number, dec: number) =>
    formato({ clave: `cmp${dec}`, maximumFractionDigits: dec, minimumFractionDigits: 0 }).format(v)
  if (idiomaGlobal() === 'en') {
    if (absoluto >= 1e9) return `${signo}COP $${num(absoluto / 1e9, 2)}B`
    if (absoluto >= 1e6) return `${signo}COP $${num(absoluto / 1e6, 1)}M`
    if (absoluto >= 1e3) return `${signo}COP $${num(absoluto / 1e3, 0)}K`
    return `${signo}COP $${num(absoluto, 0)}`
  }
  if (absoluto >= 1e9) return `${signo}COP $${num(absoluto / 1e9, 2)} mil M`
  if (absoluto >= 1e6) return `${signo}COP $${num(absoluto / 1e6, 1)} M`
  if (absoluto >= 1e3) return `${signo}COP $${num(absoluto / 1e3, 0)} mil`
  return `${signo}COP $${num(absoluto, 0)}`
}

/** Monto en millones de COP con 1 decimal: ES "COP $258,3 M" · EN "COP $258.3 M". */
export function monedaMillones(valor: number): string {
  const millones = valor / 1_000_000
  const signo = millones < 0 ? '−' : ''
  const num = formato({
    clave: 'mill',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(millones))
  return `${signo}COP $${num} M`
}

/**
 * Formato contable sin moneda (tablas): negativos entre paréntesis.
 * `decimales` por defecto 2 (centavos); pasar 0 para redondear al peso entero.
 */
export function contable(valor: number, opciones?: { decimales?: number }): string {
  const absoluto = decimales(opciones?.decimales ?? 2).format(Math.abs(valor))
  return valor < 0 ? `(${absoluto})` : absoluto
}

/**
 * Parsea un número escrito por el usuario en el formato del idioma activo
 * (ES: miles "." y decimal ","; EN: miles "," y decimal "."). Tolera entradas
 * sin separadores de miles. Devuelve null si queda vacío o no es numérico.
 */
export function parsearNumero(texto: string): number | null {
  const limpio = texto.trim()
  if (limpio === '') return null
  const sepDecimal = localeActual() === 'es-CO' ? ',' : '.'
  const sepMiles = sepDecimal === ',' ? '.' : ','
  const normalizado = limpio
    .split(sepMiles)
    .join('')
    .replace(sepDecimal, '.')
    .replace(/[^0-9.-]/g, '')
  if (normalizado === '' || normalizado === '-') return null
  const n = Number(normalizado)
  return Number.isFinite(n) ? n : null
}

/** Porcentaje con 1 decimal. null -> "—". ES "12,3 %" · EN "12.3%". */
export function porcentaje(valor: number | null): string {
  if (valor === null || !Number.isFinite(valor)) return '—'
  const texto = formato({
    clave: 'pct',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(valor))
  const sufijo = idiomaGlobal() === 'en' ? '%' : ' %'
  return valor < 0 ? `(${texto}${sufijo})` : `${texto}${sufijo}`
}

/** Fecha sin hora: ES "22 jun 2026" · EN "Jun 22, 2026". */
export function fecha(iso: string): string {
  // Una fecha 'YYYY-MM-DD' se ancla a mediodía para evitar corrimiento por zona horaria.
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso)
  return d.toLocaleDateString(localeActual(), { year: 'numeric', month: 'short', day: 'numeric' })
}

export function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString(localeActual(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
