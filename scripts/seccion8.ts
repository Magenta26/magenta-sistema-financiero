/** Cifras de referencia del Excel histórico (PLAN.md sección 8). */
export const REFERENCIAS = {
  ingresos: new Map<number, number>([
    [1, 180390855.54],
    [2, 158112603.9],
    [3, 193546647.16],
    [4, 188101289.42],
    [5, 258299361.58],
  ]),
  costo: new Map<number, number>([
    [1, 112902388.65],
    [5, 153617545.28],
  ]),
  utilidadNeta: new Map<number, number>([
    [1, 15479983.05],
    [5, 53507262.68],
  ]),
}

export const TOLERANCIA = 1

export function comparar(etiqueta: string, calculado: number | undefined, esperado: number): string {
  if (calculado === undefined) return `✗ ${etiqueta}: SIN DATOS (esperado ${esperado.toFixed(2)})`
  const diferencia = calculado - esperado
  const ok = Math.abs(diferencia) <= TOLERANCIA
  return ok
    ? `✓ ${etiqueta}: ${calculado.toFixed(2)} (esperado ${esperado.toFixed(2)})`
    : `✗ ${etiqueta}: ${calculado.toFixed(2)} vs esperado ${esperado.toFixed(2)} -> DIFERENCIA ${diferencia.toFixed(2)}`
}
