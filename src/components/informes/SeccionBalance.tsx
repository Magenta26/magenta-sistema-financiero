import { Fragment } from 'react'
import type { SeccionBg } from '../../lib/balanceGeneral'
import type { ModoBg } from '../../types/informes'
import { nombreCuenta } from '../../lib/nombreCuenta'
import type { MapaTraducciones } from '../../lib/nombreCuenta'
import CeldaValor from './CeldaValor'
import { useTranslation } from '../../hooks/useTranslation'

interface SeccionBalanceProps {
  seccion: SeccionBg
  meses: number[]
  modo: ModoBg
  traducciones: MapaTraducciones
  /** Solo para Patrimonio. */
  resultadoEjercicio?: Map<number, number>
  /** Solo para Patrimonio, en modo variación. */
  utilidadNetaMensual?: Map<number, number>
}

/** Sección del Balance General (Activo / Pasivo / Patrimonio) con sus grupos y total. */
export default function SeccionBalance({
  seccion,
  meses,
  modo,
  traducciones,
  resultadoEjercicio,
  utilidadNetaMensual,
}: SeccionBalanceProps) {
  const { t } = useTranslation()
  const esVariacion = modo === 'variacion'
  const columnas = meses.length + 1 + (esVariacion ? 1 : 0)
  const valoresDe = (grupo: SeccionBg['grupos'][number]) =>
    esVariacion ? grupo.variaciones : grupo.valores
  const totales = esVariacion ? seccion.totalesVariacion : seccion.totales
  const titulo = t.bg.secciones[seccion.clase] ?? seccion.titulo

  return (
    <Fragment>
      <tr className="border-t border-borde bg-gray-50">
        <td
          colSpan={columnas}
          className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-brand-700"
        >
          {titulo}
        </td>
      </tr>
      {seccion.grupos.map((grupo) => (
        <tr
          key={grupo.grupo}
          className="border-t border-borde transition-colors duration-150 even:bg-gray-50/60 hover:bg-brand-50"
        >
          <td className="py-1.5 pl-7 pr-3 text-xs text-tinta">
            <span className="font-mono text-tinta-suave">{grupo.grupo}</span>{' '}
            {(() => {
              const n = nombreCuenta(traducciones, grupo.grupo, grupo.nombre)
              return <span title={n.sinTraducir ? 'Untranslated' : undefined}>{n.texto}</span>
            })()}
          </td>
          {meses.map((mes) => (
            <CeldaValor key={mes} valor={valoresDe(grupo).get(mes) ?? 0} modo="absolutos" />
          ))}
          {esVariacion && <CeldaValor valor={grupo.totalVariacionAnio} modo="absolutos" />}
        </tr>
      ))}
      <tr className="border-t border-brand-200 bg-brand-50">
        <td className="px-3 py-2 text-xs font-bold text-brand-900">{t.bg.totalSeccion(titulo)}</td>
        {meses.map((mes) => (
          <CeldaValor key={mes} valor={totales.get(mes) ?? 0} modo="absolutos" negrilla />
        ))}
        {esVariacion && <CeldaValor valor={seccion.totalVariacionAnio} modo="absolutos" negrilla />}
      </tr>
      {!esVariacion && resultadoEjercicio && (
        <tr className="border-t border-borde bg-brand-50/60">
          <td className="py-1.5 pl-7 pr-3 text-xs font-semibold text-tinta">
            {t.bg.resultadoEjercicio}
          </td>
          {meses.map((mes) => (
            <CeldaValor key={mes} valor={resultadoEjercicio.get(mes) ?? 0} modo="absolutos" />
          ))}
        </tr>
      )}
      {esVariacion && utilidadNetaMensual && (
        <tr className="border-t border-borde bg-brand-50/60">
          <td className="py-1.5 pl-7 pr-3 text-xs font-semibold text-tinta">{t.bg.utilidadMes}</td>
          {meses.map((mes) => (
            <CeldaValor key={mes} valor={utilidadNetaMensual.get(mes) ?? 0} modo="absolutos" />
          ))}
          <CeldaValor
            valor={meses.reduce((acc, mes) => acc + (utilidadNetaMensual.get(mes) ?? 0), 0)}
            modo="absolutos"
          />
        </tr>
      )}
    </Fragment>
  )
}
