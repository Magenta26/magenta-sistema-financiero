/**
 * Tipos del módulo PAGO A EXTERNOS (personas externas a las que se les paga
 * quincenalmente por tallos + horas). Catálogo PROPIO, INDEPENDIENTE de la
 * contabilidad y más amplio que los externos de la natillera.
 *
 * Entrega 1 cubre el catálogo (`Externo`) + las tarifas (`TarifasExternos`).
 * `RegistroExterno` y `DeduccionExterno` quedan tipados para la Entrega 2.
 */

export interface Externo {
  id: string
  /** Código único EXT-### (autosugerido al crear, editable). */
  codigo: string
  nombre_completo: string
  /** Cédula (opcional). */
  cedula: string | null
  activo: boolean
  /**
   * Vínculo OPCIONAL con la natillera (`natillera_empleados.id`): si el externo
   * ahorra, se usa para leer su cuota y deducir el 50%. null = no ahorra.
   */
  natillera_empleado_id: string | null
  creado_en: string | null
}

/** Datos del formulario de alta/edición del catálogo. */
export interface DatosExterno {
  codigo: string
  nombre_completo: string
  cedula: string | null
  activo: boolean
  natillera_empleado_id: string | null
}

/** Tarifas globales (una sola fila de config). */
export interface TarifasExternos {
  maquillada_valor: number
  hydratada_valor: number
  hora_valor: number
}

/** Producción diaria de un externo. */
export interface RegistroExterno {
  id: string
  externo_id: string
  fecha: string
  maquillada_tallos: number
  hydratada_tallos: number
  horas: number
}

/** Datos del formulario de captura de producción. */
export interface DatosRegistro {
  externo_id: string
  fecha: string
  maquillada_tallos: number
  hydratada_tallos: number
  horas: number
}

/** Quincena: 1 = días 1–15 · 2 = días 16–fin de mes. */
export type Quincena = 1 | 2

/** Tipo de deducción manual. */
export type TipoDeduccion = 'prestamo' | 'otro'

/** Deducción manual por quincena. */
export interface DeduccionExterno {
  id: string
  externo_id: string
  anio: number
  quincena: Quincena
  tipo: string
  valor: number
  nota: string | null
}

/** Datos del formulario de deducción manual (la quincena la fija el período activo). */
export interface DatosDeduccion {
  tipo: TipoDeduccion
  valor: number
  nota: string | null
}
