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
      className={`fixed bottom-6 right-6 z-50 max-w-md rounded-xl border px-4 py-3 text-sm shadow-xl shadow-black/50 ${
        toast.tipo === 'exito'
          ? 'border-emerald-700 bg-emerald-950 text-emerald-200'
          : 'border-red-800 bg-red-950 text-red-200'
      }`}
    >
      {toast.tipo === 'exito' ? '✅ ' : '⛔ '}
      {toast.mensaje}
    </div>
  )
}
