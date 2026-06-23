import { colorAvatar, iniciales } from '../../lib/empleados'

interface Props {
  nombre: string
  /** URL firmada de la foto; si falta, se muestran las iniciales. */
  fotoUrl?: string | null
  /** Tamaño en px (cuadrado). */
  tamano?: number
}

/** Avatar del empleado: foto si existe, si no iniciales sobre color determinístico. */
export default function Avatar({ nombre, fotoUrl, tamano = 40 }: Props) {
  const estilo = { width: tamano, height: tamano }
  if (fotoUrl) {
    return (
      <img
        src={fotoUrl}
        alt={nombre}
        style={estilo}
        className="shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <div
      style={{ ...estilo, backgroundColor: colorAvatar(nombre) }}
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      aria-hidden="true"
    >
      <span style={{ fontSize: tamano * 0.4 }}>{iniciales(nombre)}</span>
    </div>
  )
}
