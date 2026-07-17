import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function NoEntregados() {
  const [noEntregados, setNoEntregados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarNoEntregados()
  }, [])

  const cargarNoEntregados = async () => {
    try {
      const response = await fetch(`${API_URL}/entregas/no-entregados`)
      const data = await response.json()
      setNoEntregados(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando no entregados:', error)
      setMensaje('❌ Error cargando datos')
    } finally {
      setCargando(false)
    }
  }

  const marcarRevisado = async (id) => {
    try {
      const response = await fetch(`${API_URL}/entregas/no-entregados/${id}`, {
        method: 'PUT'
      })
      const data = await response.json()
      if (data.success) {
        setMensaje('✅ Marcado como revisado')
        cargarNoEntregados()
        setTimeout(() => setMensaje(''), 3000)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al marcar como revisado')
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

      {mensaje && (
        <div style={{
          backgroundColor: mensaje.includes('✅') ? '#e8f5e9' : '#fef2f2',
          color: mensaje.includes('✅') ? '#1b5e20' : '#dc2626',
          padding: '10px 15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {mensaje}
        </div>
      )}

      <div style={{
        overflowX: 'auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          overflow: 'hidden'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#003b6f', color: 'white' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>#</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Código</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Cliente</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Motivo</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Fecha</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {noEntregados.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                  No hay productos no entregados registrados
                </td>
              </tr>
            ) : (
              noEntregados.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{item.id}</td>
                  <td style={{ padding: '12px' }}>
                    <strong style={{ color: '#003b6f', fontFamily: 'monospace' }}>
                      {item.codigo}
                    </strong>
                  </td>
                  <td style={{ padding: '12px' }}>{item.cliente_nombre}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ color: '#f44336' }}>{item.motivo || 'Sin motivo'}</span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {new Date(item.fecha).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {item.estado === 'revisado' ? (
                      <span style={{ color: '#4CAF50' }}>✅ Revisado</span>
                    ) : (
                      <button
                        onClick={() => marcarRevisado(item.id)}
                        style={{
                          backgroundColor: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 12px',
                          cursor: 'pointer'
                        }}
                      >
                        📋 Marcar Revisado
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}

export default NoEntregados