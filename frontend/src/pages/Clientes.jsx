import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Clientes() {
  const [clientes, setClientes] = useState([])
  const [mayoristas, setMayoristas] = useState([])
  const [normales, setNormales] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [pestaniaActiva, setPestaniaActiva] = useState('todos')
  const [sincronizando, setSincronizando] = useState(false)
  
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    email: '',
    referencia: '',
    es_mayorista: false
  })

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario?.rol)
  const esSucursalPrincipal = usuario?.sucursal_id === 3 || usuario?.sucursal === 'Sucursal Principal'
  const sucursalId = usuario?.sucursal_id || 3

  useEffect(() => {
    if (esAdmin) {
      cargarClientes()
      if (esSucursalPrincipal) {
        cargarMayoristas()
        cargarNormales()
      }
    }
  }, [pestaniaActiva])

  const cargarClientes = async () => {
    setCargando(true)
    try {
      const response = await fetch(`${API_URL}/clientes?sucursal_id=${sucursalId}`)
      const data = await response.json()
      setClientes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error:', error)
      setError('Error al cargar clientes')
    } finally {
      setCargando(false)
    }
  }

  const cargarMayoristas = async () => {
    try {
      const response = await fetch(`${API_URL}/clientes/mayoristas?sucursal_id=${sucursalId}`)
      const data = await response.json()
      setMayoristas(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const cargarNormales = async () => {
    try {
      const response = await fetch(`${API_URL}/clientes/normales?sucursal_id=${sucursalId}`)
      const data = await response.json()
      setNormales(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // ============================================
  // SINCRONIZAR CLIENTES DEL HISTORIAL
  // ============================================
  const sincronizarClientes = async () => {
    if (!window.confirm('🔄 ¿Sincronizar clientes del historial de ventas?\n\nEsto importará todos los clientes que han comprado y no están registrados.')) return
    
    setSincronizando(true)
    try {
      const response = await fetch(`${API_URL}/clientes/sincronizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sucursal_id: sucursalId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMensaje(data.message)
        cargarClientes()
        if (esSucursalPrincipal) {
          cargarMayoristas()
          cargarNormales()
        }
        setTimeout(() => setMensaje(''), 5000)
      } else {
        setError('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('❌ Error al sincronizar clientes')
    } finally {
      setSincronizando(false)
    }
  }

  const guardarCliente = async () => {
    if (!nuevoCliente.nombre) {
      setError('⚠️ El nombre del cliente es requerido')
      return
    }

    try {
      const response = await fetch(`${API_URL}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nuevoCliente,
          sucursal_id: sucursalId,
          created_by: usuario.id
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setMensaje(data.message || '✅ Cliente creado correctamente')
        setMostrarFormulario(false)
        setNuevoCliente({
          nombre: '',
          telefono: '',
          direccion: '',
          email: '',
          referencia: '',
          es_mayorista: false
        })
        cargarClientes()
        if (esSucursalPrincipal) {
          cargarMayoristas()
          cargarNormales()
        }
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setError('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('❌ Error al crear cliente')
    }
  }

  const toggleMayorista = async (id, esMayoristaActual) => {
    const nuevoEstado = !esMayoristaActual
    const accion = nuevoEstado ? 'marcar como mayorista' : 'desmarcar como mayorista'
    
    if (!window.confirm(`¿${accion} a este cliente?`)) return

    try {
      const response = await fetch(`${API_URL}/clientes/${id}/mayorista`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ es_mayorista: nuevoEstado })
      })

      const data = await response.json()
      
      if (data.success) {
        setMensaje(data.message)
        cargarClientes()
        if (esSucursalPrincipal) {
          cargarMayoristas()
          cargarNormales()
        }
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setError('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('❌ Error al actualizar cliente')
    }
  }

  const eliminarCliente = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar al cliente "${nombre}"?`)) return

    try {
      const response = await fetch(`${API_URL}/clientes/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        setMensaje('✅ Cliente eliminado correctamente')
        cargarClientes()
        if (esSucursalPrincipal) {
          cargarMayoristas()
          cargarNormales()
        }
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setError('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('❌ Error al eliminar cliente')
    }
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

  const getClientesMostrar = () => {
    if (pestaniaActiva === 'todos') return clientes
    if (pestaniaActiva === 'mayoristas') return mayoristas
    if (pestaniaActiva === 'normales') return normales
    return clientes
  }

  const clientesMostrar = getClientesMostrar()

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
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>👤 Clientes</h1>
            <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
              {clientesMostrar.length} clientes · 
              {pestaniaActiva === 'todos' ? ' Todos' : 
               pestaniaActiva === 'mayoristas' ? ' Mayoristas' : ' Normales'}
              {esSucursalPrincipal && ' · 🏢 Sucursal Principal'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={sincronizarClientes}
              disabled={sincronizando}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: sincronizando ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                opacity: sincronizando ? 0.6 : 1
              }}
            >
              {sincronizando ? '⏳ Sincronizando...' : '🔄 Sincronizar Historial'}
            </button>
            <button
              onClick={() => setMostrarFormulario(!mostrarFormulario)}
              style={{
                padding: '10px 24px',
                backgroundColor: mostrarFormulario ? '#ff5722' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 'bold'
              }}
            >
              {mostrarFormulario ? '✕ Cancelar' : '+ Nuevo Cliente'}
            </button>
          </div>
        </div>

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

        {/* PESTAÑAS */}
        <div style={{
          display: 'flex',
          gap: '5px',
          marginBottom: '20px',
          borderBottom: '2px solid #e0e0e0',
          paddingBottom: '5px'
        }}>
          <button
            onClick={() => setPestaniaActiva('todos')}
            style={{
              padding: '10px 24px',
              backgroundColor: pestaniaActiva === 'todos' ? '#003b6f' : 'transparent',
              color: pestaniaActiva === 'todos' ? 'white' : '#555',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: pestaniaActiva === 'todos' ? 'bold' : 'normal',
              transition: 'all 0.3s'
            }}
          >
            📋 Todos ({clientes.length})
          </button>
          
          {esSucursalPrincipal && (
            <>
              <button
                onClick={() => setPestaniaActiva('mayoristas')}
                style={{
                  padding: '10px 24px',
                  backgroundColor: pestaniaActiva === 'mayoristas' ? '#FF9800' : 'transparent',
                  color: pestaniaActiva === 'mayoristas' ? 'white' : '#555',
                  border: 'none',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  fontWeight: pestaniaActiva === 'mayoristas' ? 'bold' : 'normal',
                  transition: 'all 0.3s'
                }}
              >
                🏷️ Mayoristas ({mayoristas.length})
              </button>
              <button
                onClick={() => setPestaniaActiva('normales')}
                style={{
                  padding: '10px 24px',
                  backgroundColor: pestaniaActiva === 'normales' ? '#4CAF50' : 'transparent',
                  color: pestaniaActiva === 'normales' ? 'white' : '#555',
                  border: 'none',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  fontWeight: pestaniaActiva === 'normales' ? 'bold' : 'normal',
                  transition: 'all 0.3s'
                }}
              >
                👤 Normales ({normales.length})
              </button>
            </>
          )}
        </div>

        {/* FORMULARIO NUEVO CLIENTE */}
        {mostrarFormulario && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '25px',
            marginBottom: '20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, color: '#003b6f' }}>
              {pestaniaActiva === 'mayoristas' ? '🏷️ Nuevo Cliente Mayorista' : '📝 Nuevo Cliente'}
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '15px'
            }}>
              <input
                type="text"
                placeholder="Nombre *"
                value={nuevoCliente.nombre}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <input
                type="text"
                placeholder="Teléfono"
                value={nuevoCliente.telefono}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <input
                type="email"
                placeholder="Email"
                value={nuevoCliente.email}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <input
                type="text"
                placeholder="Dirección"
                value={nuevoCliente.direccion}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <input
                type="text"
                placeholder="Referencia"
                value={nuevoCliente.referencia}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, referencia: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontWeight: '500' }}>
                  <input
                    type="checkbox"
                    checked={nuevoCliente.es_mayorista}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, es_mayorista: e.target.checked })}
                    style={{ marginRight: '8px' }}
                  />
                  🏷️ Cliente Mayorista (precio al por mayor)
                </label>
              </div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button
                onClick={guardarCliente}
                style={{
                  padding: '12px 40px',
                  backgroundColor: nuevoCliente.es_mayorista ? '#FF9800' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {nuevoCliente.es_mayorista ? '🏷️ Guardar Mayorista' : '💾 Guardar Cliente'}
              </button>
              <button
                onClick={() => setMostrarFormulario(false)}
                style={{
                  padding: '12px 30px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* TABLA DE CLIENTES */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          overflowX: 'auto'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>
            {pestaniaActiva === 'todos' ? '📋 Todos los Clientes' : 
             pestaniaActiva === 'mayoristas' ? '🏷️ Clientes Mayoristas (Precio al por mayor)' : 
             '👤 Clientes Normales (Precio al detalle)'}
          </h3>
          
          {pestaniaActiva === 'mayoristas' && (
            <div style={{
              backgroundColor: '#fff3e0',
              padding: '10px 15px',
              borderRadius: '8px',
              marginBottom: '15px',
              borderLeft: '4px solid #FF9800'
            }}>
              <p style={{ margin: 0, color: '#e65100' }}>
                🏷️ <strong>Clientes Mayoristas</strong> - Estos clientes tienen <strong>precio al por mayor</strong> automático al momento de vender.
              </p>
            </div>
          )}

          {pestaniaActiva === 'normales' && (
            <div style={{
              backgroundColor: '#e3f2fd',
              padding: '10px 15px',
              borderRadius: '8px',
              marginBottom: '15px',
              borderLeft: '4px solid #003b6f'
            }}>
              <p style={{ margin: 0, color: '#003b6f' }}>
                👤 <strong>Clientes Normales</strong> - Estos clientes compran al <strong>precio al detalle</strong> (del historial de ventas).
              </p>
            </div>
          )}

          {clientesMostrar.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <p style={{ fontSize: '1.2rem' }}>
                {pestaniaActiva === 'mayoristas' ? '🏷️ No hay clientes mayoristas registrados' :
                 pestaniaActiva === 'normales' ? '👤 No hay clientes normales registrados' :
                 '📭 No hay clientes registrados'}
              </p>
              <p>Haz clic en "🔄 Sincronizar Historial" para importar clientes de las ventas</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f7fa', borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>Nombre</th>
                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>Teléfono</th>
                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>Dirección</th>
                  <th style={{ padding: '10px 15px', textAlign: 'center' }}>Tipo</th>
                  <th style={{ padding: '10px 15px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientesMostrar.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 15px' }}>
                      <strong>{c.nombre}</strong>
                      {c.es_mayorista && (
                        <span style={{
                          backgroundColor: '#FF9800',
                          color: 'white',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '0.65rem',
                          marginLeft: '8px'
                        }}>
                          🏷️ Mayorista
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 15px' }}>{c.telefono || '-'}</td>
                    <td style={{ padding: '10px 15px' }}>{c.direccion || '-'}</td>
                    <td style={{ padding: '10px 15px', textAlign: 'center' }}>
                      {c.es_mayorista ? (
                        <span style={{
                          backgroundColor: '#fff3e0',
                          color: '#e65100',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '0.75rem'
                        }}>
                          🏷️ Mayorista
                        </span>
                      ) : (
                        <span style={{
                          backgroundColor: '#e3f2fd',
                          color: '#003b6f',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '0.75rem'
                        }}>
                          👤 Normal
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 15px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {esSucursalPrincipal && (
                          <button
                            onClick={() => toggleMayorista(c.id, c.es_mayorista)}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: c.es_mayorista ? '#FF9800' : '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.7rem'
                            }}
                          >
                            {c.es_mayorista ? '🔽 Quitar Mayorista' : '🔼 Hacer Mayorista'}
                          </button>
                        )}
                        
                        <button
                          onClick={() => eliminarCliente(c.id, c.nombre)}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.7rem'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PIE DE PÁGINA */}
        <div style={{
          marginTop: '30px',
          padding: '15px 20px',
          backgroundColor: '#f5f7fa',
          borderRadius: '12px',
          textAlign: 'center',
          color: '#666',
          fontSize: '0.8rem'
        }}>
          <p style={{ margin: 0 }}>
            © {new Date().getFullYear()} Sistema de Clientes · 
            {clientes.length} clientes totales · 
            {mayoristas.length} mayoristas · 
            {normales.length} normales
            {esSucursalPrincipal ? ' · 🏢 Sucursal Principal' : ''}
          </p>
        </div>
      </div>
    </AdminLayout>
  )
}

export default Clientes