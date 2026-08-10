import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Entregas() {
  const [entregas, setEntregas] = useState([])
  const [filtradas, setFiltradas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [entregaSeleccionada, setEntregaSeleccionada] = useState(null)
  const [motivoNoEntrega, setMotivoNoEntrega] = useState('')
  const [recibidoPor, setRecibidoPor] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const rol = usuario?.rol || ''
  
  const puedeGestionar = ['chofer', 'subgerente', 'dueno', 'dueño', 'admin'].includes(rol)
  const esSubgerente = ['dueno', 'dueño', 'subgerente', 'admin'].includes(rol)

  useEffect(() => {
    cargarEntregas()
  }, [])

  const cargarEntregas = async () => {
    try {
      let url = `${API_URL}/entregas`
      
      if (rol === 'chofer') {
        url = `${API_URL}/entregas?sucursal_id=${usuario.sucursal_id}`
      } else if (!esSubgerente) {
        url = `${API_URL}/entregas?sucursal_id=${usuario.sucursal_id}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      setEntregas(Array.isArray(data) ? data : [])
      setFiltradas(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando entregas:', error)
      setMensaje('❌ Error cargando entregas')
    } finally {
      setCargando(false)
    }
  }

  const handleBusqueda = (e) => {
    const valor = e.target.value.toUpperCase().trim()
    setBusqueda(valor)

    if (valor === '') {
      setFiltradas(entregas)
      return
    }

    const resultados = entregas.filter(entrega => 
      entrega.codigo && entrega.codigo.toUpperCase().includes(valor)
    )
    setFiltradas(resultados)
  }

  const handleFiltroEstado = (e) => {
    const estado = e.target.value
    setEstadoFiltro(estado)
    if (estado === 'todos') {
      setFiltradas(entregas)
    } else {
      setFiltradas(entregas.filter(e => e.estado === estado))
    }
  }

  // ============================================
  // MARCAR COMO ENTREGADA - CON CHOFER_ID
  // ============================================
  const marcarComoEntregada = async (id) => {
    if (!window.confirm('✅ ¿Confirmar que esta entrega fue realizada?')) return

    try {
      // Obtener el ID del usuario actual (chofer)
      const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}')
      
      const response = await fetch(`${API_URL}/entregas/${id}/entregar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chofer_id: usuarioActual.id // 👈 Enviar el ID del chofer
        })
      })
      const data = await response.json()

      if (data.success) {
        setMensaje(data.message || '✅ Entrega marcada como completada')
        cargarEntregas()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setMensaje('❌ Error: ' + (data.message || data.error))
      }
    } catch (error) {
      console.error('Error:', error)
      setMensaje('❌ Error al marcar entrega')
    }
  }

  // ============================================
  // FUNCIÓN PARA NO ENTREGADO (CON MOTIVO)
  // ============================================
  const abrirModalNoEntregado = (entrega) => {
    setEntregaSeleccionada(entrega)
    setMotivoNoEntrega('')
    setRecibidoPor('')
    setMostrarModal(true)
  }

  const confirmarNoEntregado = async () => {
    if (!motivoNoEntrega.trim()) {
      alert('⚠️ Por favor, ingresa el motivo de la no entrega')
      return
    }

    try {
      const response = await fetch(`${API_URL}/entregas/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: entregaSeleccionada.codigo,
          entregado: false,
          motivo: motivoNoEntrega,
          recibido_por: recibidoPor || 'Chofer',
          chofer_id: usuario.id
        })
      })

      const data = await response.json()

      if (data.success) {
        setMensaje('❌ No entrega registrada correctamente')
        setMostrarModal(false)
        setEntregaSeleccionada(null)
        cargarEntregas()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error: ' + (data.message || data.error))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al registrar no entrega')
    }
  }

  if (cargando) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Cargando entregas...</h2>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <h1>🚚 Entregas</h1>

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

      {rol === 'chofer' && (
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '10px 15px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #003b6f'
        }}>
          <p style={{ margin: 0, color: '#003b6f' }}>
            🚚 <strong>Chofer</strong> - Aquí puedes gestionar tus entregas pendientes
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#666' }}>
            Marca las entregas como <strong>✅ Entregada</strong> o <strong>❌ No Entregada</strong>
          </p>
        </div>
      )}

      {!puedeGestionar && (
        <div style={{
          backgroundColor: '#fff3e0',
          padding: '10px 15px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #ff9800'
        }}>
          <p style={{ margin: 0, color: '#e65100' }}>
            👁️ <strong>Solo visualización</strong> - Solo puedes ver las entregas, no gestionarlas
          </p>
        </div>
      )}

      {/* Buscador y Filtros */}
      <div style={{
        display: 'flex',
        gap: '15px',
        marginBottom: '20px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 2, minWidth: '250px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>
            🔍 Buscar por Código
          </label>
          <input
            type="text"
            value={busqueda}
            onChange={handleBusqueda}
            placeholder="Ej: AMG-H8TMAC18"
            style={{
              width: '100%',
              padding: '10px 15px',
              border: '2px solid #003b6f',
              borderRadius: '8px',
              fontSize: '1rem',
              textTransform: 'uppercase'
            }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>
            📊 Filtrar por estado
          </label>
          <select
            value={estadoFiltro}
            onChange={handleFiltroEstado}
            style={{
              width: '100%',
              padding: '10px 15px',
              border: '2px solid #003b6f',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
          >
            <option value="todos">📋 Todos</option>
            <option value="pendiente">⏳ Pendientes</option>
            <option value="entregada">✅ Entregadas</option>
            <option value="cancelada">❌ No Entregadas</option>
          </select>
        </div>

        <div style={{ flex: 1 }}>
          <button
            onClick={cargarEntregas}
            style={{
              padding: '10px 20px',
              backgroundColor: '#003b6f',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '24px',
              fontSize: '1rem'
            }}
          >
            🔄 Recargar
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '10px',
        marginBottom: '20px'
      }}>
        <div style={{ backgroundColor: '#e3f2fd', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {entregas.filter(e => e.estado === 'pendiente').length}
          </span>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>⏳ Pendientes</p>
        </div>
        <div style={{ backgroundColor: '#e8f5e9', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {entregas.filter(e => e.estado === 'entregada').length}
          </span>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>✅ Entregadas</p>
        </div>
        <div style={{ backgroundColor: '#fef2f2', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {entregas.filter(e => e.estado === 'cancelada').length}
          </span>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>❌ No Entregadas</p>
        </div>
      </div>

      {/* Tabla */}
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
              <th style={{ padding: '12px', textAlign: 'left' }}>Dirección</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Fecha</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Chofer</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                  {busqueda ? 'No se encontraron entregas con ese código' : 'No hay entregas registradas'}
                </td>
              </tr>
            ) : (
              filtradas.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{e.id}</td>
                  <td style={{ padding: '12px' }}>
                    <strong style={{
                      color: '#003b6f',
                      fontFamily: 'monospace',
                      fontSize: '1.1rem',
                      letterSpacing: '1px'
                    }}>
                      {e.codigo || 'N/A'}
                    </strong>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(e.codigo)
                        alert('📋 Código copiado: ' + e.codigo)
                      }}
                      style={{
                        marginLeft: '8px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        color: '#003b6f'
                      }}
                    >
                      📋
                    </button>
                  </td>
                  <td style={{ padding: '12px' }}>{e.cliente_nombre || 'N/A'}</td>
                  <td style={{ padding: '12px' }}>{e.direccion || 'N/A'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {e.estado === 'pendiente' && (
                      <span style={{
                        backgroundColor: '#ff9800',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.8rem'
                      }}>
                        ⏳ Pendiente
                      </span>
                    )}
                    {e.estado === 'entregada' && (
                      <span style={{
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.8rem'
                      }}>
                        ✅ Entregada
                      </span>
                    )}
                    {e.estado === 'cancelada' && (
                      <span style={{
                        backgroundColor: '#f44336',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.8rem'
                      }}>
                        ❌ No Entregada
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {new Date(e.fecha_salida || e.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {e.chofer_nombre ? (
                      <span style={{
                        backgroundColor: '#e3f2fd',
                        color: '#003b6f',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem'
                      }}>
                        🚚 {e.chofer_nombre}
                      </span>
                    ) : (
                      <span style={{ color: '#999', fontSize: '0.75rem' }}>Sin asignar</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {e.estado === 'pendiente' && puedeGestionar && (
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => marcarComoEntregada(e.id)}
                          style={{
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          ✅ Entregar
                        </button>
                        <button
                          onClick={() => abrirModalNoEntregado(e)}
                          style={{
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          ❌ No Entregado
                        </button>
                      </div>
                    )}
                    {e.estado === 'pendiente' && !puedeGestionar && (
                      <span style={{ color: '#999', fontSize: '0.75rem' }}>
                        ⏳ Esperando gestión
                      </span>
                    )}
                    {e.estado === 'entregada' && (
                      <span style={{ color: '#4CAF50' }}>✅ Completada</span>
                    )}
                    {e.estado === 'cancelada' && (
                      <span style={{ color: '#f44336', fontSize: '0.75rem' }}>
                        {e.comentario || 'No entregada'}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================== */}
      {/* MODAL PARA NO ENTREGADO */}
      {/* ========================================== */}
      {mostrarModal && entregaSeleccionada && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ color: '#f44336', marginTop: 0 }}>❌ No Entregado</h2>
            <p style={{ color: '#666' }}>
              <strong>Código:</strong> {entregaSeleccionada.codigo}
            </p>
            <p style={{ color: '#666' }}>
              <strong>Cliente:</strong> {entregaSeleccionada.cliente_nombre}
            </p>
            <p style={{ color: '#666' }}>
              <strong>Dirección:</strong> {entregaSeleccionada.direccion || 'N/A'}
            </p>

            <hr style={{ margin: '15px 0' }} />

            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>
                📝 Motivo de la no entrega *
              </label>
              <textarea
                value={motivoNoEntrega}
                onChange={(e) => setMotivoNoEntrega(e.target.value)}
                placeholder="Ej: Cliente no estaba en la dirección, teléfono no contestó, el cliente canceló, etc."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  minHeight: '80px',
                  fontSize: '0.95rem'
                }}
              />
              <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '5px' }}>
                ⚠️ Este motivo aparecerá en el módulo de "No Entregados"
              </p>
            </div>

            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>
                👤 Recibido por (opcional)
              </label>
              <input
                type="text"
                value={recibidoPor}
                onChange={(e) => setRecibidoPor(e.target.value)}
                placeholder="Nombre de quien recibió la información"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
              <button
                onClick={confirmarNoEntregado}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                ❌ Confirmar No Entregado
              </button>
              <button
                onClick={() => {
                  setMostrarModal(false)
                  setEntregaSeleccionada(null)
                  setMotivoNoEntrega('')
                  setRecibidoPor('')
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#757575',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default Entregas