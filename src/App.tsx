import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RutaProtegida from './components/RutaProtegida'
import Analisis from './pages/Analisis'
import BalanceGeneral from './pages/BalanceGeneral'
import CambiarPassword from './pages/CambiarPassword'
import Cargas from './pages/Cargas'
import Consolidado from './pages/Consolidado'
import EstadoResultados from './pages/EstadoResultados'
import Login from './pages/Login'
import Natillera from './pages/Natillera'
import Empleados from './pages/Empleados'
import Vacaciones from './pages/Vacaciones'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RutaProtegida />}>
        {/* Cambio de contraseña obligatorio: protegida pero fuera del Layout */}
        <Route path="/cambiar-password" element={<CambiarPassword />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/finanzas/cargas" replace />} />

          {/* Módulo Finanzas */}
          <Route path="/finanzas" element={<Navigate to="/finanzas/cargas" replace />} />
          <Route path="/finanzas/cargas" element={<Cargas />} />
          <Route path="/finanzas/consolidado" element={<Consolidado />} />
          <Route path="/finanzas/estado-resultados" element={<EstadoResultados />} />
          <Route path="/finanzas/balance-general" element={<BalanceGeneral />} />
          <Route path="/finanzas/analisis" element={<Analisis />} />

          {/* Módulo Nómina */}
          <Route path="/nomina" element={<Navigate to="/nomina/natillera" replace />} />
          <Route path="/nomina/natillera" element={<Natillera />} />
          <Route path="/nomina/empleados" element={<Empleados />} />
          <Route path="/nomina/vacaciones" element={<Vacaciones />} />

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
