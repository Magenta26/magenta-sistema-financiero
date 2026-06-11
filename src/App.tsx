import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RutaProtegida from './components/RutaProtegida'
import Analisis from './pages/Analisis'
import BalanceGeneral from './pages/BalanceGeneral'
import Cargas from './pages/Cargas'
import Consolidado from './pages/Consolidado'
import EstadoResultados from './pages/EstadoResultados'
import Login from './pages/Login'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RutaProtegida />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/cargas" replace />} />
          <Route path="/cargas" element={<Cargas />} />
          <Route path="/consolidado" element={<Consolidado />} />
          <Route path="/estado-resultados" element={<EstadoResultados />} />
          <Route path="/balance-general" element={<BalanceGeneral />} />
          <Route path="/analisis" element={<Analisis />} />
          <Route path="*" element={<Navigate to="/cargas" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
