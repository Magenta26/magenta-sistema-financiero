interface PlaceholderProps {
  titulo: string
  descripcion: string
  fase: number
}

/** Página provisional mientras se construye el módulo en su fase correspondiente. */
export default function Placeholder({ titulo, descripcion, fase }: PlaceholderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900">{titulo}</h1>
      <p className="mt-2 max-w-2xl text-sm text-tinta-suave">{descripcion}</p>
      <div className="mt-8 rounded-2xl border border-dashed border-borde bg-white p-12 text-center">
        <p className="text-tinta-suave">Este módulo se construirá en la</p>
        <p className="mt-1 text-lg font-semibold text-brand-700">Fase {fase}</p>
      </div>
    </div>
  )
}
