import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function SolicitudesDescuento() {
  const [solicitudes, setSolicitudes] = useState([])
  const [pendientes, setPendientes] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [filtro, setFiltro] = useState('pendientes')

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario?.rol)
  const sucursalId = usuario?.sucursal_id || 3

  useEffect(() => {
    if (esAdmin) {
      cargarSolicitudes()
      // Recargar cada 30 segundos
      const interval = setInterval(cargarSolicitudes, 30000)
      return () => clearInterval(interval)
    }
  }, [filtro])

  const cargarSolicitudes = async () => {
    setCargando(true)
    try {
      const url = filtro === 'pendientes' 
        ? `${API_URL}/solicitudes-descuento/pendientes?sucursal_id=${sucursalId}`
        : `${API_URL}/solicitudes-descuento?sucursal_id=${sucursalId}&estado=${filtro}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (filtro === 'pendientes') {
        setPendientes(Array.isArray(data) ? data : [])
      } else {
        setSolicitudes(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error al cargar solicitudes')
    } finally {
      setCargando(false)
    }
  }

  const procesarSolicitud = async (id, estado, montoAprobado = null) => {
    if (!window.confirm(`¿${estado === 'aprobado' ? 'Aprobar' : 'Rechazar'} esta solicitud de descuento?`)) return

    try {
      const response = await fetch(`${API_URL}/solicitudes-descuento/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: estado,
          usuario_autorizador: usuario.id,
          monto_aprobado: montoAprobado
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setMensaje(data.message)
        cargarSolicitudes()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setError('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('❌ Error al procesar solicitud')
    }
  }

  const formatearPrecio = (valor) => {
    return `RD$ ${Number(valor).toFixed(2)}`
  }

  const getEstadoColor = (estado) => {
    const colores = {
      'pendiente': '#FF9800',
      'aprobado': '#4CAF50',
      'rechazado': '#f44336'
    }
    return colores[estado] || '#666'
  }

  const getEstadoEmoji = (estado) => {
    const emojis = {
      'pendiente': '⏳',
      'aprobado': '✅',
      'rechazado': '❌'
    }
    return emojis[estado] || '❓'
  }

  if (!esAdmin) {
    return (
      <AdminLayout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>⛔ Acceso Denegado</h2>
          <p>No tienes permisos para ver este módulo</p>
        </div>
      </AdminLayout>
    )
  }

  const mostrarLista = filtro === 'pendientes' ? pendientes : solicitudes

  return (
    <AdminLayout>
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* HEADER */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px',
          flexWrap: 'wrap',
          gap: '15px',
          background: 'linear-gradient(135deg, #003b6f, #005a9c)',
          padding: '20px 30px',
          borderRadius: '16px',
          color: 'white'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>📋 Solicitudes de Descuento</h1>
            <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
              {pendientes.length} solicitudes pendientes
            </p>
          </div>
          {pendientes.length > 0 && (
            <div style={{
              backgroundColor: '#ff5722',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              animation: 'pulse 2s infinite'
            }}>
              🔴 {pendientes.length} pendiente{pendientes.length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        <style>{`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
          }
        `}</style>

        {/* MENSAJES */}
        {mensaje && (
          <div style={{
            backgroundColor: '#e8f5e9',
            color: '#1b5e20',
            padding: '12px 20px',
            borderRadius: '10px',
            marginBottom: '15px',
            borderLeft: '4px solid #4CAF50'
          }}>
            {mensaje}
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '12px 20px',
            borderRadius: '10px',
            marginBottom: '15px',
            borderLeft: '4px solid #f44336'
          }}>
            {error}
            <button
              onClick={() => setError('')}
              style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* FILTROS */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '15px 20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex',
          gap: '15px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <button
            onClick={() => setFiltro('pendientes')}
            style={{
              padding: '8px 20px',
              backgroundColor: filtro === 'pendientes' ? '#FF9800' : '#e0e0e0',
              color: filtro === 'pendientes' ? 'white' : '#555',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: filtro === 'pendientes' ? 'bold' : 'normal'
            }}
          >
            ⏳ Pendientes ({pendientes.length})
          </button>
          <button
            onClick={() => setFiltro('aprobado')}
            style={{
              padding: '8px 20px',
              backgroundColor: filtro === 'aprobado' ? '#4CAF50' : '#e0e0e0',
              color: filtro === 'aprobado' ? 'white' : '#555',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            ✅ Aprobados
          </button>
          <button
            onClick={() => setFiltro('rechazado')}
            style={{
              padding: '8px 20px',
              backgroundColor: filtro === 'rechazado' ? '#f44336' : '#e0e0e0',
              color: filtro === 'rechazado' ? 'white' : '#555',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            ❌ Rechazados
          </button>
          <button
            onClick={cargarSolicitudes}
            style={{
              padding: '8px 24px',
              backgroundColor: '#003b6f',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🔄 Actualizar
          </button>
        </div>

        {/* TABLA DE SOLICITUDES */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          overflowX: 'auto'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>
            {filtro === 'pendientes' ? '⏳ Solicitudes Pendientes' :
             filtro === 'aprobado' ? '✅ Solicitudes Aprobadas' :
             '❌ Solicitudes Rechazadas'}
          </h3>
          
          {mostrarLista.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <p style={{ fontSize: '1.2rem' }}>
                {filtro === 'pendientes' ? '📭 No hay solicitudes pendientes' :
                 filtro === 'aprobado' ? '✅ No hay solicitudes aprobadas' :
                 '❌ No hay solicitudes rechazadas'}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f7fa', borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>Código</th>
                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>Cliente</th>
                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>Solicitante</th>
                  <th style={{ padding: '10px 15px', textAlign: 'right' }}>Monto Solicitado</th>
                  <th style={{ padding: '10px 15px', textAlign: 'right' }}>Total Venta</th>
                  <th style={{ padding: '10px 15px', textAlign: 'center' }}>Fecha</th>
                  <th style={{ padding: '10px 15px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '10px 15px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {mostrarLista.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 15px' }}>
                      <code style={{
                        backgroundColor: '#f5f5f5',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                      }}>
                        {s.codigo_autorizacion || 'N/A'}
                      </code>
                    </td>
                    <td style={{ padding: '10px 15px' }}>{s.cliente_nombre || 'N/A'}</td>
                    <td style={{ padding: '10px 15px' }}>{s.solicitante_nombre}</td>
                    <td style={{ padding: '10px 15px', textAlign: 'right', color: '#e65100', fontWeight: 'bold' }}>
                      {formatearPrecio(s.monto_solicitado)}
                    </td>
                    <td style={{ padding: '10px 15px', textAlign: 'right' }}>
                      {formatearPrecio(s.venta_total || 0)}
                    </td>
                    <td style={{ padding: '10px 15px', textAlign: 'center', fontSize: '0.8rem' }}>
                      {new Date(s.fecha_solicitud).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 15px', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: getEstadoColor(s.estado) + '20',
                        color: getEstadoColor(s.estado),
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem'
                      }}>
                        {getEstadoEmoji(s.estado)} {s.estado}
                      </span>
                    </td>
                    <td style={{ padding: '10px 15px', textAlign: 'center' }}>
                      {s.estado === 'pendiente' && (
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => {
                              const monto = prompt(`Monto aprobado (máximo: ${formatearPrecio(s.monto_solicitado)})`, s.monto_solicitado)
                              if (monto !== null) {
                                const montoNum = parseFloat(monto)
                                if (!isNaN(montoNum) && montoNum > 0 && montoNum <= s.monto_solicitado) {
                                  procesarSolicitud(s.id, 'aprobado', montoNum)
                                } else {
                                  alert('⚠️ Monto inválido')
                                }
                              }
                            }}
                            style={{
                              padding: '4px 12px',
                              backgroundColor: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                          >
                            ✅ Aprobar
                          </button>
                          <button
                            onClick={() => procesarSolicitud(s.id, 'rechazado')}
                            style={{
                              padding: '4px 12px',
                              backgroundColor: '#f44336',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                          >
                            ❌ Rechazar
                          </button>
                        </div>
                      )}
                      {s.estado === 'aprobado' && s.usuario_autorizador && (
                        <span style={{ fontSize: '0.7rem', color: '#666' }}>
                          Por: {s.autorizador_nombre}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default SolicitudesDescuento