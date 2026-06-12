import { useContext } from 'react'
import { ContextoI18n } from '../i18n/contexto'

/** Acceso tipado al diccionario activo: const { t, idioma, cambiarIdioma } = useTranslation() */
export function useTranslation() {
  const contexto = useContext(ContextoI18n)
  if (!contexto) {
    throw new Error('useTranslation debe usarse dentro de <I18nProvider>')
  }
  return contexto
}
