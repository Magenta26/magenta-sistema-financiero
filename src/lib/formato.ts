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

const decimales = () =>
  formato({ clave: 'dec', minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Monto con moneda explícita: "COP $1.234,56" / "COP $1,234.56". */
export function moneda(valor: number): string {
  return `COP $${decimales().format(valor)}`
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

/** Formato contable sin moneda (tablas): negativos entre paréntesis. */
export function contable(valor: number): string {
  const absoluto = decimales().format(Math.abs(valor))
  return valor < 0 ? `(${absoluto})` : absoluto
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

export function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString(localeActual(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
