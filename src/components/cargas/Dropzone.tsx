import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { useTranslation } from '../../hooks/useTranslation'

interface DropzoneProps {
  onArchivo: (archivo: File) => void
  deshabilitado?: boolean
}

/** Zona de arrastre (o clic) que acepta solo .xlsx. */
export default function Dropzone({ onArchivo, deshabilitado }: DropzoneProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [errorTipo, setErrorTipo] = useState<string | null>(null)

  const recibir = (archivo: File | undefined) => {
    if (!archivo) return
    if (!archivo.name.toLowerCase().endsWith('.xlsx')) {
      setErrorTipo(t.cargas.archivoNoXlsx(archivo.name))
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
        aria-label={t.cargas.dropzoneAria}
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
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors duration-150 ${
          arrastrando
            ? 'border-brand-700 bg-brand-50'
            : 'border-gray-300 bg-white hover:border-brand-500'
        } ${deshabilitado ? 'pointer-events-none opacity-50' : ''}`}
      >
        <p className="text-lg font-medium text-brand-900">{t.cargas.dropzoneTitulo}</p>
        <p className="mt-1 text-sm text-tinta-suave">
          {t.cargas.dropzoneSubtitulo} <span className="font-mono">.xlsx</span>
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
        <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorTipo}
        </p>
      )}
    </div>
  )
}
