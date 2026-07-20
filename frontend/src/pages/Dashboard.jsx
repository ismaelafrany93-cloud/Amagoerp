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
  const [ventasHoyDetalle, setVentasHoyDetalle] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarDetalle, setMostrarDetalle] = useState(false)

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

  const cargarVentasHoyDetalle = async () => {
    try {
      const response = await fetch(`${API_URL}/reportes/ventas-hoy-detalle`)
      const data = await response.json()
      setVentasHoyDetalle(data)
    } catch (error) {
      console.error('Error cargando detalle de ventas:', error)
    }
  }

  // ============================================
  // EFECTO PRINCIPAL
  // ============================================
  useEffect(() => {
    cargarDashboard()
    cargarTopProductos()
    cargarVentasHoyDetalle()

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        cargarDashboard()
        cargarTopProductos()
        cargarVentasHoyDetalle()
      }
    }

    const handleStorageChange = (e) => {
      if (e.key === 'dashboard_updated') {
        cargarDashboard()
        cargarTopProductos()
        cargarVentasHoyDetalle()
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
          {datos.numero_ventas_hoy > 0 && (
            <button
              onClick={() => setMostrarDetalle(!mostrarDetalle)}
              style={{
                marginTop: '8px',
                padding: '4px 12px',
                backgroundColor: '#003b6f',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              {mostrarDetalle ? 'Ocultar ventas' : 'Ver ventas'}
            </button>
          )}
          {mostrarDetalle && ventasHoyDetalle.length > 0 && (
            <div style={{ marginTop: '10px', textAlign: 'left', fontSize: '0.8rem' }}>
              {ventasHoyDetalle.map((v) => (
                <div key={v.id} style={{ borderBottom: '1px solid #eee', padding: '4px 0' }}>
                  <strong>{v.cliente_nombre || 'N/A'}</strong> - RD$ {Number(v.total).toFixed(2)}
                  <span style={{ color: '#999', fontSize: '0.7rem', marginLeft: '8px' }}>
                    {v.vendedor || 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          )}
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

      {esSubgerente && (
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          transition: 'transform 0.2s',
          border: '2px solid #003b6f',
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <h3>🏢 Inventario Baní</h3>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Gestionar inventario de la sucursal Baní
          </p>
          <button 
            onClick={() => navigate('/inventario-bani')}
            style={{
              backgroundColor: '#003b6f',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Ver Inventario Baní →
          </button>
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