import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Inventario from './pages/Inventario'
import Entregas from './pages/Entregas'
import Login from './pages/Login'
import Clientes from './pages/Clientes'
import Produccion from './pages/Produccion'
import Reportes from './pages/Reportes'
import Configuracion from './pages/Configuracion'
import Productos from './pages/Productos'
import Usuarios from './pages/Usuarios'
import Materiales from './pages/Materiales'
import Creditos from './pages/Creditos'
import ProductosNoEntregados from './pages/ProductosNoEntregados'
import ProtectedRoute from './components/ProtectedRoute'
import Recetas from './pages/Recetas'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/ventas" element={<ProtectedRoute><POS /></ProtectedRoute>} />
        <Route path="/productos" element={<ProtectedRoute><Productos /></ProtectedRoute>} />
        <Route path="/inventario" element={<ProtectedRoute><Inventario /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
        <Route path="/produccion" element={<ProtectedRoute><Produccion /></ProtectedRoute>} />
        <Route path="/materiales" element={<ProtectedRoute><Materiales /></ProtectedRoute>} />
        <Route path="/entregas" element={<ProtectedRoute><Entregas /></ProtectedRoute>} />
        <Route path="/reportes" element={<ProtectedRoute><Reportes /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
        <Route path="/no-entregados" element={<ProtectedRoute><ProductosNoEntregados /></ProtectedRoute>} />
        <Route path="/configuracion" element={<ProtectedRoute><Configuracion /></ProtectedRoute>} />
        <Route path="/recetas" element={<ProtectedRoute><Recetas /></ProtectedRoute>} />
        <Route path="/creditos" element={<ProtectedRoute><Creditos /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App