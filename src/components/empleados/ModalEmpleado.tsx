import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { contable, parsearNumero } from '../../lib/formato'
import { siguienteCodigoEmpleado } from '../../lib/natillera'
import type { DatosEmpleado, Empleado } from '../../types/empleados'

interface Props {
  empleado: Empleado | null
  codigosExistentes: string[]
  guardando: boolean
  onGuardar: (datos: DatosEmpleado) => void
  onCerrar: () => void
}

const claseInput =
  'mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none'

function Campo({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-tinta-suave" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-tinta">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-borde text-brand-700 focus:ring-brand-700"
      />
      {label}
    </label>
  )
}

const SUBTITULO = 'mt-2 text-xs font-bold uppercase tracking-wide text-brand-700'

/** Modal de alta/edición de TODOS los campos del empleado. */
export default function ModalEmpleado({ empleado, codigosExistentes, guardando, onGuardar, onCerrar }: Props) {
  const { t } = useTranslation()
  const c = t.empleados.campos

  const [codigo, setCodigo] = useState(empleado?.codigo ?? siguienteCodigoEmpleado(codigosExistentes))
  const [nombre, setNombre] = useState(empleado?.nombre_completo ?? '')
  const [activo, setActivo] = useState(empleado?.activo ?? true)
  const [estadoCivil, setEstadoCivil] = useState(empleado?.estado_civil ?? '')
  const [esPadre, setEsPadre] = useState(empleado?.es_padre ?? false)
  const [numHijos, setNumHijos] = useState(String(empleado?.num_hijos ?? 0))
  const [estudiando, setEstudiando] = useState(empleado?.esta_estudiando ?? false)
  const [estudio, setEstudio] = useState(empleado?.estudio ?? '')
  const [tipoSangre, setTipoSangre] = useState(empleado?.tipo_sangre ?? '')
  const [eps, setEps] = useState(empleado?.eps ?? '')
  const [caja, setCaja] = useState(empleado?.caja_compensacion ?? '')
  const [pension, setPension] = useState(empleado?.fondo_pension ?? '')
  const [tipoContrato, setTipoContrato] = useState(empleado?.tipo_contrato ?? '')
  const [salario, setSalario] = useState(
    empleado?.salario != null ? contable(empleado.salario) : ''
  )
  const [fechaIngreso, setFechaIngreso] = useState(empleado?.fecha_ingreso ?? '')
  const [auxilio, setAuxilio] = useState(empleado?.aplica_auxilio_transporte ?? false)
  const [jornadaIni, setJornadaIni] = useState((empleado?.jornada_inicio ?? '').slice(0, 5))
  const [jornadaFin, setJornadaFin] = useState((empleado?.jornada_fin ?? '').slice(0, 5))
  const [equipo, setEquipo] = useState(empleado?.equipo ?? '')
  const [lentes, setLentes] = useState(empleado?.beneficio_lentes ?? false)

  const [errorNombre, setErrorNombre] = useState(false)
  const [errorCodigo, setErrorCodigo] = useState<'requerido' | 'duplicado' | null>(null)

  const limpio = (s: string): string | null => (s.trim() === '' ? null : s.trim())

  const enviar = () => {
    const codigoLimpio = codigo.trim()
    const nombreLimpio = nombre.trim()
    const otros = codigosExistentes.filter(
      (x) => x.toLowerCase() !== (empleado?.codigo ?? '').toLowerCase()
    )
    if (codigoLimpio === '') return setErrorCodigo('requerido')
    if (otros.some((x) => x.toLowerCase() === codigoLimpio.toLowerCase())) return setErrorCodigo('duplicado')
    if (nombreLimpio === '') return setErrorNombre(true)

    onGuardar({
      codigo: codigoLimpio,
      nombre_completo: nombreLimpio,
      foto_url: empleado?.foto_url ?? null,
      activo,
      estado_civil: limpio(estadoCivil),
      es_padre: esPadre,
      num_hijos: Math.max(0, Math.trunc(parsearNumero(numHijos) ?? 0)),
      esta_estudiando: estudiando,
      estudio: limpio(estudio),
      tipo_sangre: limpio(tipoSangre),
      eps: limpio(eps),
      caja_compensacion: limpio(caja),
      fondo_pension: limpio(pension),
      tipo_contrato: limpio(tipoContrato),
      salario: parsearNumero(salario),
      fecha_ingreso: fechaIngreso === '' ? null : fechaIngreso,
      aplica_auxilio_transporte: auxilio,
      jornada_inicio: jornadaIni === '' ? null : jornadaIni,
      jornada_fin: jornadaFin === '' ? null : jornadaFin,
      equipo: limpio(equipo),
      beneficio_lentes: lentes,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={empleado ? t.empleados.editarTitulo : t.empleados.nuevoTitulo}
    >
      <div className="my-4 w-full max-w-2xl rounded-xl border border-borde bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-brand-900">
          {empleado ? t.empleados.editarTitulo : t.empleados.nuevoTitulo}
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label={c.codigo} htmlFor="emp-codigo">
            <input
              id="emp-codigo"
              type="text"
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value)
                if (errorCodigo) setErrorCodigo(null)
              }}
              placeholder={t.empleados.codigoPlaceholder}
              className={`${claseInput} font-mono`}
            />
            {errorCodigo === 'requerido' && (
              <p className="mt-1 text-xs text-red-600">{t.empleados.errorCodigoRequerido}</p>
            )}
            {errorCodigo === 'duplicado' && (
              <p className="mt-1 text-xs text-red-600">{t.empleados.errorCodigoDuplicado(codigo.trim())}</p>
            )}
          </Campo>
          <Campo label={c.nombreCompleto} htmlFor="emp-nombre">
            <input
              id="emp-nombre"
              type="text"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value)
                if (errorNombre) setErrorNombre(false)
              }}
              className={claseInput}
            />
            {errorNombre && <p className="mt-1 text-xs text-red-600">{t.empleados.errorNombre}</p>}
          </Campo>
        </div>

        <div className="mt-3">
          <Check label={c.activo} checked={activo} onChange={setActivo} />
        </div>

        {/* Información básica */}
        <p className={SUBTITULO}>{t.empleados.bloques.basica}</p>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label={c.estadoCivil} htmlFor="emp-ecivil">
            <input id="emp-ecivil" type="text" value={estadoCivil} onChange={(e) => setEstadoCivil(e.target.value)} className={claseInput} />
          </Campo>
          <Campo label={c.tipoSangre} htmlFor="emp-sangre">
            <input id="emp-sangre" type="text" value={tipoSangre} onChange={(e) => setTipoSangre(e.target.value)} className={claseInput} />
          </Campo>
          <Campo label={c.eps} htmlFor="emp-eps">
            <input id="emp-eps" type="text" value={eps} onChange={(e) => setEps(e.target.value)} className={claseInput} />
          </Campo>
          <Campo label={c.numHijos} htmlFor="emp-hijos">
            <input id="emp-hijos" type="number" min={0} value={numHijos} onChange={(e) => setNumHijos(e.target.value)} className={`${claseInput} tabular-nums`} />
          </Campo>
          <Campo label={c.estudio} htmlFor="emp-estudio">
            <input id="emp-estudio" type="text" value={estudio} onChange={(e) => setEstudio(e.target.value)} className={claseInput} />
          </Campo>
          <div className="flex flex-col justify-end gap-2 pb-1">
            <Check label={c.esPadre} checked={esPadre} onChange={setEsPadre} />
            <Check label={c.estaEstudiando} checked={estudiando} onChange={setEstudiando} />
          </div>
        </div>

        {/* Contrato */}
        <p className={SUBTITULO}>{t.empleados.bloques.contrato}</p>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label={c.tipoContrato} htmlFor="emp-contrato">
            <input id="emp-contrato" type="text" value={tipoContrato} onChange={(e) => setTipoContrato(e.target.value)} className={claseInput} />
          </Campo>
          <Campo label={c.salario} htmlFor="emp-salario">
            <input id="emp-salario" type="text" inputMode="decimal" value={salario} onChange={(e) => setSalario(e.target.value)} placeholder="0" className={`${claseInput} text-right tabular-nums`} />
          </Campo>
          <Campo label={c.cajaCompensacion} htmlFor="emp-caja">
            <input id="emp-caja" type="text" value={caja} onChange={(e) => setCaja(e.target.value)} className={claseInput} />
          </Campo>
          <Campo label={c.fondoPension} htmlFor="emp-pension">
            <input id="emp-pension" type="text" value={pension} onChange={(e) => setPension(e.target.value)} className={claseInput} />
          </Campo>
          <Campo label={c.fechaIngreso} htmlFor="emp-ingreso">
            <input id="emp-ingreso" type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} className={claseInput} />
          </Campo>
          <Campo label={c.jornadaInicio} htmlFor="emp-jini">
            <input id="emp-jini" type="time" value={jornadaIni} onChange={(e) => setJornadaIni(e.target.value)} className={claseInput} />
          </Campo>
          <Campo label={c.jornadaFin} htmlFor="emp-jfin">
            <input id="emp-jfin" type="time" value={jornadaFin} onChange={(e) => setJornadaFin(e.target.value)} className={claseInput} />
          </Campo>
          <Campo label={c.equipo} htmlFor="emp-equipo">
            <input id="emp-equipo" type="text" value={equipo} onChange={(e) => setEquipo(e.target.value)} className={claseInput} />
          </Campo>
          <div className="flex items-end pb-1">
            <Check label={c.auxilioTransporte} checked={auxilio} onChange={setAuxilio} />
          </div>
        </div>

        {/* Beneficios */}
        <p className={SUBTITULO}>{t.empleados.bloques.beneficios}</p>
        <div className="mt-2">
          <Check label={c.beneficioLentes} checked={lentes} onChange={setLentes} />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-borde bg-white px-4 py-2 text-sm font-semibold text-tinta-suave transition-colors duration-150 hover:border-brand-700 hover:text-brand-700"
          >
            {t.comun.cancelar}
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={guardando}
            className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? t.empleados.guardando : t.empleados.guardar}
          </button>
        </div>
      </div>
    </div>
  )
}
