
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
import ProductosNoEntregados from './pages/ProductosNoEntregados'
import ProtectedRoute from './components/ProtectedRoute'
import Recetas from './pages/Recetas'
import Historial from './pages/Historial'
import Sucursales from './pages/Sucursales'
import Transferencias from './pages/Transferencias'
import Cambios from './pages/Cambios'
import Nomina from './pages/Nomina'
import Empleados from './pages/Empleados'
import CuentasPagar from './pages/CuentasPagar'
import Gastos from './pages/Gastos'
import CostosProductos from './pages/CostosProductos'
import Pedidos from './pages/Pedidos'
import SolicitudesDescuento from './pages/SolicitudesDescuento'

// ACTIVAR MANTENIMIENTO: true
// DESACTIVAR MANTENIMIENTO: false
const MODO_MANTENIMIENTO = true

function PantallaMantenimiento() {
  return (
    <div style={{
      minHeight: '100vh',
      padding: '24px',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top, #12365a, #07111f 70%)',
      fontFamily: "'Segoe UI', Arial, sans-serif"
    }}>
      <div style={{
        width: '100%',
        maxWidth: '560px',
        boxSizing: 'border-box',
        padding: '45px 30px',
        textAlign: 'center',
        color: '#ffffff',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: '24px',
        boxShadow: '0 25px 70px rgba(0,0,0,0.35)'
      }}>
        <div style={{
          width: '86px',
          height: '86px',
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '22px',
          background: 'rgba(240,180,77,0.13)',
          border: '1px solid rgba(240,180,77,0.35)',
          fontSize: '42px'
        }}>
          ⚙️
        </div>

        <div style={{
          color: '#f0b44d',
          fontSize: '12px',
          fontWeight: '700',
          letterSpacing: '4px',
          marginBottom: '14px'
        }}>
          AMAGO MUEBLES
        </div>

        <h1 style={{
          fontSize: 'clamp(27px, 6vw, 36px)',
          margin: '0 0 18px',
          lineHeight: 1.2
        }}>
          Sistema en mantenimiento
        </h1>

        <p style={{
          color: '#c4d0df',
          fontSize: '16px',
          lineHeight: 1.8,
          margin: '0 0 25px'
        }}>
          Estamos realizando trabajos de mantenimiento
          para mejorar nuestro sistema.
        </p>

        <div style={{
          padding: '18px',
          background: 'rgba(240,180,77,0.09)',
          border: '1px solid rgba(240,180,77,0.25)',
          borderRadius: '14px',
          color: '#f5cc7f',
          fontSize: '15px',
          fontWeight: '600',
          lineHeight: 1.7
        }}>
          Debes darle mantenimiento al sistema.
          Contacta al administrador.
        </div>

        <p style={{
          color: '#8495aa',
          fontSize: '12px',
          margin: '28px 0 0'
        }}>
          Disculpa los inconvenientes.
          <br />
          AMAGO ERP · Sistema de Gestión Empresarial
        </p>
      </div>
    </div>
  )
}

function App() {
  // Bloqueo global del frontend, incluidos todos los usuarios.
  if (MODO_MANTENIMIENTO) {
    return <PantallaMantenimiento />
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/ventas" element={<ProtectedRoute><POS /></ProtectedRoute>} />
        <Route path="/productos" element={<ProtectedRoute><Productos /></ProtectedRoute>} />

        <Route path="/inventario" element={<ProtectedRoute><Inventario sucursalId={3} sucursalNombre="Principal" /></ProtectedRoute>} />
        <Route path="/inventario-bani" element={<ProtectedRoute><Inventario sucursalId={1} sucursalNombre="Baní" /></ProtectedRoute>} />
        <Route path="/inventario-sabana" element={<ProtectedRoute><Inventario sucursalId={2} sucursalNombre="Sabana" /></ProtectedRoute>} />

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

        <Route
          path="/solicitudes-descuento"
          element={<ProtectedRoute><SolicitudesDescuento /></ProtectedRoute>}
        />
      </Routes>
    </HashRouter>
  )
}

export default App
