/**
 * Tipos del seguimiento de vacaciones. Solo se persisten los períodos TOMADOS;
 * la causación (15 días hábiles/año) se calcula al vuelo (ver lib/vacaciones).
 */
export interface PeriodoVacaciones {
  id: string
  empleado_id: string
  fecha_inicio: string
  fecha_fin: string | null
  dias_habiles: number
  nota: string | null
  creado_en: string
}

/** Datos del formulario de registro de un período (sin id ni metadatos). */
export interface DatosPeriodoVacaciones {
  empleado_id: string
  fecha_inicio: string
  fecha_fin: string | null
  dias_habiles: number
  nota: string | null
}
