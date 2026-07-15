import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function InventarioSabana() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esSubgerente = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario.rol)
  const SUCURSAL_SABANA_ID = 2

  useEffect(() => {
    cargarInventarioSabana()
  }, [])

  const cargarInventarioSabana = async () => {
    try {
      const response = await fetch(`${API_URL}/inventario?sucursal_id=${SUCURSAL_SABANA_ID}`)
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setProductos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando inventario de Sabana:', error)
      setError('Error al cargar el inventario de Sabana: ' + error.message)
      setProductos([])
    } finally {
      setCargando(false)
    }
  }

  if (cargando) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Cargando inventario de Sabana...</h2>
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
            onClick={cargarInventarioSabana}
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
      <h1>🏢 Inventario - Sabana</h1>
      
      <div style={{
        backgroundColor: '#e3f2fd',
        padding: '10px 15px',
        borderRadius: '8px',
        marginBottom: '20px',
        borderLeft: '4px solid #003b6f'
      }}>
        <p style={{ margin: 0, color: '#003b6f' }}>
          ℹ️ Inventario exclusivo de la sucursal de Sabana
        </p>
        {esSubgerente && (
          <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#666' }}>
            🔑 Puedes agregar o eliminar productos desde el inventario general
          </p>
        )}
      </div>

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
          {!Array.isArray(productos) || productos.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                No hay productos en el inventario de Sabana
              </td>
            </tr>
          ) : (
            productos.map((p) => (
              <tr key={p.id || Math.random()} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{p.id}</td>
                <td style={{ padding: '12px' }}>{p.nombre || 'Sin nombre'}</td>
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
                  RD$ {Number(p.precio || 0).toFixed(2)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminLayout>
  )
}

export default InventarioSabana