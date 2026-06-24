import { useRef, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../../hooks/useTranslation'
import { fecha as fechaFmt, moneda } from '../../lib/formato'
import { iniciales } from '../../lib/empleados'
import type { ResumenNatillera } from '../../lib/empleados'
import type { Empleado } from '../../types/empleados'
import {
  IconoAlerta,
  IconoBeneficios,
  IconoCamara,
  IconoChevron,
  IconoContrato,
  IconoFlecha,
  IconoHorasExtras,
  IconoLapiz,
  IconoLentes,
  IconoNatillera,
  IconoPrestamo,
  IconoUsuario,
} from './iconos'

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

type IconoProps = { size?: number; className?: string }
type SeccionId = 'basica' | 'contrato' | 'natillera' | 'beneficios'

interface ItemMenu {
  id: SeccionId | 'horasExtras' | 'prestamo'
  label: string
  icono: ComponentType<IconoProps>
  deshabilitado?: boolean
}

/** Una fila etiqueta + valor del grid de detalle. */
function Campo({
  label,
  children,
  full,
}: {
  label: string
  children: ReactNode
  full?: boolean
}) {
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-tinta-suave">
        {label}
      </div>
      <div className="text-sm text-tinta">{children}</div>
    </div>
  )
}

/** Punto verde de estado (Sí / Aplica). */
function PuntoVerde() {
  return <span className="inline-block h-[7px] w-[7px] shrink-0 rounded-full bg-[#22C55E]" />
}

/** Divisor interno full-width del grid. */
function Divisor() {
  return <div className="h-px bg-brand-50 sm:col-span-2" />
}

/** Cabecera común de cada sección de detalle: cuadro de icono + título + subtítulo. */
function CabeceraSeccion({
  icono: Icono,
  titulo,
  subtitulo,
}: {
  icono: ComponentType<IconoProps>
  titulo: string
  subtitulo: string
}) {
  return (
    <div className="mb-6 flex items-center gap-3 border-b border-borde pb-[18px]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-50 text-brand-700">
        <Icono size={20} />
      </div>
      <div>
        <div className="text-[15px] font-bold text-brand-900">{titulo}</div>
        <div className="mt-0.5 text-xs text-tinta-suave">{subtitulo}</div>
      </div>
    </div>
  )
}

const BADGE_ACTIVO = 'inline-flex items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-bold text-[#15803D]'

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
  const f = e.ficha
  const inputFoto = useRef<HTMLInputElement>(null)
  const [seccion, setSeccion] = useState<SeccionId>('basica')

  const siNo = (v: boolean) => (v ? e.si : e.no)
  const texto = (v: string | null) => (v && v.trim() !== '' ? v : e.sinDato)
  const hora = (v: string | null) => (v ? v.slice(0, 5) : null)
  const jornada =
    hora(empleado.jornada_inicio) || hora(empleado.jornada_fin)
      ? `${hora(empleado.jornada_inicio) ?? '—'} – ${hora(empleado.jornada_fin) ?? '—'}`
      : e.sinDato
  const esPrueba = empleado.codigo.toUpperCase() === 'EMP-999'

  const subtitulo = [empleado.codigo, f.modulo, empleado.equipo].filter(Boolean).join(' · ')

  const items: ItemMenu[] = [
    { id: 'basica', label: e.bloques.basica, icono: IconoUsuario },
    { id: 'contrato', label: e.bloques.contrato, icono: IconoContrato },
    { id: 'natillera', label: e.bloques.natillera, icono: IconoNatillera },
    { id: 'beneficios', label: e.bloques.beneficios, icono: IconoBeneficios },
    { id: 'horasExtras', label: e.bloques.horasExtras, icono: IconoHorasExtras, deshabilitado: true },
    { id: 'prestamo', label: e.bloques.prestamo, icono: IconoPrestamo, deshabilitado: true },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={onVolver}
        className="text-[13px] font-medium text-brand-700 transition-opacity duration-150 hover:opacity-70"
      >
        {e.volver}
      </button>

      {/* ===== Tarjeta de cabecera ===== */}
      <div className="mt-3 overflow-hidden rounded-xl border border-borde border-t-[3px] border-t-brand-700 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-5 px-6 pb-4 pt-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            {fotoUrl ? (
              <img
                src={fotoUrl}
                alt={empleado.nombre_completo}
                className="h-[76px] w-[76px] rounded-2xl object-cover"
              />
            ) : (
              <div
                className="flex h-[76px] w-[76px] items-center justify-center rounded-2xl text-2xl font-extrabold tracking-tight text-white"
                style={{ background: 'linear-gradient(145deg,#501040,#a03080)' }}
                aria-hidden="true"
              >
                {iniciales(empleado.nombre_completo)}
              </div>
            )}
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-[13px] w-[13px] rounded-full border-[2.5px] border-white ${
                empleado.activo ? 'bg-[#22C55E]' : 'bg-gray-400'
              }`}
            />
            {esEditor && (
              <>
                <button
                  type="button"
                  onClick={() => inputFoto.current?.click()}
                  disabled={subiendoFoto}
                  title={empleado.foto_url ? e.foto.cambiar : e.foto.subir}
                  className="absolute -right-1.5 -top-1.5 flex h-[26px] w-[26px] items-center justify-center rounded-md border border-borde bg-white text-brand-700 shadow-sm transition-colors duration-150 hover:bg-brand-50 disabled:opacity-50"
                >
                  <IconoCamara size={14} />
                </button>
                <input
                  ref={inputFoto}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(ev) => {
                    const file = ev.target.files?.[0]
                    if (file) onSubirFoto(file)
                    ev.target.value = ''
                  }}
                />
              </>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold leading-tight text-brand-900">
                {empleado.nombre_completo}
              </h1>
              {esPrueba && (
                <span className="rounded bg-[#FEF3C7] px-[7px] py-0.5 text-[10px] font-bold tracking-wide text-[#B45309]">
                  {f.prueba}
                </span>
              )}
              <span
                className={
                  empleado.activo
                    ? BADGE_ACTIVO
                    : 'inline-flex items-center gap-1.5 rounded-full border border-borde bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-tinta-suave'
                }
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    empleado.activo ? 'bg-[#22C55E]' : 'bg-gray-400'
                  }`}
                />
                {empleado.activo ? e.activo : e.inactivo}
              </span>
            </div>
            <div className="mt-1 text-[13px] font-medium text-tinta-suave">{subtitulo}</div>
          </div>

          {/* Editar */}
          {esEditor && (
            <button
              type="button"
              onClick={onEditar}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-700 px-[18px] py-2.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-brand-900"
            >
              <IconoLapiz size={14} />
              {e.editar}
            </button>
          )}
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-2 gap-px border-t border-borde bg-borde sm:grid-cols-4">
          {[
            { label: f.metricas.salario, valor: empleado.salario != null ? moneda(empleado.salario) : e.sinDato },
            { label: f.metricas.contrato, valor: texto(empleado.tipo_contrato) },
            { label: f.metricas.jornada, valor: jornada },
            { label: f.metricas.eps, valor: texto(empleado.eps) },
          ].map((m) => (
            <div key={m.label} className="bg-white px-5 py-3">
              <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-tinta-suave">
                {m.label}
              </div>
              <div className="truncate text-sm font-bold text-brand-900" title={m.valor}>
                {m.valor}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Fila: menú de secciones + detalle ===== */}
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Menú de secciones */}
        <nav className="w-full rounded-xl bg-white p-2 shadow-sm lg:w-[216px] lg:flex-none">
          <div className="px-2 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-tinta-suave">
            {f.secciones}
          </div>
          {items.map((item) => {
            const Icono = item.icono
            const activo = !item.deshabilitado && item.id === seccion
            if (item.deshabilitado) {
              return (
                <div
                  key={item.id}
                  className="mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2.5 opacity-50"
                >
                  <Icono size={16} className="text-tinta-suave" />
                  <span className="flex-1 text-[13px] font-medium text-tinta-suave">
                    {item.label}
                  </span>
                  <span className="rounded bg-borde px-[7px] py-0.5 text-[9px] font-bold tracking-wide text-tinta-suave">
                    {f.pronto}
                  </span>
                </div>
              )
            }
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSeccion(item.id as SeccionId)}
                className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 ${
                  activo
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-tinta hover:bg-brand-50'
                }`}
              >
                <Icono size={16} className={activo ? 'text-brand-700' : 'text-tinta-suave'} />
                <span className={`flex-1 text-[13px] ${activo ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
                {activo && <IconoChevron size={12} className="text-brand-700" />}
              </button>
            )
          })}
        </nav>

        {/* Panel de detalle */}
        <div className="min-h-[480px] w-full flex-1 rounded-xl bg-white p-7 shadow-sm">
          <div key={seccion} className="seccion-entra">
            {seccion === 'basica' && (
              <>
                <CabeceraSeccion
                  icono={IconoUsuario}
                  titulo={e.bloques.basica}
                  subtitulo={f.subtitulos.basica}
                />
                <div className="grid grid-cols-1 gap-x-12 gap-y-[22px] sm:grid-cols-2">
                  <Campo label={c.estadoCivil}>{texto(empleado.estado_civil)}</Campo>
                  <Campo label={c.tipoSangre}>
                    {empleado.tipo_sangre && empleado.tipo_sangre.trim() !== '' ? (
                      <span className="inline-flex items-center rounded-md bg-brand-50 px-2.5 py-1 text-sm font-bold text-brand-700">
                        {empleado.tipo_sangre}
                      </span>
                    ) : (
                      e.sinDato
                    )}
                  </Campo>
                  <Campo label={c.esPadre}>
                    <span className="flex items-center gap-1.5">
                      {empleado.es_padre && <PuntoVerde />}
                      {siNo(empleado.es_padre)}
                    </span>
                  </Campo>
                  <Campo label={c.numHijos}>{empleado.num_hijos}</Campo>
                  <Campo label={c.estaEstudiando}>
                    <span className="flex items-center gap-1.5">
                      {empleado.esta_estudiando && <PuntoVerde />}
                      {siNo(empleado.esta_estudiando)}
                    </span>
                  </Campo>
                  <Campo label={c.estudio}>{texto(empleado.estudio)}</Campo>
                  <Divisor />
                  <Campo label={c.eps}>{texto(empleado.eps)}</Campo>
                </div>
              </>
            )}

            {seccion === 'contrato' && (
              <>
                <CabeceraSeccion
                  icono={IconoContrato}
                  titulo={e.bloques.contrato}
                  subtitulo={f.subtitulos.contrato}
                />
                <div className="grid grid-cols-1 gap-x-12 gap-y-[22px] sm:grid-cols-2">
                  <Campo label={c.tipoContrato}>{texto(empleado.tipo_contrato)}</Campo>
                  <Campo label={f.metricas.salario}>
                    {empleado.salario != null ? (
                      <span className="text-base font-extrabold text-brand-700">
                        {moneda(empleado.salario)}
                      </span>
                    ) : (
                      e.sinDato
                    )}
                  </Campo>
                  <Campo label={c.cajaCompensacion}>{texto(empleado.caja_compensacion)}</Campo>
                  <Campo label={c.fondoPension}>{texto(empleado.fondo_pension)}</Campo>
                  <Campo label={c.fechaIngreso}>
                    {empleado.fecha_ingreso ? fechaFmt(empleado.fecha_ingreso) : e.sinDato}
                  </Campo>
                  <Divisor />
                  <Campo label={f.auxilioTransporte}>
                    <span className="flex items-center gap-1.5">
                      {empleado.aplica_auxilio_transporte && <PuntoVerde />}
                      {empleado.aplica_auxilio_transporte ? f.aplica : f.noAplica}
                    </span>
                  </Campo>
                  <Campo label={c.equipo}>{texto(empleado.equipo)}</Campo>
                  <Campo label={c.jornadaInicio}>
                    <span className="font-bold">{hora(empleado.jornada_inicio) ?? e.sinDato}</span>
                  </Campo>
                  <Campo label={c.jornadaFin}>
                    <span className="font-bold">{hora(empleado.jornada_fin) ?? e.sinDato}</span>
                  </Campo>
                </div>
              </>
            )}

            {seccion === 'natillera' && (
              <>
                <CabeceraSeccion
                  icono={IconoNatillera}
                  titulo={e.bloques.natillera}
                  subtitulo={f.subtitulos.natillera}
                />
                {natillera ? (
                  <>
                    <p
                      className={`text-sm font-semibold ${
                        natillera.ahorrando ? 'text-exito' : 'text-tinta-suave'
                      }`}
                    >
                      {natillera.ahorrando ? e.natillera.ahorrando : e.natillera.noAhorrando}
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-x-12 gap-y-[22px] sm:grid-cols-2">
                      <Campo label={e.natillera.cuota}>{moneda(natillera.cuota)}</Campo>
                      <Campo label={e.natillera.total}>
                        <span className="text-base font-extrabold text-brand-700">
                          {moneda(natillera.total)}
                        </span>
                      </Campo>
                    </div>
                    <Link
                      to="/nomina/natillera"
                      className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 transition-opacity duration-150 hover:opacity-70"
                    >
                      {f.irNatillera}
                      <IconoFlecha size={13} />
                    </Link>
                  </>
                ) : (
                  <div className="flex items-start gap-3.5 rounded-[10px] border border-[#FDE68A] bg-[#FFFBF0] p-5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#D97706]">
                      <IconoAlerta size={18} />
                    </div>
                    <div>
                      <div className="mb-1 text-[13px] font-semibold text-[#92400E]">
                        {f.natilleraVaciaTitulo}
                      </div>
                      <div className="mb-3.5 text-[13px] leading-relaxed text-[#A16207]">
                        {f.natilleraVaciaTexto}
                      </div>
                      <Link
                        to="/nomina/natillera"
                        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 transition-opacity duration-150 hover:opacity-70"
                      >
                        {f.irNatillera}
                        <IconoFlecha size={13} />
                      </Link>
                    </div>
                  </div>
                )}
              </>
            )}

            {seccion === 'beneficios' && (
              <>
                <CabeceraSeccion
                  icono={IconoBeneficios}
                  titulo={e.bloques.beneficios}
                  subtitulo={f.subtitulos.beneficios}
                />
                <div className="flex items-center justify-between gap-3 rounded-[10px] border border-borde bg-fondo px-[18px] py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                      <IconoLentes size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-tinta">{c.beneficioLentes}</div>
                      <div className="mt-0.5 text-xs text-tinta-suave">{f.beneficioLentesDesc}</div>
                    </div>
                  </div>
                  {empleado.beneficio_lentes ? (
                    <span className={BADGE_ACTIVO}>{e.activo}</span>
                  ) : (
                    <span className="rounded-full border border-borde bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-tinta-suave">
                      {e.sinDato}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
