import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { es } from './es'
import { en } from './en'
import { CLAVE_IDIOMA, setIdiomaGlobal } from './idioma'
import type { Idioma } from './idioma'
import { ContextoI18n } from './contexto'

const DICCIONARIOS = { es, en } as const

function idiomaInicial(): Idioma {
  try {
    const guardado = localStorage.getItem(CLAVE_IDIOMA)
    if (guardado === 'es' || guardado === 'en') return guardado
  } catch {
    // localStorage no disponible: usar el default
  }
  return 'es'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma>(() => {
    const inicial = idiomaInicial()
    setIdiomaGlobal(inicial) // sincroniza formato/meses antes del primer render
    return inicial
  })

  const cambiarIdioma = useCallback((nuevo: Idioma) => {
    setIdiomaGlobal(nuevo)
    try {
      localStorage.setItem(CLAVE_IDIOMA, nuevo)
    } catch {
      // sin persistencia, el cambio aplica solo a la sesión
    }
    setIdioma(nuevo)
  }, [])

  return (
    <ContextoI18n.Provider value={{ idioma, t: DICCIONARIOS[idioma], cambiarIdioma }}>
      {children}
    </ContextoI18n.Provider>
  )
}
