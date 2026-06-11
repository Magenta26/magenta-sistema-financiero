import { Fragment } from 'react'
import type { SeccionBg } from '../../lib/balanceGeneral'
import CeldaValor from './CeldaValor'

interface SeccionBalanceProps {
  seccion: SeccionBg
  meses: number[]
  /** Solo para Patrimonio: mes -> utilidad neta acumulada. */
  resultadoEjercicio?: Map<number, number>
}

/** Sección del Balance General (Activo / Pasivo / Patrimonio) con sus grupos y total. */
export default function SeccionBalance({ seccion, meses, resultadoEjercicio }: SeccionBalanceProps) {
  return (
    <Fragment>
      <tr className="border-t border-ciruela-800 bg-ciruela-900/80">
        <td
          colSpan={meses.length + 1}
          className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-magenta-300"
        >
          {seccion.titulo}
        </td>
      </tr>
      {seccion.grupos.map((grupo) => (
        <tr key={grupo.grupo} className="border-t border-ciruela-800/40 bg-ciruela-950/30">
          <td className="py-1.5 pl-7 pr-3 text-xs text-ciruela-200">
            <span className="font-mono text-ciruela-400">{grupo.grupo}</span> {grupo.nombre}
          </td>
          {meses.map((mes) => (
            <CeldaValor key={mes} valor={grupo.valores.get(mes) ?? 0} modo="absolutos" />
          ))}
        </tr>
      ))}
      <tr className="border-t border-ciruela-700 bg-ciruela-950/70">
        <td className="px-3 py-2 text-xs font-bold text-white">
          TOTAL {seccion.titulo.toUpperCase()}
        </td>
        {meses.map((mes) => (
          <CeldaValor key={mes} valor={seccion.totales.get(mes) ?? 0} modo="absolutos" negrilla />
        ))}
      </tr>
      {resultadoEjercicio && (
        <tr className="border-t border-ciruela-800/40 bg-magenta-600/10">
          <td className="py-1.5 pl-7 pr-3 text-xs font-semibold text-ciruela-100">
            Resultado del ejercicio (utilidad acumulada del año)
          </td>
          {meses.map((mes) => (
            <CeldaValor key={mes} valor={resultadoEjercicio.get(mes) ?? 0} modo="absolutos" />
          ))}
        </tr>
      )}
    </Fragment>
  )
}
