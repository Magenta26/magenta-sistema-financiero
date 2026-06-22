/**
 * Monto en letras para el comprobante de retiro de la Natillera.
 * Convierte un valor en COP a palabras, en el idioma activo:
 *   ES: "Un millón doscientos treinta y cuatro mil quinientos pesos m/cte"
 *   EN: "One million two hundred thirty-four thousand five hundred Colombian pesos"
 * Los centavos (si los hay) se expresan como "con NN/100" / "and NN/100".
 */
import type { Idioma } from '../i18n/idioma'

// ── Español (apócope de "uno" → "un" porque siempre precede a un sustantivo) ──
const ES_UNIDADES = [
  '', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete',
  'dieciocho', 'diecinueve', 'veinte', 'veintiún', 'veintidós', 'veintitrés',
  'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve',
]
const ES_DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const ES_CENTENAS = [
  '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos',
]

function esDecenas(n: number): string {
  if (n <= 29) return ES_UNIDADES[n]
  const d = Math.floor(n / 10)
  const u = n % 10
  return u === 0 ? ES_DECENAS[d] : `${ES_DECENAS[d]} y ${ES_UNIDADES[u]}`
}

/** 1..999 en español (forma apocopada para usar ante sustantivo). */
function esTresCifras(n: number): string {
  if (n === 100) return 'cien'
  const c = Math.floor(n / 100)
  const resto = n % 100
  const partes: string[] = []
  if (c > 0) partes.push(ES_CENTENAS[c])
  if (resto > 0) partes.push(esDecenas(resto))
  return partes.join(' ')
}

function esEntero(n: number): string {
  if (n === 0) return 'cero'
  const millones = Math.floor(n / 1_000_000)
  const miles = Math.floor((n % 1_000_000) / 1000)
  const resto = n % 1000
  const partes: string[] = []
  if (millones > 0) partes.push(millones === 1 ? 'un millón' : `${esTresCifras(millones)} millones`)
  if (miles > 0) partes.push(miles === 1 ? 'mil' : `${esTresCifras(miles)} mil`)
  if (resto > 0) partes.push(esTresCifras(resto))
  return partes.join(' ')
}

// ── Inglés ────────────────────────────────────────────────────
const EN_ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
]
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const EN_ESCALAS = ['', ' thousand', ' million', ' billion']

function enTresCifras(n: number): string {
  const h = Math.floor(n / 100)
  const r = n % 100
  const partes: string[] = []
  if (h > 0) partes.push(`${EN_ONES[h]} hundred`)
  if (r > 0) {
    if (r < 20) partes.push(EN_ONES[r])
    else {
      const t = Math.floor(r / 10)
      const u = r % 10
      partes.push(u === 0 ? EN_TENS[t] : `${EN_TENS[t]}-${EN_ONES[u]}`)
    }
  }
  return partes.join(' ')
}

function enEntero(n: number): string {
  if (n === 0) return 'zero'
  const grupos: number[] = []
  let resto = n
  while (resto > 0) {
    grupos.push(resto % 1000)
    resto = Math.floor(resto / 1000)
  }
  const partes: string[] = []
  for (let i = grupos.length - 1; i >= 0; i--) {
    if (grupos[i] === 0) continue
    partes.push(`${enTresCifras(grupos[i])}${EN_ESCALAS[i]}`)
  }
  return partes.join(' ')
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * Monto en letras (COP) en el idioma indicado. Maneja centavos como "NN/100".
 * Pensado para montos no negativos (totales de ahorro); un valor negativo se
 * prefija con "menos" / "minus".
 */
export function montoEnLetras(valor: number, idioma: Idioma): string {
  const negativo = valor < 0
  const totalCentavos = Math.round(Math.abs(valor) * 100)
  const entero = Math.floor(totalCentavos / 100)
  const centavos = totalCentavos % 100

  if (idioma === 'en') {
    const palabras = enEntero(entero)
    const moneda = entero === 1 ? 'Colombian peso' : 'Colombian pesos'
    const cents = centavos > 0 ? ` and ${String(centavos).padStart(2, '0')}/100` : ''
    const signo = negativo ? 'minus ' : ''
    return capitalizar(`${signo}${palabras} ${moneda}${cents}`)
  }

  const palabras = esEntero(entero)
  const moneda = entero === 1 ? 'peso' : 'pesos'
  const cents = centavos > 0 ? ` con ${String(centavos).padStart(2, '0')}/100` : ''
  const signo = negativo ? 'menos ' : ''
  return capitalizar(`${signo}${palabras} ${moneda}${cents} m/cte`)
}
