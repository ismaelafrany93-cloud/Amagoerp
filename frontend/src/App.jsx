import { HashRouter, Routes, Route } from 'react-router-dom'
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
import Productoa from './pages/Productos'
import ProductosNoEntregados from './pages/ProductosNoEntregados'
import ProtectedRoute from './components/ProtectedRoute'
import Recetas from './pages/Recetas'
import Historial from './pages/Historial'
import Sucursales from './pages/Sucursales'
import Transferencias from './pages/Transferencias'
import NoEntregados from './pages/NoEntregados'
import Cambios from './pages/Cambios'
import Nomina from './pages/Nomina'
import Empleados from './pages/Empleados'
import CuentasPagar from './pages/CuentasPagar'
import Gastos from './pages/Gastos'
import CostosProductos from './pages/CostosProductos'
import Pedidos from './pages/Pedidos'

// 👇 IMPORTAR CORRECTAMENTE DESDE SU PROPIO ARCHIVO
import SolicitudesDescuento from './pages/SolicitudesDescuento'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/ventas" element={<ProtectedRoute><POS /></ProtectedRoute>} />
        <Route path="/productos" element={<ProtectedRoute><Productos /></ProtectedRoute>} />
        
        {/* INVENTARIO CON PROPS */}
        <Route path="/inventario" element={<ProtectedRoute><Inventario sucursalId={3} sucursalNombre="Principal" /></ProtectedRoute>} />
        <Route path="/inventario-bani" element={<ProtectedRoute><Inventario sucursalId={1} sucursalNombre="Baní" /></ProtectedRoute>} />
        <Route path="/inventario-sabana" element={<ProtectedRoute><Inventario sucursalId={2} sucursalNombre="Sabana" /></ProtectedRoute>} />
        
        <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
        <Route path="/productos" element={<ProtectedRoute><Productos /></ProtectedRoute>} />
        <Route path="/produccion" element={<ProtectedRoute><Produccion /></ProtectedRoute>} />
        <Route path="/materiales" element={<ProtectedRoute><Materiales /></ProtectedRoute>} />
        <Route path="/entregas" element={<ProtectedRoute><Entregas /></ProtectedRoute>} />
        <Route path="/reportes" element={<ProtectedRoute><Reportes /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
        <Route path="/no-entregados" element={<ProtectedRoute><ProductosNoEntregados /></ProtectedRoute>} />
        <Route path="/configuracion" element={<ProtectedRoute><Configuracion /></ProtectedRoute>} />
        <Route path="/recetas" element={<ProtectedRoute><Recetas /></ProtectedRoute>} />
        <Route path="/creditos" element={<ProtectedRoute><Creditos /></ProtectedRoute>} />
        <Route path="/historial" element={<ProtectedRoute><Historial /></ProtectedRoute>} />
        <Route path="/sucursales" element={<ProtectedRoute><Sucursales /></ProtectedRoute>} />
        <Route path="/transferencias" element={<ProtectedRoute><Transferencias /></ProtectedRoute>} />
        <Route path="/cambios" element={<ProtectedRoute><Cambios /></ProtectedRoute>} />
        <Route path="/nomina" element={<ProtectedRoute><Nomina /></ProtectedRoute>} />
        <Route path="/empleados" element={<ProtectedRoute><Empleados /></ProtectedRoute>} />
        <Route path="/cuentas-pagar" element={<ProtectedRoute><CuentasPagar /></ProtectedRoute>} />
        <Route path="/pedidos" element={<ProtectedRoute><Pedidos /></ProtectedRoute>} />
        <Route path="/gastos" element={<ProtectedRoute><Gastos /></ProtectedRoute>} />
        <Route path="/costos-productos" element={<ProtectedRoute><CostosProductos /></ProtectedRoute>} />
        
        {/* 👇 RUTA CORRECTA DE SOLICITUDES DE DESCUENTO - CON GUION */}
        <Route path="/solicitudes-descuento" element={<ProtectedRoute><SolicitudesDescuento /></ProtectedRoute>} />
      </Routes>
    </HashRouter>
  )
}

export default App