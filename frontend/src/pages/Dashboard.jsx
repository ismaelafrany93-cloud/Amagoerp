import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Dashboard() {
  const navigate = useNavigate()
  const [datos, setDatos] = useState({
    ventas_hoy: 0,
    produccion_hoy: 0,
    entregas_pendientes: 0,
    ventas_mes: 0,
    total_ventas: 0,
    numero_ventas_hoy: 0
  })
  const [topProductos, setTopProductos] = useState([])
  const [entregasPendientes, setEntregasPendientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarEntregas, setMostrarEntregas] = useState(false)

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esSubgerente = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario.rol)

  // ============================================
  // FUNCIONES PARA CARGAR DATOS
  // ============================================
  const cargarDashboard = async () => {
    try {
      const response = await fetch(`${API_URL}/reportes/dashboard`)
      const data = await response.json()
      setDatos(data)
    } catch (error) {
      console.error('Error cargando dashboard:', error)
    }
  }

  const cargarTopProductos = async () => {
    try {
      const response = await fetch(`${API_URL}/reportes/top-productos`)
      const data = await response.json()
      setTopProductos(data)
    } catch (error) {
      console.error('Error cargando top productos:', error)
    }
  }

  const cargarEntregasPendientes = async () => {
    try {
      const response = await fetch(`${API_URL}/reportes/entregas-pendientes`)
      const data = await response.json()
      setEntregasPendientes(data)
    } catch (error) {
      console.error('Error cargando entregas pendientes:', error)
    }
  }

  // ============================================
  // EFECTO PRINCIPAL
  // ============================================
  useEffect(() => {
    cargarDashboard()
    cargarTopProductos()
    cargarEntregasPendientes()

    // Actualizar cuando la pestaña se activa
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        cargarDashboard()
        cargarTopProductos()
        cargarEntregasPendientes()
      }
    }

    // Actualizar cuando se cancela una venta
    const handleStorageChange = (e) => {
      if (e.key === 'dashboard_updated') {
        cargarDashboard()
        cargarTopProductos()
        cargarEntregasPendientes()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  if (cargando) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Cargando dashboard...</h2>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <h1>📊 Dashboard</h1>
        <p style={{ color: '#999', fontSize: '0.85rem' }}>
          📅 {new Date().toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Tarjetas de resumen */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{ backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#0d47a1', fontSize: '0.9rem' }}>💰 Ventas Hoy</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '5px 0' }}>
            RD$ {datos.ventas_hoy?.toFixed(2) || '0.00'}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>
            {datos.numero_ventas_hoy || 0} ventas realizadas
          </p>
        </div>

        <div style={{ backgroundColor: '#e8f5e9', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#1b5e20', fontSize: '0.9rem' }}>🏭 Producción Hoy</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '5px 0' }}>
            {datos.produccion_hoy || 0}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>unidades producidas</p>
        </div>

        <div style={{ backgroundColor: '#fff3e0', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#e65100', fontSize: '0.9rem' }}>🚚 Entregas Pendientes</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '5px 0' }}>
            {datos.entregas_pendientes || 0}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>pendientes de entregar</p>
        </div>

        <div style={{ backgroundColor: '#f3e5f5', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#4a148c', fontSize: '0.9rem' }}>📆 Ventas del Mes</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '5px 0' }}>
            RD$ {datos.ventas_mes?.toFixed(2) || '0.00'}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>total del mes actual</p>
        </div>

        <div style={{ backgroundColor: '#e0f7fa', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#00695c', fontSize: '0.9rem' }}>📊 Total Ventas</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '5px 0' }}>
            RD$ {datos.total_ventas?.toFixed(2) || '0.00'}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>todas las ventas registradas</p>
        </div>
      </div>

      {/* Detalle de entregas pendientes */}
      {datos.entregas_pendientes > 0 && (
        <div style={{
          backgroundColor: '#fff8e1',
          padding: '15px',
          borderRadius: '12px',
          marginBottom: '20px',
          border: '1px solid #ff9800'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#e65100' }}>🚚 Entregas Pendientes ({datos.entregas_pendientes})</h3>
            <button
              onClick={() => setMostrarEntregas(!mostrarEntregas)}
              style={{
                padding: '4px 12px',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {mostrarEntregas ? 'Ocultar' : 'Ver detalles'}
            </button>
          </div>
          {mostrarEntregas && (
            <div style={{ marginTop: '15px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Código</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Cliente</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Dirección</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {entregasPendientes.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '15px', textAlign: 'center', color: '#999' }}>
                        No hay entregas pendientes
                      </td>
                    </tr>
                  ) : (
                    entregasPendientes.map((e) => (
                      <tr key={e.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 'bold', color: '#003b6f' }}>
                          {e.codigo}
                        </td>
                        <td style={{ padding: '8px' }}>{e.cliente_nombre}</td>
                        <td style={{ padding: '8px' }}>{e.direccion}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          RD$ {Number(e.total).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <h2>🔥 Productos más vendidos</h2>
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse', 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        overflow: 'hidden', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
      }}>
        <thead>
          <tr style={{ backgroundColor: '#003b6f', color: 'white' }}>
            <th style={{ padding: '12px', textAlign: 'left' }}>Producto</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Cantidad Vendida</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Ventas</th>
          </tr>
        </thead>
        <tbody>
          {topProductos.length === 0 ? (
            <tr>
              <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                No hay datos de ventas aún
              </td>
            </tr>
          ) : (
            topProductos.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{item.nombre}</td>
                <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#003b6f' }}>
                  {item.total_vendido}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{item.numero_ventas || 0}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminLayout>
  )
}

export default Dashboard