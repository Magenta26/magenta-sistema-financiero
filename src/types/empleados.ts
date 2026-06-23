/**
 * Tipo de la ficha integral del empleado (la persona). Tabla central a la que
 * se vinculan natillera, nómina, préstamos y beneficios.
 */
export interface Empleado {
  id: string
  codigo: string
  nombre_completo: string
  foto_url: string | null
  activo: boolean

  // Información básica
  estado_civil: string | null
  es_padre: boolean
  num_hijos: number
  esta_estudiando: boolean
  estudio: string | null
  tipo_sangre: string | null
  eps: string | null

  // Contrato
  caja_compensacion: string | null
  fondo_pension: string | null
  tipo_contrato: string | null
  salario: number | null
  aplica_auxilio_transporte: boolean
  jornada_inicio: string | null
  jornada_fin: string | null
  equipo: string | null

  // Beneficios
  beneficio_lentes: boolean
}

/** Datos del formulario de alta/edición (sin id ni metadatos). */
export type DatosEmpleado = Omit<Empleado, 'id'>
