import { createContext } from 'react'
import type { Diccionario } from './es'
import type { Idioma } from './idioma'

export interface ContextoI18nValor {
  idioma: Idioma
  t: Diccionario
  cambiarIdioma: (idioma: Idioma) => void
}

export const ContextoI18n = createContext<ContextoI18nValor | undefined>(undefined)
