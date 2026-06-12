export default function Nomina() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900">Nómina</h1>
      <p className="mt-2 max-w-2xl text-sm text-tinta-suave">
        Gestión de nómina y personal de Magenta Farms.
      </p>
      <div className="mt-8 rounded-2xl border border-dashed border-brand-200 bg-white p-14 text-center shadow-sm">
        <p className="text-4xl" aria-hidden="true">
          🚧
        </p>
        <p className="mt-4 text-lg font-semibold text-brand-900">Módulo en construcción</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-tinta-suave">
          Este módulo está en preparación. Cuando esté disponible, aquí se gestionarán las
          liquidaciones, los aportes y los reportes de personal.
        </p>
        <span className="mt-5 inline-block rounded-full bg-brand-200/40 px-3 py-1 text-xs font-semibold text-brand-700">
          Próximamente
        </span>
      </div>
    </div>
  )
}
