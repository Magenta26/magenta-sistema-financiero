import { useRef, useState } from 'react'
import type { DragEvent } from 'react'

interface DropzoneProps {
  onArchivo: (archivo: File) => void
  deshabilitado?: boolean
}

/** Zona de arrastre (o clic) que acepta solo .xlsx. */
export default function Dropzone({ onArchivo, deshabilitado }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [errorTipo, setErrorTipo] = useState<string | null>(null)

  const recibir = (archivo: File | undefined) => {
    if (!archivo) return
    if (!archivo.name.toLowerCase().endsWith('.xlsx')) {
      setErrorTipo(`"${archivo.name}" no es un archivo .xlsx.`)
      return
    }
    setErrorTipo(null)
    onArchivo(archivo)
  }

  const alSoltar = (e: DragEvent) => {
    e.preventDefault()
    setArrastrando(false)
    if (deshabilitado) return
    recibir(e.dataTransfer.files[0])
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Subir balance de prueba .xlsx"
        onClick={() => !deshabilitado && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !deshabilitado) inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!deshabilitado) setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={alSoltar}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          arrastrando
            ? 'border-magenta-500 bg-magenta-600/10'
            : 'border-ciruela-700 bg-ciruela-900/50 hover:border-magenta-500/60'
        } ${deshabilitado ? 'pointer-events-none opacity-50' : ''}`}
      >
        <p className="text-lg text-white">Arrastra aquí el balance de prueba de SIIGO</p>
        <p className="mt-1 text-sm text-ciruela-400">
          o haz clic para seleccionarlo — solo archivos <span className="font-mono">.xlsx</span>
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => {
          recibir(e.target.files?.[0])
          e.target.value = '' // permite volver a elegir el mismo archivo
        }}
      />
      {errorTipo && (
        <p role="alert" className="mt-3 rounded-lg border border-red-800 bg-red-950/60 px-3 py-2 text-sm text-red-300">
          {errorTipo}
        </p>
      )}
    </div>
  )
}
