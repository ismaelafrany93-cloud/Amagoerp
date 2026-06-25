import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'

function ProductosNoEntregados() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarNoEntregados()
  }, [])

  const cargarNoEntregados = async () => {
    try {
      const response = await fetch('http://localhost:5000/entregas/no-entregados')
      const data = await response.json()
      setProductos(data)
    } catch (error) {
      console.error('Error cargando productos no entregados:', error)
    } finally {
      setCargando(false)
    }
  }

  const marcarRevisado = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/entregas/no-entregados/${id}`, {
        method: 'PUT'
      })
      if (response.ok) {
        alert('✅ Marcado como revisado')
        cargarNoEntregados()
      }
    } catch (error) {
      console.error(error)
    }
  }

  if (cargando) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Cargando...</h2>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <h1>📋 Productos No Entregados</h1>

      {productos.length === 0 ? (
        <p style={{ color: '#999' }}>No hay productos no entregados</p>
      ) : (
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
              <th style={{ padding: '12px', textAlign: 'left' }}>Código</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Cliente</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Teléfono</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Motivo</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Recibido por</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{String(p.codigo_numero).padStart(4, '0')}</td>
                <td style={{ padding: '12px' }}>{p.cliente_nombre}</td>
                <td style={{ padding: '12px' }}>{p.cliente_telefono}</td>
                <td style={{ padding: '12px' }}>{p.motivo}</td>
                <td style={{ padding: '12px' }}>{p.recibido_por}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{
                    backgroundColor: p.estado === 'revisado' ? '#4CAF50' : '#ff9800',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem'
                  }}>
                    {p.estado === 'revisado' ? '✅ Revisado' : '⏳ Pendiente'}
                  </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {p.estado !== 'revisado' && (
                    <button
                      onClick={() => marcarRevisado(p.id)}
                      style={{
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 12px',
                        cursor: 'pointer'
                      }}
                    >
                      Marcar Revisado
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  )
}

export default ProductosNoEntregados