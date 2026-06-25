/**
 * Iconos lineales inline para la ficha de empleado. El proyecto no usa una
 * librería de iconos; se siguen los SVG inline ya presentes (mismo estilo:
 * stroke currentColor, grosor ~1.6, terminaciones redondeadas). El color se
 * controla con `text-*` desde el contenedor.
 */
import type { ReactNode } from 'react'

interface IconoProps {
  size?: number
  className?: string
}

function Svg({ children, size = 20, className }: IconoProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

/** Persona (Información básica). */
export function IconoUsuario(p: IconoProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </Svg>
  )
}

/** Documento (Contrato). */
export function IconoContrato(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h5" />
    </Svg>
  )
}

/** Billetera / ahorro (Natillera). */
export function IconoNatillera(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M3 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
      <path d="M3 8V6.5a2 2 0 0 1 2-2h10" />
      <circle cx="16" cy="13" r="1.2" />
    </Svg>
  )
}

/** Estrella (Beneficios). */
export function IconoBeneficios(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6L12 17.8 6.6 19.6l1-6L3.3 9.4l6-.9L12 3z" />
    </Svg>
  )
}

/** Reloj (Horas extras). */
export function IconoHorasExtras(p: IconoProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  )
}

/** Billete (Préstamo). */
export function IconoPrestamo(p: IconoProps) {
  return (
    <Svg {...p}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 10v4" />
      <path d="M18 10v4" />
    </Svg>
  )
}

/** Cámara (subir/cambiar foto). */
export function IconoCamara(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M4 8h2.5L8 6h8l1.5 2H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.2" />
    </Svg>
  )
}

/** Lápiz (Editar). */
export function IconoLapiz(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M16 3l5 5L8 21H3v-5L16 3z" />
      <path d="M13.5 5.5l5 5" />
    </Svg>
  )
}

/** Chevron derecha (ítem de menú activo). */
export function IconoChevron(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  )
}

/** Flecha derecha (enlace "Ir a Natillera"). */
export function IconoFlecha(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </Svg>
  )
}

/** Alerta (estado vacío de natillera). */
export function IconoAlerta(p: IconoProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16.5v.5" />
    </Svg>
  )
}

/** Lupa (buscador de la lista). */
export function IconoBuscar(p: IconoProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </Svg>
  )
}

/** Maletín (área Administrativa). */
export function IconoMaletin(p: IconoProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </Svg>
  )
}

/** Brote (área Operario Agrícola). */
export function IconoPlanta(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M12 21v-8" />
      <path d="M12 13c0-3-2-5-6-5 0 3 2 5 6 5z" />
      <path d="M12 11c0-3 2-6 6-6 0 3-2 6-6 6z" />
    </Svg>
  )
}

/** Caja (área Ayudante de Producción). */
export function IconoCaja(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M3 8l9-5 9 5v8l-9 5-9-5V8z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </Svg>
  )
}

/** Grupo de personas (área genérica). */
export function IconoEquipo(p: IconoProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.2a3 3 0 0 1 0 5.6" />
      <path d="M17.5 19a5.5 5.5 0 0 0-2.5-4.6" />
    </Svg>
  )
}

/** Lentes (beneficio de salud visual). */
export function IconoLentes(p: IconoProps) {
  return (
    <Svg {...p}>
      <circle cx="6.5" cy="14" r="3" />
      <circle cx="17.5" cy="14" r="3" />
      <path d="M9.5 13.5h5" />
      <path d="M3 11l1.6-4h2" />
      <path d="M21 11l-1.6-4h-2" />
    </Svg>
  )
}
