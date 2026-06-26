import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Historial() {
  const [ventas, setVentas] = useState([])
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null)
  const [detalles, setDetalles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarEdicion, setMostrarEdicion] = useState(false)
  const [mensaje, setMensaje] = useState('')

  // Estado para editar la factura
  const [carritoEdit, setCarritoEdit] = useState([])
  const [clienteEdit, setClienteEdit] = useState({
    nombre: '',
    telefono: '',
    direccion: ''
  })
  const [tipoPagoEdit, setTipoPagoEdit] = useState('Efectivo')
  const [tipoVentaEdit, setTipoVentaEdit] = useState('contado')
  const [tipoEntregaEdit, setTipoEntregaEdit] = useState('retiro')
  const [detallesEdit, setDetallesEdit] = useState('')

  useEffect(() => {
    cargarHistorial()
  }, [])

  const cargarHistorial = async () => {
    try {
      const response = await fetch(`${API_URL}/historial`)
      const data = await response.json()
      setVentas(data)
    } catch (error) {
      console.error('Error cargando historial:', error)
    } finally {
      setCargando(false)
    }
  }

  const verDetalle = async (id) => {
    try {
      const response = await fetch(`${API_URL}/historial/${id}`)
      const data = await response.json()
      if (data.success) {
        setVentaSeleccionada(data.venta)
        setDetalles(data.detalles)
        // Preparar datos para edición
        setClienteEdit({
          nombre: data.venta.cliente_nombre || '',
          telefono: data.venta.cliente_telefono || '',
          direccion: data.venta.cliente_direccion || ''
        })
        setCarritoEdit(data.detalles.map(d => ({
          id: d.producto_id,
          nombre: d.producto_nombre,
          precio: d.precio,
          cantidad: d.cantidad
        })))
        setTipoPagoEdit(data.venta.tipo_pago || 'Efectivo')
        setTipoVentaEdit(data.venta.tipo_venta || 'contado')
        setTipoEntregaEdit(data.venta.tipo_entrega || 'retiro')
        setDetallesEdit(data.venta.detalles || '')
        setMostrarEdicion(true)
      }
    } catch (error) {
      console.error('Error cargando detalle:', error)
    }
  }

  const actualizarCantidadEdit = (id, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      setCarritoEdit(prev => prev.filter(item => item.id !== id))
    } else {
      setCarritoEdit(prev =>
        prev.map(item =>
          item.id === id ? { ...item, cantidad: nuevaCantidad } : item
        )
      )
    }
  }

  const eliminarProductoEdit = (id) => {
    setCarritoEdit(prev => prev.filter(item => item.id !== id))
  }

  const totalEdit = carritoEdit.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)

  const guardarCambios = async () => {
    if (!window.confirm('¿Estás seguro de guardar los cambios? La factura original se anulará.')) return

    if (carritoEdit.length === 0) {
      alert('⚠️ El carrito no puede estar vacío')
      return
    }

    setCargando(true)

    try {
      const usuario = JSON.parse(localStorage.getItem('usuario'))

      const response = await fetch(`${API_URL}/historial/editar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venta_id: ventaSeleccionada.id,
          usuario_id: usuario.id,
          cliente_nombre: clienteEdit.nombre,
          cliente_telefono: clienteEdit.telefono,
          cliente_direccion: clienteEdit.direccion,
          carrito: carritoEdit.map(item => ({
            id: item.id,
            precio: item.precio,
            cantidad: item.cantidad
          })),
          total: totalEdit,
          tipo_pago: tipoPagoEdit,
          tipo_venta: tipoVentaEdit,
          tipo_entrega: tipoEntregaEdit,
          detalles: detallesEdit
        })
      })

      const data = await response.json()

      if (data.success) {
        setMensaje('✅ Factura editada correctamente')
        setMostrarEdicion(false)
        setVentaSeleccionada(null)
        cargarHistorial()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error: ' + (data.error || 'No se pudo guardar'))
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error guardando cambios')
    } finally {
      setCargando(false)
    }
  }

  if (cargando) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Cargando historial...</h2>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <h1>📜 Historial de Ventas</h1>

      {mensaje && (
        <div style={{
          backgroundColor: '#e8f5e9',
          color: '#1b5e20',
          padding: '10px 15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {mensaje}
        </div>
      )}

      {/* Tabla de ventas */}
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
            <th style={{ padding: '12px', textAlign: 'left' }}>#</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Cliente</th>
            <th style={{ padding: '12px', textAlign: 'right' }}>Total</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Fecha</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {ventas.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                No hay ventas registradas
              </td>
            </tr>
          ) : (
            ventas.map((v) => (
              <tr key={v.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{v.id}</td>
                <td style={{ padding: '12px' }}>{v.cliente_nombre || 'N/A'}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  RD$ {Number(v.total).toFixed(2)}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {new Date(v.fecha).toLocaleDateString()}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{
                    backgroundColor: v.estado === 'completada' ? '#4CAF50' : '#f44336',
                    color: 'white',
                    padding: '2px 12px',
                    borderRadius: '12px',
                    fontSize: '0.8rem'
                  }}>
                    {v.estado === 'completada' ? '✅ Activa' : '❌ Anulada'}
                  </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {v.estado === 'completada' && (
                    <button
                      onClick={() => verDetalle(v.id)}
                      style={{
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 12px',
                        cursor: 'pointer'
                      }}
                    >
                      ✏️ Editar
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Modal de edición */}
      {mostrarEdicion && ventaSeleccionada && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
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
            <h2 style={{ color: '#003b6f' }}>✏️ Editar Factura #{ventaSeleccionada.id}</h2>
            <p style={{ color: '#666' }}>Cliente: {ventaSeleccionada.cliente_nombre}</p>

            <hr style={{ margin: '15px 0' }} />

            {/* Datos del cliente */}
            <h3>👤 Datos del Cliente</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label>Nombre *</label>
                <input
                  type="text"
                  value={clienteEdit.nombre}
                  onChange={(e) => setClienteEdit({ ...clienteEdit, nombre: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label>Teléfono</label>
                <input
                  type="text"
                  value={clienteEdit.telefono}
                  onChange={(e) => setClienteEdit({ ...clienteEdit, telefono: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Dirección</label>
                <input
                  type="text"
                  value={clienteEdit.direccion}
                  onChange={(e) => setClienteEdit({ ...clienteEdit, direccion: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
            </div>

            {/* Opciones de venta */}
            <h3 style={{ marginTop: '20px' }}>📋 Opciones</h3>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <label>
                <strong>Tipo de Pago:</strong>
                <select
                  value={tipoPagoEdit}
                  onChange={(e) => setTipoPagoEdit(e.target.value)}
                  style={{ marginLeft: '10px', padding: '6px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </label>
              <label>
                <strong>Tipo de Venta:</strong>
                <select
                  value={tipoVentaEdit}
                  onChange={(e) => setTipoVentaEdit(e.target.value)}
                  style={{ marginLeft: '10px', padding: '6px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="contado">Contado</option>
                  <option value="credito">Crédito</option>
                </select>
              </label>
              <label>
                <strong>Tipo de Entrega:</strong>
                <select
                  value={tipoEntregaEdit}
                  onChange={(e) => setTipoEntregaEdit(e.target.value)}
                  style={{ marginLeft: '10px', padding: '6px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="retiro">Retiro en tienda</option>
                  <option value="domicilio">Domicilio</option>
                </select>
              </label>
            </div>

            {/* Carrito editable */}
            <h3 style={{ marginTop: '20px' }}>🛒 Productos</h3>
            {carritoEdit.map((item) => (
              <div key={item.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px',
                borderBottom: '1px solid #eee'
              }}>
                <span style={{ flex: 2 }}>{item.nombre}</span>
                <span style={{ flex: 1, textAlign: 'center' }}>
                  <button onClick={() => actualizarCantidadEdit(item.id, item.cantidad - 1)} style={{ cursor: 'pointer' }}>−</button>
                  <span style={{ margin: '0 8px' }}>{item.cantidad}</span>
                  <button onClick={() => actualizarCantidadEdit(item.id, item.cantidad + 1)} style={{ cursor: 'pointer' }}>+</button>
                </span>
                <span style={{ flex: 1, textAlign: 'right' }}>RD$ {(item.precio * item.cantidad).toFixed(2)}</span>
                <button onClick={() => eliminarProductoEdit(item.id)} style={{ backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
            ))}

            <div style={{ textAlign: 'right', marginTop: '15px', fontWeight: 'bold' }}>
              <span style={{ fontSize: '1.2rem' }}>Total: RD$ {totalEdit.toFixed(2)}</span>
            </div>

            <div style={{ marginTop: '15px' }}>
              <label>Detalles adicionales</label>
              <textarea
                value={detallesEdit}
                onChange={(e) => setDetallesEdit(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', minHeight: '50px' }}
                placeholder="Notas adicionales..."
              />
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
              <button
                onClick={guardarCambios}
                disabled={cargando}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                {cargando ? 'Guardando...' : '✅ Guardar Cambios'}
              </button>
              <button
                onClick={() => {
                  setMostrarEdicion(false)
                  setVentaSeleccionada(null)
                }}
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
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default Historial