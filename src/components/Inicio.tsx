import { Navigate } from 'react-router-dom'
import { useRol } from '../hooks/useRol'
import { landingPorRol } from '../lib/acceso'

/**
 * Redirección de inicio según el rol: 'nomina' aterriza en su módulo; admin y
 * contadora en Cargas (Finanzas). Se usa en `/` y en el catch-all.
 */
export default function Inicio() {
  const { rol, isLoading } = useRol()
  if (isLoading) return null
  return <Navigate to={landingPorRol(rol)} replace />
}
