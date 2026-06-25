/**
 * Lógica pura de control de acceso por rol (espejo del RLS de la base).
 * El RLS es la única barrera de seguridad real (un 'nomina' no puede leer
 * finanzas ni adivinando el endpoint); esto solo decide qué se MUESTRA y a
 * dónde se REDIRIGE en el frontend.
 */

export type Rol = 'admin' | 'contadora' | 'nomina'

/** Acceso al módulo Finanzas (rutas /finanzas/*, datos contables). */
export function puedeVerFinanzas(rol: Rol | null): boolean {
  return rol === 'admin' || rol === 'contadora'
}

/** Acceso al módulo Nómina (rutas /nomina/*). Los tres roles entran. */
export function puedeVerNomina(rol: Rol | null): boolean {
  return rol === 'admin' || rol === 'contadora' || rol === 'nomina'
}

/** Puede editar datos de Nómina (alta de empleados, novedades, vacaciones…). */
export function puedeEditarNomina(rol: Rol | null): boolean {
  return puedeVerNomina(rol)
}

/** Gestión de usuarios/accesos: solo admin. */
export function esAdmin(rol: Rol | null): boolean {
  return rol === 'admin'
}

/**
 * Ruta de aterrizaje según el rol: 'nomina' cae en su módulo; los demás en
 * Cargas (Finanzas). Se usa tras el login, en `/` y en el catch-all.
 */
export function landingPorRol(rol: Rol | null): string {
  return rol === 'nomina' ? '/nomina/empleados' : '/finanzas/cargas'
}
