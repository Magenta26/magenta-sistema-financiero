/**
 * Lógica pura de la ficha de empleados: avatar de iniciales (color
 * determinístico), y el resumen de natillera leído del vínculo empleado_id.
 * La auto-sugerencia de código reutiliza `siguienteCodigoEmpleado` (natillera.ts).
 */

/** Iniciales para el avatar de respaldo: primera letra del primer y último nombre. */
export function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return '?'
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase()
  return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase()
}

// Paleta sobria (marca + acentos) para los avatares de iniciales.
const PALETA_AVATAR = [
  '#7A1B5C', // brand-700
  '#A03080', // brand-500
  '#501040', // brand-900
  '#2E8B57', // éxito
  '#B45309', // ámbar profundo
  '#1D4ED8', // azul
  '#0F766E', // teal
  '#9333EA', // violeta
]

/** Color de avatar determinístico derivado del nombre (mismo nombre → mismo color). */
export function colorAvatar(nombre: string): string {
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0
  return PALETA_AVATAR[h % PALETA_AVATAR.length]
}

/** Resumen de natillera para la ficha (leído del vínculo empleado_id). */
export interface ResumenNatillera {
  /** ¿participa actualmente en la natillera? (natillera_empleados.activo) */
  ahorrando: boolean
  /** Cuota vigente. */
  cuota: number
  /** Total ahorrado del año (saldo inicial + aportes resueltos). */
  total: number
}

/**
 * Construye el resumen de natillera a partir del empleado de natillera vinculado
 * y su reporte calculado. Devuelve null si la persona no está en la natillera.
 */
export function resumenNatillera(
  natEmp: { activo: boolean } | null | undefined,
  reporte: { cuotaVigente: number; total: number } | null | undefined
): ResumenNatillera | null {
  if (!natEmp || !reporte) return null
  return { ahorrando: natEmp.activo, cuota: reporte.cuotaVigente, total: reporte.total }
}
