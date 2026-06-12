import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RutaProtegida from './components/RutaProtegida'
import Analisis from './pages/Analisis'
import BalanceGeneral from './pages/BalanceGeneral'
import Cargas from './pages/Cargas'
import Consolidado from './pages/Consolidado'
import EstadoResultados from './pages/EstadoResultados'
import Login from './pages/Login'
import Nomina from './pages/Nomina'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RutaProtegida />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/finanzas/cargas" replace />} />

          {/* Módulo Finanzas */}
          <Route path="/finanzas" element={<Navigate to="/finanzas/cargas" replace />} />
          <Route path="/finanzas/cargas" element={<Cargas />} />
          <Route path="/finanzas/consolidado" element={<Consolidado />} />
          <Route path="/finanzas/estado-resultados" element={<EstadoResultados />} />
          <Route path="/finanzas/balance-general" element={<BalanceGeneral />} />
          <Route path="/finanzas/analisis" element={<Analisis />} />

          {/* Módulo Nómina (placeholder) */}
          <Route path="/nomina" element={<Nomina />} />

          {/* Redirects de las rutas viejas */}
          <Route path="/cargas" element={<Navigate to="/finanzas/cargas" replace />} />
          <Route path="/consolidado" element={<Navigate to="/finanzas/consolidado" replace />} />
          <Route
            path="/estado-resultados"
            element={<Navigate to="/finanzas/estado-resultados" replace />}
          />
          <Route
            path="/balance-general"
            element={<Navigate to="/finanzas/balance-general" replace />}
          />
          <Route path="/analisis" element={<Navigate to="/finanzas/analisis" replace />} />

          <Route path="*" element={<Navigate to="/finanzas/cargas" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
