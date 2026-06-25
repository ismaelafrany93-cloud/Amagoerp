import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Inventario() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarInventario()
  }, [])

  const cargarInventario = async () => {
    try {
      const response = await fetch(`${API_URL}/inventario`)
      
      if (!response.ok) {
        throw new Error('Error al cargar el inventario')
      }
      
      const data = await response.json()
      
      if (Array.isArray(data)) {
        setProductos(data)
      } else {
        setProductos([])
      }
    } catch (error) {
      console.error('Error cargando inventario:', error)
      setError('Error al cargar el inventario: ' + error.message)
      setProductos([])
    } finally {
      setCargando(false)
    }
  }

  if (cargando) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Cargando inventario...</h2>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>❌ Error</h2>
          <p style={{ color: '#f44336' }}>{error}</p>
          <button 
            onClick={cargarInventario}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#003b6f',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Reintentar
          </button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <h1>📦 Inventario</h1>

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
            <th style={{ padding: '12px', textAlign: 'left' }}>ID</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Producto</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Categoría</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Stock</th>
            <th style={{ padding: '12px', textAlign: 'right' }}>Precio</th>
          </tr>
        </thead>
        <tbody>
          {productos.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                No hay productos en el inventario
              </td>
            </tr>
          ) : (
            productos.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{p.id}</td>
                <td style={{ padding: '12px' }}>{p.nombre}</td>
                <td style={{ padding: '12px' }}>{p.categoria || 'N/A'}</td>
                <td style={{ 
                  padding: '12px', 
                  textAlign: 'center',
                  color: (p.stock || 0) <= 0 ? '#f44336' : (p.stock || 0) <= 5 ? '#ff9800' : '#4CAF50',
                  fontWeight: (p.stock || 0) <= 5 ? 'bold' : 'normal'
                }}>
                  {p.stock || 0}
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  RD$ {Number(p.precio).toFixed(2)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminLayout>
  )
}

export default Inventario