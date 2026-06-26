import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RutaProtegida from './components/RutaProtegida'
import GuardAcceso from './components/GuardAcceso'
import Inicio from './components/Inicio'
import Analisis from './pages/Analisis'
import BalanceGeneral from './pages/BalanceGeneral'
import CambiarPassword from './pages/CambiarPassword'
import Cargas from './pages/Cargas'
import Consolidado from './pages/Consolidado'
import EstadoResultados from './pages/EstadoResultados'
import Login from './pages/Login'
import Natillera from './pages/Natillera'
import Empleados from './pages/Empleados'
import Externos from './pages/Externos'
import CatalogoExternos from './pages/externos/CatalogoExternos'
import RegistroExternos from './pages/externos/RegistroExternos'
import LiquidacionExternos from './pages/externos/LiquidacionExternos'
import Vacaciones from './pages/Vacaciones'
import Usuarios from './pages/Usuarios'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RutaProtegida />}>
        {/* Cambio de contraseña obligatorio: protegida pero fuera del Layout */}
        <Route path="/cambiar-password" element={<CambiarPassword />} />
        <Route element={<Layout />}>
          {/* Inicio según rol (nomina → su módulo; resto → Cargas) */}
          <Route path="/" element={<Inicio />} />

          {/* Módulo Finanzas — solo admin/contadora (guard + RLS) */}
          <Route element={<GuardAcceso requiere="finanzas" />}>
            <Route path="/finanzas" element={<Navigate to="/finanzas/cargas" replace />} />
            <Route path="/finanzas/cargas" element={<Cargas />} />
            <Route path="/finanzas/consolidado" element={<Consolidado />} />
            <Route path="/finanzas/estado-resultados" element={<EstadoResultados />} />
            <Route path="/finanzas/balance-general" element={<BalanceGeneral />} />
            <Route path="/finanzas/analisis" element={<Analisis />} />

            {/* Redirects de las rutas viejas (quedan bajo el mismo guard) */}
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
          </Route>

          {/* Externos — admin/contadora/nomina/lider_campo */}
          <Route element={<GuardAcceso requiere="externos" />}>
            <Route path="/nomina/externos" element={<Externos />}>
              <Route index element={<CatalogoExternos />} />
              <Route path="registro" element={<RegistroExternos />} />
              <Route path="liquidacion" element={<LiquidacionExternos />} />
            </Route>
          </Route>

          {/* Núcleo de Nómina — admin/contadora/nomina (sin lider_campo) */}
          <Route element={<GuardAcceso requiere="nomina" />}>
            <Route path="/nomina" element={<Navigate to="/nomina/natillera" replace />} />
            <Route path="/nomina/natillera" element={<Natillera />} />
            <Route path="/nomina/empleados" element={<Empleados />} />
            <Route path="/nomina/vacaciones" element={<Vacaciones />} />
          </Route>

          {/* Administración — solo admin */}
          <Route element={<GuardAcceso requiere="admin" />}>
            <Route path="/admin" element={<Navigate to="/admin/usuarios" replace />} />
            <Route path="/admin/usuarios" element={<Usuarios />} />
          </Route>

          {/* Catch-all: a la ruta de inicio según el rol */}
          <Route path="*" element={<Inicio />} />
        </Route>
      </Route>
    </Routes>
  )
}
