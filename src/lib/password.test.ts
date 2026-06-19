import { describe, it, expect } from 'vitest'
import { PASSWORD_TEMPORAL, validarNuevaPassword } from './password'

describe('validarNuevaPassword', () => {
  it('rechaza contraseñas de menos de 8 caracteres', () => {
    expect(validarNuevaPassword('corta', 'corta')).toBe('corta')
  })

  it('rechaza reutilizar la contraseña temporal', () => {
    expect(validarNuevaPassword(PASSWORD_TEMPORAL, PASSWORD_TEMPORAL)).toBe('temporal')
  })

  it('rechaza cuando la confirmación no coincide', () => {
    expect(validarNuevaPassword('claveNueva1', 'otraClave2')).toBe('noCoincide')
  })

  it('acepta una contraseña válida (>=8, distinta a la temporal, coincide)', () => {
    expect(validarNuevaPassword('claveNueva1', 'claveNueva1')).toBeNull()
  })

  it('el chequeo de temporal se evalúa antes que el de coincidencia', () => {
    expect(validarNuevaPassword(PASSWORD_TEMPORAL, 'algoDistinto')).toBe('temporal')
  })
})
