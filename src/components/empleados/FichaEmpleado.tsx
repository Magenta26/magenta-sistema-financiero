import { useRef } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../../hooks/useTranslation'
import { moneda } from '../../lib/formato'
import type { ResumenNatillera } from '../../lib/empleados'
import type { Empleado } from '../../types/empleados'
import Avatar from './Avatar'

interface Props {
  empleado: Empleado
  fotoUrl?: string | null
  natillera: ResumenNatillera | null
  esEditor: boolean
  subiendoFoto: boolean
  onEditar: () => void
  onVolver: () => void
  onSubirFoto: (archivo: File) => void
}

/** Fila etiqueta: valor de un bloque de la ficha. */
function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <dt className="text-xs font-semibold text-tinta-suave">{label}</dt>
      <dd className="text-sm text-tinta">{children}</dd>
    </div>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-borde bg-white p-5 shadow-sm">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-brand-700">{titulo}</h3>
      {children}
    </section>
  )
}

function Placeholder({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <section className="rounded-xl border border-dashed border-brand-200 bg-white p-5 text-center shadow-sm">
      <h3 className="text-sm font-bold uppercase tracking-wide text-tinta-suave">{titulo}</h3>
      <p className="mt-2 text-xs text-tinta-suave">🚧 {texto}</p>
    </section>
  )
}

export default function FichaEmpleado({
  empleado,
  fotoUrl,
  natillera,
  esEditor,
  subiendoFoto,
  onEditar,
  onVolver,
  onSubirFoto,
}: Props) {
  const { t } = useTranslation()
  const e = t.empleados
  const c = e.campos
  const inputFoto = useRef<HTMLInputElement>(null)

  const siNo = (v: boolean) => (v ? e.si : e.no)
  const texto = (v: string | null) => (v && v.trim() !== '' ? v : e.sinDato)
  const jornada =
    empleado.jornada_inicio || empleado.jornada_fin
      ? `${(empleado.jornada_inicio ?? '—').slice(0, 5)} – ${(empleado.jornada_fin ?? '—').slice(0, 5)}`
      : e.sinDato

  return (
    <div>
      <button
        type="button"
        onClick={onVolver}
        className="text-sm font-semibold text-brand-700 transition-colors duration-150 hover:text-brand-900"
      >
        {e.volver}
      </button>

      {/* Cabecera */}
      <div className="mt-3 flex flex-wrap items-center gap-5 rounded-xl border border-borde bg-white p-6 shadow-sm">
        <div className="relative">
          <Avatar nombre={empleado.nombre_completo} fotoUrl={fotoUrl} tamano={88} />
          {esEditor && (
            <>
              <button
                type="button"
                onClick={() => inputFoto.current?.click()}
                disabled={subiendoFoto}
                className="absolute -bottom-1 -right-1 rounded-full border border-borde bg-white px-2 py-1 text-[10px] font-semibold text-brand-700 shadow transition-colors duration-150 hover:bg-brand-50 disabled:opacity-50"
              >
                {subiendoFoto ? e.foto.subiendo : empleado.foto_url ? e.foto.cambiar : e.foto.subir}
              </button>
              <input
                ref={inputFoto}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(ev) => {
                  const f = ev.target.files?.[0]
                  if (f) onSubirFoto(f)
                  ev.target.value = ''
                }}
              />
            </>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-brand-900">{empleado.nombre_completo}</h1>
          <p className="font-mono text-sm text-tinta-suave">{empleado.codigo}</p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              empleado.activo ? 'bg-green-100 text-exito' : 'bg-gray-100 text-tinta-suave'
            }`}
          >
            {empleado.activo ? e.activo : e.inactivo}
          </span>
        </div>
        {esEditor && (
          <button
            type="button"
            onClick={onEditar}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900"
          >
            {e.editar}
          </button>
        )}
      </div>

      {/* Bloques */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Bloque titulo={e.bloques.basica}>
          <dl className="grid grid-cols-2 gap-x-6">
            <Dato label={c.estadoCivil}>{texto(empleado.estado_civil)}</Dato>
            <Dato label={c.tipoSangre}>{texto(empleado.tipo_sangre)}</Dato>
            <Dato label={c.esPadre}>{siNo(empleado.es_padre)}</Dato>
            <Dato label={c.numHijos}>{empleado.num_hijos}</Dato>
            <Dato label={c.estaEstudiando}>{siNo(empleado.esta_estudiando)}</Dato>
            <Dato label={c.estudio}>{texto(empleado.estudio)}</Dato>
            <Dato label={c.eps}>{texto(empleado.eps)}</Dato>
          </dl>
        </Bloque>

        <Bloque titulo={e.bloques.contrato}>
          <dl className="grid grid-cols-2 gap-x-6">
            <Dato label={c.tipoContrato}>{texto(empleado.tipo_contrato)}</Dato>
            <Dato label={c.salario}>{empleado.salario != null ? moneda(empleado.salario) : e.sinDato}</Dato>
            <Dato label={c.cajaCompensacion}>{texto(empleado.caja_compensacion)}</Dato>
            <Dato label={c.fondoPension}>{texto(empleado.fondo_pension)}</Dato>
            <Dato label={c.auxilioTransporte}>{siNo(empleado.aplica_auxilio_transporte)}</Dato>
            <Dato label={c.equipo}>{texto(empleado.equipo)}</Dato>
            <Dato label={`${c.jornadaInicio} – ${c.jornadaFin}`}>{jornada}</Dato>
          </dl>
        </Bloque>

        <Bloque titulo={e.bloques.natillera}>
          {natillera ? (
            <>
              <p
                className={`text-sm font-semibold ${
                  natillera.ahorrando ? 'text-exito' : 'text-tinta-suave'
                }`}
              >
                {natillera.ahorrando ? e.natillera.ahorrando : e.natillera.noAhorrando}
              </p>
              <dl className="mt-1 grid grid-cols-2 gap-x-6">
                <Dato label={e.natillera.cuota}>{moneda(natillera.cuota)}</Dato>
                <Dato label={e.natillera.total}>{moneda(natillera.total)}</Dato>
              </dl>
            </>
          ) : (
            <p className="text-sm text-tinta-suave">{e.natillera.noVinculado}</p>
          )}
          <Link
            to="/nomina/natillera"
            className="mt-2 inline-block text-xs font-semibold text-brand-700 transition-colors duration-150 hover:text-brand-900"
          >
            {e.natillera.irA}
          </Link>
        </Bloque>

        <Bloque titulo={e.bloques.beneficios}>
          <dl className="grid grid-cols-2 gap-x-6">
            <Dato label={c.beneficioLentes}>{siNo(empleado.beneficio_lentes)}</Dato>
          </dl>
        </Bloque>

        <Placeholder titulo={e.bloques.horasExtras} texto={e.proximamente} />
        <Placeholder titulo={e.bloques.prestamo} texto={e.proximamente} />
      </div>
    </div>
  )
}
