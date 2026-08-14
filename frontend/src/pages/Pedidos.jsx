import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Pedidos() {
  const [pedidos, setPedidos] = useState([])
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null)
  const [estadisticas, setEstadisticas] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [mostrarDetalle, setMostrarDetalle] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [imagenPreview, setImagenPreview] = useState(null)
  const [operariosDisponibles, setOperariosDisponibles] = useState([])
  
  const [nuevoPedido, setNuevoPedido] = useState({
    cliente_nombre: '',
    cliente_telefono: '',
    cliente_direccion: '',
    producto_nombre: '',
    producto_descripcion: '',
    cantidad_total: 1,
    prioridad: 'normal',
    fecha_entrega_estimada: '',
    observaciones: '',
    imagen: null
  })

  const [produccionPedido, setProduccionPedido] = useState({
    cantidad: 1,
    operario_nombre: '',
    observaciones: ''
  })

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const rol = usuario?.rol || ''
  
  const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(rol)
  const esSupervisor = ['supervisor', 'dueno', 'dueño', 'subgerente', 'admin'].includes(rol)
  const esVendedor = ['vendedor', 'vendedora'].includes(rol)
  const puedeCrearPedido = esAdmin || esVendedor
  const puedeGestionarProduccion = esSupervisor
  const puedeEliminar = esAdmin
  
  const sucursalId = usuario?.sucursal_id || 3

  useEffect(() => {
    if (esAdmin || esSupervisor || esVendedor) {
      cargarPedidos()
      cargarEstadisticas()
    }
  }, [filtroEstado])

  const cargarPedidos = async () => {
    setCargando(true)
    try {
      let url = `${API_URL}/pedidos?sucursal_id=${sucursalId}`
      if (filtroEstado !== 'todos') {
        url += `&estado=${filtroEstado}`
      }
      const response = await fetch(url)
      const data = await response.json()
      setPedidos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error:', error)
      setError('Error al cargar pedidos')
    } finally {
      setCargando(false)
    }
  }

  const cargarEstadisticas = async () => {
    try {
      const response = await fetch(`${API_URL}/pedidos/estadisticas?sucursal_id=${sucursalId}`)
      const data = await response.json()
      setEstadisticas(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const cargarPedidoDetalle = async (id) => {
    try {
      const response = await fetch(`${API_URL}/pedidos/${id}`)
      const data = await response.json()
      setPedidoSeleccionado(data)
      setOperariosDisponibles(data.operarios || [])
      setMostrarDetalle(true)
    } catch (error) {
      console.error('Error:', error)
      setError('Error al cargar detalle del pedido')
    }
  }

  const crearPedido = async (e) => {
    e.preventDefault()
    if (!nuevoPedido.cliente_nombre || !nuevoPedido.producto_nombre || !nuevoPedido.cantidad_total) {
      setError('⚠️ Cliente, producto y cantidad son requeridos')
      return
    }

    try {
      const formData = new FormData()
      formData.append('cliente_nombre', nuevoPedido.cliente_nombre)
      formData.append('cliente_telefono', nuevoPedido.cliente_telefono || '')
      formData.append('cliente_direccion', nuevoPedido.cliente_direccion || '')
      formData.append('producto_nombre', nuevoPedido.producto_nombre)
      formData.append('producto_descripcion', nuevoPedido.producto_descripcion || '')
      formData.append('cantidad_total', nuevoPedido.cantidad_total)
      formData.append('prioridad', nuevoPedido.prioridad)
      formData.append('fecha_entrega_estimada', nuevoPedido.fecha_entrega_estimada || '')
      formData.append('observaciones', nuevoPedido.observaciones || '')
      formData.append('sucursal_id', sucursalId)
      formData.append('creado_por', usuario.id)
      
      if (nuevoPedido.imagen) {
        formData.append('imagen', nuevoPedido.imagen)
      }

      const response = await fetch(`${API_URL}/pedidos`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      
      if (data.success) {
        setMensaje('✅ Pedido creado correctamente')
        setMostrarFormulario(false)
        setNuevoPedido({
          cliente_nombre: '',
          cliente_telefono: '',
          cliente_direccion: '',
          producto_nombre: '',
          producto_descripcion: '',
          cantidad_total: 1,
          prioridad: 'normal',
          fecha_entrega_estimada: '',
          observaciones: '',
          imagen: null
        })
        setImagenPreview(null)
        cargarPedidos()
        cargarEstadisticas()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setError('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('❌ Error al crear pedido')
    }
  }

  const agregarProduccion = async (pedidoId) => {
    if (!produccionPedido.cantidad || produccionPedido.cantidad <= 0) {
      setError('⚠️ Ingresa una cantidad válida')
      return
    }

    try {
      const response = await fetch(`${API_URL}/pedidos/${pedidoId}/produccion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantidad: parseInt(produccionPedido.cantidad),
          operario_nombre: produccionPedido.operario_nombre || 'Supervisor',
          observaciones: produccionPedido.observaciones || '',
          usuario_id: usuario.id
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setMensaje(data.message)
        setProduccionPedido({ cantidad: 1, operario_nombre: '', observaciones: '' })
        cargarPedidos()
        cargarEstadisticas()
        if (pedidoSeleccionado) {
          cargarPedidoDetalle(pedidoId)
        }
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setError('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('❌ Error al agregar producción')
    }
  }

  const cambiarEstado = async (pedidoId, estado) => {
    if (!window.confirm(`¿Cambiar estado a "${estado}"?`)) return

    try {
      const response = await fetch(`${API_URL}/pedidos/${pedidoId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, usuario_id: usuario.id })
      })

      const data = await response.json()
      
      if (data.success) {
        setMensaje(data.message)
        cargarPedidos()
        cargarEstadisticas()
        if (pedidoSeleccionado) {
          cargarPedidoDetalle(pedidoId)
        }
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setError('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('❌ Error al cambiar estado')
    }
  }

  const eliminarPedido = async (id, codigo) => {
    if (!window.confirm(`¿Eliminar el pedido ${codigo}?`)) return

    try {
      const response = await fetch(`${API_URL}/pedidos/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        setMensaje(data.message)
        cargarPedidos()
        cargarEstadisticas()
        setMostrarDetalle(false)
        setPedidoSeleccionado(null)
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setError('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('❌ Error al eliminar pedido')
    }
  }

  const handleImagenChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setNuevoPedido({ ...nuevoPedido, imagen: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagenPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const getEstadoColor = (estado) => {
    const colores = {
      'pendiente': '#FF9800',
      'en_produccion': '#2196F3',
      'completado': '#4CAF50',
      'entregado': '#9C27B0'
    }
    return colores[estado] || '#666'
  }

  const getEstadoEmoji = (estado) => {
    const emojis = {
      'pendiente': '⏳',
      'en_produccion': '🔧',
      'completado': '✅',
      'entregado': '📦'
    }
    return emojis[estado] || '❓'
  }

  if (!esAdmin && !esSupervisor && !esVendedor) {
    return (
      <AdminLayout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>⛔ Acceso Denegado</h2>
          <p>No tienes permisos para ver este módulo</p>
        </div>
      </AdminLayout>
    )
  }

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
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>📋 Pedidos</h1>
            <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
              {pedidos.length} pedidos registrados
              {esVendedor && ' · 🛒 Solo visualización'}
              {esSupervisor && !esAdmin && ' · 🔧 Gestión de producción'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {puedeCrearPedido && (
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
                {mostrarFormulario ? '✕ Cancelar' : '+ Nuevo Pedido'}
              </button>
            )}
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

        {/* ESTADÍSTICAS */}
        {estadisticas && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '10px',
            marginBottom: '20px'
          }}>
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderTop: '4px solid #003b6f' }}>
              <p style={{ margin: 0, color: '#666', fontSize: '0.7rem' }}>Total</p>
              <h3 style={{ margin: '5px 0', color: '#003b6f' }}>{estadisticas.total_pedidos}</h3>
            </div>
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderTop: '4px solid #FF9800' }}>
              <p style={{ margin: 0, color: '#666', fontSize: '0.7rem' }}>⏳ Pendientes</p>
              <h3 style={{ margin: '5px 0', color: '#e65100' }}>{estadisticas.pendientes}</h3>
            </div>
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderTop: '4px solid #2196F3' }}>
              <p style={{ margin: 0, color: '#666', fontSize: '0.7rem' }}>🔧 En Prod.</p>
              <h3 style={{ margin: '5px 0', color: '#0d47a1' }}>{estadisticas.en_produccion}</h3>
            </div>
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderTop: '4px solid #4CAF50' }}>
              <p style={{ margin: 0, color: '#666', fontSize: '0.7rem' }}>✅ Completados</p>
              <h3 style={{ margin: '5px 0', color: '#1b5e20' }}>{estadisticas.completados}</h3>
            </div>
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderTop: '4px solid #9C27B0' }}>
              <p style={{ margin: 0, color: '#666', fontSize: '0.7rem' }}>📦 Entregados</p>
              <h3 style={{ margin: '5px 0', color: '#4a148c' }}>{estadisticas.entregados}</h3>
            </div>
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
          <div>
            <label style={{ fontWeight: '500', marginRight: '5px', color: '#555' }}>📊 Estado:</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }}
            >
              <option value="todos">Todos</option>
              <option value="pendiente">⏳ Pendientes</option>
              <option value="en_produccion">🔧 En Producción</option>
              <option value="completado">✅ Completados</option>
              <option value="entregado">📦 Entregados</option>
            </select>
          </div>
          <button
            onClick={() => { cargarPedidos(); cargarEstadisticas(); }}
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

        {/* FORMULARIO NUEVO PEDIDO */}
        {mostrarFormulario && puedeCrearPedido && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '25px',
            marginBottom: '20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, color: '#003b6f' }}>📝 Nuevo Pedido</h3>
            <form onSubmit={crearPedido}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '15px'
              }}>
                <input
                  type="text"
                  placeholder="Cliente *"
                  value={nuevoPedido.cliente_nombre}
                  onChange={(e) => setNuevoPedido({ ...nuevoPedido, cliente_nombre: e.target.value })}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                  required
                />
                <input
                  type="text"
                  placeholder="Teléfono"
                  value={nuevoPedido.cliente_telefono}
                  onChange={(e) => setNuevoPedido({ ...nuevoPedido, cliente_telefono: e.target.value })}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                />
                <input
                  type="text"
                  placeholder="Dirección"
                  value={nuevoPedido.cliente_direccion}
                  onChange={(e) => setNuevoPedido({ ...nuevoPedido, cliente_direccion: e.target.value })}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                />
                <input
                  type="text"
                  placeholder="Producto *"
                  value={nuevoPedido.producto_nombre}
                  onChange={(e) => setNuevoPedido({ ...nuevoPedido, producto_nombre: e.target.value })}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                  required
                />
                <input
                  type="text"
                  placeholder="Descripción del producto"
                  value={nuevoPedido.producto_descripcion}
                  onChange={(e) => setNuevoPedido({ ...nuevoPedido, producto_descripcion: e.target.value })}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                />
                <input
                  type="number"
                  placeholder="Cantidad *"
                  value={nuevoPedido.cantidad_total}
                  onChange={(e) => setNuevoPedido({ ...nuevoPedido, cantidad_total: parseInt(e.target.value) || 0 })}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                  required
                  min="1"
                />
                <select
                  value={nuevoPedido.prioridad}
                  onChange={(e) => setNuevoPedido({ ...nuevoPedido, prioridad: e.target.value })}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                >
                  <option value="normal">🟢 Normal</option>
                  <option value="urgente">🔴 Urgente</option>
                </select>
                <input
                  type="date"
                  placeholder="Fecha entrega estimada"
                  value={nuevoPedido.fecha_entrega_estimada}
                  onChange={(e) => setNuevoPedido({ ...nuevoPedido, fecha_entrega_estimada: e.target.value })}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                />
                <textarea
                  placeholder="Observaciones"
                  value={nuevoPedido.observaciones}
                  onChange={(e) => setNuevoPedido({ ...nuevoPedido, observaciones: e.target.value })}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '60px' }}
                />
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>
                    📸 Imagen del mueble (opcional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImagenChange}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', width: '100%' }}
                  />
                  {imagenPreview && (
                    <div style={{ marginTop: '10px' }}>
                      <img src={imagenPreview} alt="Vista previa" style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '8px' }} />
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  style={{
                    padding: '12px 40px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  💾 Guardar Pedido
                </button>
                <button
                  type="button"
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
            </form>
          </div>
        )}

        {/* TABLA DE PEDIDOS */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          overflowX: 'auto'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>📋 Lista de Pedidos</h3>
          
          {esSupervisor && !esAdmin && (
            <div style={{
              backgroundColor: '#e3f2fd',
              padding: '10px 15px',
              borderRadius: '8px',
              marginBottom: '15px',
              borderLeft: '4px solid #2196F3'
            }}>
              <p style={{ margin: 0, color: '#003b6f' }}>
                🔧 <strong>Vista de Supervisor</strong> - Aquí puedes ver los pedidos que debes fabricar y agregar la producción realizada.
              </p>
            </div>
          )}
          
          {esVendedor && !esAdmin && !esSupervisor && (
            <div style={{
              backgroundColor: '#e8f5e9',
              padding: '10px 15px',
              borderRadius: '8px',
              marginBottom: '15px',
              borderLeft: '4px solid #4CAF50'
            }}>
              <p style={{ margin: 0, color: '#1b5e20' }}>
                🛒 <strong>Vista de Vendedor</strong> - Puedes ver todos los pedidos y crear nuevos. La producción la gestiona el supervisor.
              </p>
            </div>
          )}
          
          {pedidos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <p style={{ fontSize: '1.2rem' }}>📭 No hay pedidos registrados</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f7fa', borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Código</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Cliente</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Producto</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Cantidad</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Producido</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Pendiente</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Prioridad</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <strong style={{ color: '#003b6f', fontFamily: 'monospace' }}>{p.codigo}</strong>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{p.cliente_nombre}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {p.producto_nombre}
                      {p.imagen_url && (
                        <span style={{ marginLeft: '8px', fontSize: '0.7rem' }}>📸</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 'bold' }}>{p.cantidad_total}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#2196F3' }}>{p.cantidad_producida || 0}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#e65100', fontWeight: 'bold' }}>{p.cantidad_pendiente || p.cantidad_total}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: getEstadoColor(p.estado) + '20',
                        color: getEstadoColor(p.estado),
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem'
                      }}>
                        {getEstadoEmoji(p.estado)} {p.estado}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {p.prioridad === 'urgente' ? (
                        <span style={{
                          backgroundColor: '#ffebee',
                          color: '#c62828',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.75rem'
                        }}>
                          🔴 Urgente
                        </span>
                      ) : (
                        <span style={{
                          backgroundColor: '#e8f5e9',
                          color: '#1b5e20',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.75rem'
                        }}>
                          🟢 Normal
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => cargarPedidoDetalle(p.id)}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#003b6f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.7rem'
                          }}
                        >
                          👁️ Ver
                        </button>
                        {puedeEliminar && (
                          <button
                            onClick={() => eliminarPedido(p.id, p.codigo)}
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
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* MODAL DETALLE DE PEDIDO */}
        {mostrarDetalle && pedidoSeleccionado && (
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
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#003b6f' }}>
                  📋 Pedido {pedidoSeleccionado.pedido.codigo}
                </h2>
                <button
                  onClick={() => { setMostrarDetalle(false); setPedidoSeleccionado(null); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Información del Pedido */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px',
                backgroundColor: '#f5f7fa',
                padding: '15px',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <div><strong>Cliente:</strong> {pedidoSeleccionado.pedido.cliente_nombre}</div>
                <div><strong>Teléfono:</strong> {pedidoSeleccionado.pedido.cliente_telefono || '-'}</div>
                <div><strong>Producto:</strong> {pedidoSeleccionado.pedido.producto_nombre}</div>
                <div><strong>Cantidad:</strong> {pedidoSeleccionado.pedido.cantidad_total}</div>
                <div><strong>Producido:</strong> {pedidoSeleccionado.pedido.cantidad_producida || 0}</div>
                <div><strong>Pendiente:</strong> {pedidoSeleccionado.pedido.cantidad_pendiente || pedidoSeleccionado.pedido.cantidad_total}</div>
                <div><strong>Estado:</strong> <span style={{ color: getEstadoColor(pedidoSeleccionado.pedido.estado) }}>{getEstadoEmoji(pedidoSeleccionado.pedido.estado)} {pedidoSeleccionado.pedido.estado}</span></div>
                <div><strong>Prioridad:</strong> {pedidoSeleccionado.pedido.prioridad === 'urgente' ? '🔴 Urgente' : '🟢 Normal'}</div>
                <div><strong>Fecha Pedido:</strong> {new Date(pedidoSeleccionado.pedido.fecha_pedido).toLocaleDateString()}</div>
                <div><strong>Entrega Estimada:</strong> {pedidoSeleccionado.pedido.fecha_entrega_estimada ? new Date(pedidoSeleccionado.pedido.fecha_entrega_estimada).toLocaleDateString() : '-'}</div>
              </div>

              {/* Imagen del producto */}
              {pedidoSeleccionado.pedido.imagen_url && (
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                  <img 
                    src={`${API_URL}${pedidoSeleccionado.pedido.imagen_url}`}
                    alt="Producto" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '300px', 
                      borderRadius: '8px', 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const parent = e.target.parentElement;
                      parent.innerHTML = `
                        <div style="padding: 20px; background: #ffebee; border-radius: 8px; color: #c62828;">
                          ❌ No se pudo cargar la imagen
                        </div>
                      `;
                    }}
                  />
                </div>
              )}

              {/* Agregar producción */}
              {puedeGestionarProduccion && pedidoSeleccionado.pedido.estado !== 'completado' && pedidoSeleccionado.pedido.estado !== 'entregado' && (
                <div style={{
                  backgroundColor: '#e3f2fd',
                  padding: '15px',
                  borderRadius: '12px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#003b6f' }}>🔧 Agregar Producción</h4>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="number"
                      placeholder="Cantidad *"
                      value={produccionPedido.cantidad}
                      onChange={(e) => setProduccionPedido({ ...produccionPedido, cantidad: parseInt(e.target.value) || 0 })}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', width: '100px' }}
                      min="1"
                      max={pedidoSeleccionado.pedido.cantidad_pendiente || pedidoSeleccionado.pedido.cantidad_total}
                    />
                    
                    <select
                      value={produccionPedido.operario_nombre}
                      onChange={(e) => setProduccionPedido({ ...produccionPedido, operario_nombre: e.target.value })}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', minWidth: '150px' }}
                    >
                      <option value="">Seleccionar Operario</option>
                      {operariosDisponibles.map(op => (
                        <option key={op.id} value={op.nombre}>
                          👷 {op.nombre}
                        </option>
                      ))}
                    </select>
                    
                    <input
                      type="text"
                      placeholder="Observaciones"
                      value={produccionPedido.observaciones}
                      onChange={(e) => setProduccionPedido({ ...produccionPedido, observaciones: e.target.value })}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', flex: 1 }}
                    />
                    <button
                      onClick={() => agregarProduccion(pedidoSeleccionado.pedido.id)}
                      style={{
                        padding: '8px 20px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      ✅ Agregar
                    </button>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ margin: '0', fontSize: '0.75rem', color: '#666' }}>
                      📊 <strong>Estado:</strong> {pedidoSeleccionado.pedido.cantidad_producida || 0} de {pedidoSeleccionado.pedido.cantidad_total} unidades producidas
                    </p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: '#e65100', fontWeight: 'bold' }}>
                      ⏳ Pendiente: {pedidoSeleccionado.pedido.cantidad_pendiente || pedidoSeleccionado.pedido.cantidad_total} unidades
                    </p>
                  </div>
                </div>
              )}

              {/* Detalle de producción */}
              <h4 style={{ margin: '10px 0', color: '#003b6f' }}>📊 Detalle de Producción</h4>
              {pedidoSeleccionado.detalles && pedidoSeleccionado.detalles.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f7fa' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Fecha</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Cantidad</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Operario</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidoSeleccionado.detalles.map(d => (
                      <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px' }}>{new Date(d.fecha_produccion).toLocaleDateString()}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{d.cantidad}</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{
                            backgroundColor: '#e3f2fd',
                            color: '#003b6f',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.75rem'
                          }}>
                            👷 {d.operario_nombre || 'Sin asignar'}
                          </span>
                        </td>
                        <td style={{ padding: '8px' }}>{d.observaciones || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f5f7fa', fontWeight: 'bold' }}>
                      <td style={{ padding: '8px' }}>Total</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {pedidoSeleccionado.detalles.reduce((sum, d) => sum + d.cantidad, 0)}
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <p style={{ color: '#999', textAlign: 'center', padding: '10px' }}>No hay producción registrada</p>
              )}

              {/* Botones de acción */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
                {puedeGestionarProduccion && pedidoSeleccionado.pedido.estado === 'pendiente' && (
                  <button
                    onClick={() => cambiarEstado(pedidoSeleccionado.pedido.id, 'en_produccion')}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    🔧 Iniciar Producción
                  </button>
                )}
                {puedeGestionarProduccion && pedidoSeleccionado.pedido.estado === 'en_produccion' && (
                  <button
                    onClick={() => cambiarEstado(pedidoSeleccionado.pedido.id, 'completado')}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    ✅ Completar Pedido
                  </button>
                )}
                {puedeEliminar && pedidoSeleccionado.pedido.estado === 'completado' && (
                  <button
                    onClick={() => cambiarEstado(pedidoSeleccionado.pedido.id, 'entregado')}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#9C27B0',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    📦 Marcar como Entregado
                  </button>
                )}
                <button
                  onClick={() => { setMostrarDetalle(false); setPedidoSeleccionado(null); }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#757575',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default Pedidos