import { describe, it, expect, afterEach } from 'vitest'
import { nombreCuenta, nombreCuentaTexto } from './nombreCuenta'
import { setIdiomaGlobal } from '../i18n/idioma'

const trad = new Map<string, string>([
  ['41052501', 'EXPORT SALES'],
  ['5105', ''], // traducción vacía: se trata como ausente
])

afterEach(() => setIdiomaGlobal('es'))

describe('nombreCuenta', () => {
  it('en ES devuelve siempre el nombre original, sin marca', () => {
    setIdiomaGlobal('es')
    expect(nombreCuenta(trad, '41052501', 'VENTAS EXPORTACIONES')).toEqual({
      texto: 'VENTAS EXPORTACIONES',
      sinTraducir: false,
    })
  })

  it('en EN devuelve la traducción cuando existe', () => {
    setIdiomaGlobal('en')
    expect(nombreCuenta(trad, '41052501', 'VENTAS EXPORTACIONES')).toEqual({
      texto: 'EXPORT SALES',
      sinTraducir: false,
    })
  })

  it('en EN sin traducción: devuelve el nombre ES y marca sinTraducir', () => {
    setIdiomaGlobal('en')
    expect(nombreCuenta(trad, '99999999', 'CUENTA NUEVA')).toEqual({
      texto: 'CUENTA NUEVA',
      sinTraducir: true,
    })
  })

  it('en EN con traducción vacía: la trata como ausente', () => {
    setIdiomaGlobal('en')
    const r = nombreCuenta(trad, '5105', 'GASTOS DE PERSONAL')
    expect(r.texto).toBe('GASTOS DE PERSONAL')
    expect(r.sinTraducir).toBe(true)
  })
})

describe('nombreCuentaTexto', () => {
  it('devuelve solo el texto resuelto', () => {
    setIdiomaGlobal('en')
    expect(nombreCuentaTexto(trad, '41052501', 'VENTAS EXPORTACIONES')).toBe('EXPORT SALES')
    setIdiomaGlobal('es')
    expect(nombreCuentaTexto(trad, '41052501', 'VENTAS EXPORTACIONES')).toBe('VENTAS EXPORTACIONES')
  })
})
