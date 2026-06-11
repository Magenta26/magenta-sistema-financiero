export interface DatosToast {
  tipo: 'exito' | 'error'
  mensaje: string
}

/** Notificación flotante simple (abajo a la derecha). */
export default function Toast({ toast }: { toast: DatosToast | null }) {
  if (!toast) return null
  return (
    <div
      role="status"
      className={`fixed bottom-6 right-6 z-50 max-w-md rounded-xl border px-4 py-3 text-sm shadow-lg ${
        toast.tipo === 'exito'
          ? 'border-green-200 bg-green-50 text-exito'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {toast.tipo === 'exito' ? '✅ ' : '⛔ '}
      {toast.mensaje}
    </div>
  )
}
