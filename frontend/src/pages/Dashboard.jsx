import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'  // ← AGREGAR ESTE IMPORT
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Dashboard() {
  const navigate = useNavigate()  // ← AGREGAR ESTA LÍNEA
  const [datos, setDatos] = useState({
    ventas_hoy: 0,
    produccion_hoy: 0,
    entregas_pendientes: 0,
    ventas_mes: 0
  })
  const [topProductos, setTopProductos] = useState([])
  const [cargando, setCargando] = useState(true)

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esSubgerente = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario.rol)

  useEffect(() => {
    cargarDashboard()
    cargarTopProductos()
  }, [])

  const cargarDashboard = async () => {
    try {
      const response = await fetch(`${API_URL}/reportes/dashboard`)
      const data = await response.json()
      setDatos(data)
    } catch (error) {
      console.error('Error cargando dashboard:', error)
    } finally {
      setCargando(false)
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
      <h1>📊 Dashboard</h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{ backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ margin: 0, color: '#0d47a1' }}>💰 Ventas Hoy</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0 0 0' }}>
            RD$ {datos.ventas_hoy?.toFixed(2) || '0.00'}
          </p>
        </div>

        <div style={{ backgroundColor: '#e8f5e9', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ margin: 0, color: '#1b5e20' }}>🏭 Producción Hoy</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0 0 0' }}>
            {datos.produccion_hoy || 0} unidades
          </p>
        </div>

        <div style={{ backgroundColor: '#fff3e0', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ margin: 0, color: '#e65100' }}>🚚 Entregas Pendientes</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0 0 0' }}>
            {datos.entregas_pendientes || 0}
          </p>
        </div>

        <div style={{ backgroundColor: '#f3e5f5', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ margin: 0, color: '#4a148c' }}>📆 Ventas del Mes</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0 0 0' }}>
            RD$ {datos.ventas_mes?.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* 👇 TARJETA DE ACCESO A INVENTARIO BANÍ (SOLO PARA SUBGERENTE) */}
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
          </tr>
        </thead>
        <tbody>
          {topProductos.length === 0 ? (
            <tr>
              <td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                No hay datos de ventas aún
              </td>
            </tr>
          ) : (
            topProductos.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{item.nombre}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{item.total_vendido}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminLayout>
  )
}

export default Dashboard