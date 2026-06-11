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

export function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
