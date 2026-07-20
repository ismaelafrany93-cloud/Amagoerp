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
    ventas_mes: 0
  })
  const [topProductos, setTopProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [resetDate, setResetDate] = useState(null)

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esSubgerente = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario.rol)

  // ============================================
  // FUNCIONES PARA CARGAR DATOS
  // ============================================
  const cargarDashboard = async () => {
    try {
      // Verificar si hay un reset activo
      const resetTimestamp = localStorage.getItem('dashboard_reset')
      const resetDate = resetTimestamp ? new Date(parseInt(resetTimestamp)).toDateString() : null
      const hoy = new Date().toDateString()

      // Si el reset es de hoy, mostrar 0
      if (resetDate === hoy) {
        setDatos({
          ventas_hoy: 0,
          produccion_hoy: 0,
          entregas_pendientes: 0,
          ventas_mes: 0
        })
        setCargando(false)
        return
      }

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
    } finally {
      setCargando(false)
    }
  }

  // ============================================
  // FUNCIÓN PARA RESETEAR DASHBOARD
  // ============================================
  const resetearDashboard = () => {
    if (!window.confirm('⚠️ ¿Estás seguro de resetear el Dashboard a 0?\n\nEsto solo afecta los números del dashboard (ventas hoy y ventas mes).\nNo elimina ventas ni afecta el inventario.')) return;

    const ahora = Date.now()
    localStorage.setItem('dashboard_reset', ahora.toString())
    localStorage.setItem('dashboard_reset_date', ahora.toString())
    setResetDate(new Date(ahora).toLocaleDateString())
    
    setDatos({
      ventas_hoy: 0,
      produccion_hoy: 0,
      entregas_pendientes: 0,
      ventas_mes: 0
    })
    
    alert('✅ Dashboard reseteado a 0')
  }

  // ============================================
  // EFECTO PRINCIPAL
  // ============================================
  useEffect(() => {
    cargarDashboard()
    cargarTopProductos()

    // Cargar fecha de último reset
    const lastReset = localStorage.getItem('dashboard_reset_date')
    if (lastReset) {
      setResetDate(new Date(parseInt(lastReset)).toLocaleDateString())
    }

    // 👇 ACTUALIZAR CUANDO LA PESTAÑA SE ACTIVA
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Dashboard visible - Recargando datos...')
        cargarDashboard()
        cargarTopProductos()
      }
    }

    // 👇 ACTUALIZAR CUANDO SE CANCELA UNA VENTA (desde otra pestaña)
    const handleStorageChange = (e) => {
      if (e.key === 'dashboard_updated') {
        console.log('🔄 Dashboard actualizado desde otra pestaña')
        cargarDashboard()
        cargarTopProductos()
      }
      if (e.key === 'dashboard_reset') {
        console.log('🔄 Dashboard reseteado')
        cargarDashboard()
        cargarTopProductos()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // ============================================
  // RENDER
  // ============================================
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
        {esSubgerente && (
          <button
            onClick={resetearDashboard}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              marginBottom: '10px'
            }}
          >
            🔄 Resetear Dashboard
          </button>
        )}
      </div>

      {resetDate && (
        <p style={{ color: '#999', fontSize: '0.8rem', marginBottom: '15px' }}>
          📅 Último reset: {resetDate}
        </p>
      )}

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
          <p style={{ fontSize: '0.8rem', color: '#666', margin: '5px 0 0 0' }}>
            Total de ventas del día
          </p>
        </div>

        <div style={{ backgroundColor: '#e8f5e9', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ margin: 0, color: '#1b5e20' }}>🏭 Producción Hoy</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0 0 0' }}>
            {datos.produccion_hoy || 0} unidades
          </p>
          <p style={{ fontSize: '0.8rem', color: '#666', margin: '5px 0 0 0' }}>
            Unidades producidas hoy
          </p>
        </div>

        <div style={{ backgroundColor: '#fff3e0', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ margin: 0, color: '#e65100' }}>🚚 Entregas Pendientes</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0 0 0' }}>
            {datos.entregas_pendientes || 0}
          </p>
          <p style={{ fontSize: '0.8rem', color: '#666', margin: '5px 0 0 0' }}>
            Entregas pendientes
          </p>
        </div>

        <div style={{ backgroundColor: '#f3e5f5', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ margin: 0, color: '#4a148c' }}>📆 Ventas del Mes</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0 0 0' }}>
            RD$ {datos.ventas_mes?.toFixed(2) || '0.00'}
          </p>
          <p style={{ fontSize: '0.8rem', color: '#666', margin: '5px 0 0 0' }}>
            Total del mes actual
          </p>
        </div>
      </div>

      {/* Tarjeta de acceso a Inventario Baní (solo subgerente) */}
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