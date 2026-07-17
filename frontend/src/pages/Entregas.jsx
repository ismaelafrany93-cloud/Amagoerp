import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Entregas() {
  const [entregas, setEntregas] = useState([])
  const [filtradas, setFiltradas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [mostrarTodos, setMostrarTodos] = useState(false)

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esSubgerente = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario.rol)

  useEffect(() => {
    cargarEntregas()
  }, [])

  const cargarEntregas = async () => {
    try {
      let url = `${API_URL}/entregas`
      
      // Si no es subgerente, solo ver entregas de su sucursal
      if (!esSubgerente) {
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

  // 🔍 FUNCIÓN DE BÚSQUEDA POR CÓDIGO
  const handleBusqueda = (e) => {
    const valor = e.target.value.toUpperCase().trim()
    setBusqueda(valor)

    if (valor === '') {
      setFiltradas(entregas)
      return
    }

    // Buscar por código (incluye letras)
    const resultados = entregas.filter(entrega => 
      entrega.codigo && entrega.codigo.toUpperCase().includes(valor)
    )
    setFiltradas(resultados)
  }

  const marcarComoEntregada = async (id) => {
    if (!window.confirm('¿Confirmar que esta entrega fue realizada?')) return

    try {
      const response = await fetch(`${API_URL}/entregas/${id}/entregar`, {
        method: 'PUT'
      })
      const data = await response.json()

      if (data.success) {
        setMensaje('✅ Entrega marcada como completada')
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

      {/* 👇 BUSCADOR POR CÓDIGO */}
      <div style={{
        display: 'flex',
        gap: '15px',
        marginBottom: '20px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 2, minWidth: '250px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>
            🔍 Buscar por Código de Entrega
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
          <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '5px' }}>
            💡 Ingresa el código de entrega (ej: AMG-H8TMAC18) - Acepta letras y números
          </p>
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>
            📊 Filtrar por estado
          </label>
          <select
            onChange={(e) => {
              const estado = e.target.value
              if (estado === 'todos') {
                setFiltradas(entregas)
              } else {
                setFiltradas(entregas.filter(e => e.estado === estado))
              }
            }}
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
            <option value="cancelada">❌ Canceladas</option>
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

      {/* 📊 Resumen rápido */}
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
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>❌ Canceladas</p>
        </div>
      </div>

      {/* 📋 Tabla de entregas */}
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
              <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
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
                    {e.codigo && (
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
                        📋 Copiar
                      </button>
                    )}
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
                        ❌ Cancelada
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {new Date(e.fecha_salida || e.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {e.estado === 'pendiente' && (
                      <button
                        onClick={() => marcarComoEntregada(e.id)}
                        style={{
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          cursor: 'pointer'
                        }}
                      >
                        ✅ Entregar
                      </button>
                    )}
                    {e.estado === 'entregada' && (
                      <span style={{ color: '#4CAF50' }}>✅ Completada</span>
                    )}
                    {e.estado === 'cancelada' && (
                      <span style={{ color: '#f44336' }}>❌ Cancelada</span>
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

export default Entregas