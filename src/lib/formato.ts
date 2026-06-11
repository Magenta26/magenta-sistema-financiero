/** Formateo de números y fechas en es-CO. */

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function moneda(valor: number): string {
  return `$${formatoMoneda.format(valor)}`
}

const formatoEntero = new Intl.NumberFormat('es-CO')

export function entero(valor: number): string {
  return formatoEntero.format(valor)
}

/** Moneda compacta para tarjetas: $180,4 M / $53,5 M / $980 mil. */
export function monedaCompacta(valor: number): string {
  const absoluto = Math.abs(valor)
  const signo = valor < 0 ? '−' : ''
  const num = (v: number, dec: number) =>
    new Intl.NumberFormat('es-CO', { maximumFractionDigits: dec, minimumFractionDigits: 0 }).format(v)
  if (absoluto >= 1e9) return `${signo}$${num(absoluto / 1e9, 2)} mil M`
  if (absoluto >= 1e6) return `${signo}$${num(absoluto / 1e6, 1)} M`
  if (absoluto >= 1e3) return `${signo}$${num(absoluto / 1e3, 0)} mil`
  return `${signo}$${num(absoluto, 0)}`
}

/** Formato contable es-CO: negativos entre paréntesis. Ej.: -1234.5 -> "(1.234,50)" */
export function contable(valor: number): string {
  const absoluto = formatoMoneda.format(Math.abs(valor))
  return valor < 0 ? `(${absoluto})` : absoluto
}

/** Porcentaje con 1 decimal y coma. null -> "—". Ej.: 12.34 -> "12,3 %" */
export function porcentaje(valor: number | null): string {
  if (valor === null || !Number.isFinite(valor)) return '—'
  const texto = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(valor))
  return valor < 0 ? `(${texto} %)` : `${texto} %`
}

export function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
