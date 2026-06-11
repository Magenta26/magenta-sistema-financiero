import { contable, porcentaje } from '../../lib/formato'
import type { ModoEr } from '../../types/informes'

interface CeldaValorProps {
  valor: number | null
  modo: ModoEr
  /** Mes sin datos: celda gris vacía. */
  sinDatos?: boolean
  negrilla?: boolean
}

/** Celda numérica: formato es-CO, negativos en rojo entre paréntesis, "—" cuando no aplica. */
export default function CeldaValor({ valor, modo, sinDatos, negrilla }: CeldaValorProps) {
  if (sinDatos) {
    return <td className="bg-ciruela-900/30 px-3 py-1.5" />
  }
  const esPorcentaje = modo !== 'absolutos'
  const texto = valor === null ? '—' : esPorcentaje ? porcentaje(valor) : contable(valor)
  const color =
    valor !== null && valor < 0 ? 'text-red-400' : negrilla ? 'text-white' : 'text-ciruela-200'
  return (
    <td
      className={`whitespace-nowrap px-3 py-1.5 text-right font-mono text-xs ${color} ${negrilla ? 'font-bold' : ''}`}
    >
      {texto}
    </td>
  )
}
