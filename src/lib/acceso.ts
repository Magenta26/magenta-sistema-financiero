/**
 * Lógica pura de control de acceso por rol (espejo del RLS de la base).
 * El RLS es la única barrera de seguridad real (un rol no puede leer lo que no
 * le toca ni adivinando el endpoint); esto solo decide qué se MUESTRA y a dónde
 * se REDIRIGE en el frontend.
 */

export type Rol = 'admin' | 'contadora' | 'nomina' | 'lider_campo'

/** Acceso al módulo Finanzas (rutas /finanzas/*, datos contables). */
export function puedeVerFinanzas(rol: Rol | null): boolean {
  return rol === 'admin' || rol === 'contadora'
}

/**
 * Acceso al núcleo del módulo Nómina (Empleados, Natillera, Vacaciones).
 * 'lider_campo' NO entra aquí: solo ve Externos.
 */
export function puedeVerNomina(rol: Rol | null): boolean {
  return rol === 'admin' || rol === 'contadora' || rol === 'nomina'
}

/** Puede editar el núcleo de Nómina (alta de empleados, novedades, vacaciones…). */
export function puedeEditarNomina(rol: Rol | null): boolean {
  return puedeVerNomina(rol)
}

/**
 * Acceso al módulo Externos (Catálogo, Registro, Liquidación). Lo ven los tres
 * roles de nómina MÁS 'lider_campo' (que solo ve esto).
 */
export function puedeVerExternos(rol: Rol | null): boolean {
  return (
    rol === 'admin' || rol === 'contadora' || rol === 'nomina' || rol === 'lider_campo'
  )
}

/** Puede editar Externos (captura de producción, deducciones…). Mismo criterio. */
export function puedeEditarExternos(rol: Rol | null): boolean {
  return puedeVerExternos(rol)
}

/** Gestión de usuarios/accesos: solo admin. */
export function esAdmin(rol: Rol | null): boolean {
  return rol === 'admin'
}

/**
 * Ruta de aterrizaje según el rol: 'lider_campo' cae en Externos; 'nomina' en su
 * módulo; los demás en Cargas (Finanzas). Se usa tras el login, en `/`, tras el
 * cambio de contraseña y en el catch-all.
 */
export function landingPorRol(rol: Rol | null): string {
  if (rol === 'lider_campo') return '/nomina/externos'
  if (rol === 'nomina') return '/nomina/empleados'
  return '/finanzas/cargas'
}
