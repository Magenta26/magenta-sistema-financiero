interface PlaceholderProps {
  titulo: string
  descripcion: string
  fase: number
}

/** Página provisional mientras se construye el módulo en su fase correspondiente. */
export default function Placeholder({ titulo, descripcion, fase }: PlaceholderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">{titulo}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ciruela-300">{descripcion}</p>
      <div className="mt-8 rounded-2xl border border-dashed border-ciruela-700 bg-ciruela-900/50 p-12 text-center">
        <p className="text-ciruela-400">Este módulo se construirá en la</p>
        <p className="mt-1 text-lg font-semibold text-magenta-400">Fase {fase}</p>
      </div>
    </div>
  )
}
