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

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esSubgerente = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario.rol)
  const sucursalId = usuario?.sucursal_id || null

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
      let url = `${API_URL}/ventas`
      
      if (!esSubgerente) {
        url = `${API_URL}/ventas?sucursal_id=${sucursalId}`
      }
      
      console.log('📜 Cargando historial desde:', url)
      
      const response = await fetch(url)
      const data = await response.json()
      setVentas(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando historial:', error)
      setMensaje('❌ Error cargando historial')
    } finally {
      setCargando(false)
    }
  }

  // ============================================
  // FUNCIÓN PARA CANCELAR VENTA
  // ============================================
  const cancelarVenta = async (ventaId) => {
    const venta = ventas.find(v => v.id === ventaId);
    if (venta && !esSubgerente && venta.sucursal_id !== sucursalId) {
      alert('⚠️ Solo puedes cancelar ventas de tu sucursal');
      return;
    }

    if (!window.confirm('⚠️ ¿Estás seguro de cancelar esta venta?\n\nEl stock se devolverá al inventario automáticamente.\nEsta acción no se puede deshacer.')) return;

    const motivo = prompt('📝 Motivo de la cancelación (opcional):') || 'Cancelado por el usuario';

    try {
      const response = await fetch(`${API_URL}/ventas/${ventaId}/cancelar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuario.id,
          motivo: motivo
        })
      });

      const data = await response.json();

      if (data.success) {
        setMensaje('✅ Venta cancelada correctamente. Stock devuelto al inventario.');
        cargarHistorial();
        
        // 🔄 NOTIFICAR AL DASHBOARD
        localStorage.setItem('dashboard_updated', Date.now().toString());
        
        setTimeout(() => setMensaje(''), 3000);
      } else {
        alert('❌ Error: ' + (data.message || data.error));
      }
    } catch (error) {
      console.error('Error cancelando venta:', error);
      alert('❌ Error al cancelar la venta');
    }
  }

  const verDetalle = async (id) => {
    try {
      const response = await fetch(`${API_URL}/historial/${id}`)
      const data = await response.json()
      if (data.success) {
        setVentaSeleccionada(data.venta)
        setDetalles(data.detalles)
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
        
        // 🔄 NOTIFICAR AL DASHBOARD
        localStorage.setItem('dashboard_updated', Date.now().toString())
        
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

  const getSucursalNombre = () => {
    if (esSubgerente) return 'Todas las sucursales'
    if (sucursalId === 1) return 'Baní'
    if (sucursalId === 2) return 'Sabana'
    if (sucursalId === 3) return 'Principal'
    return 'Mi Sucursal'
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
      <h1>📜 Historial de Ventas - {getSucursalNombre()}</h1>

      {!esSubgerente && (
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '10px 15px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #003b6f'
        }}>
          <p style={{ margin: 0, color: '#003b6f' }}>
            🏢 Mostrando ventas de tu sucursal: <strong>{getSucursalNombre()}</strong>
          </p>
        </div>
      )}

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
              <th style={{ padding: '12px', textAlign: 'left' }}>Cliente</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>👤 Vendedor</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Fecha</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ventas.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                  No hay ventas registradas en {getSucursalNombre()}
                </td>
              </tr>
            ) : (
              ventas.map((v) => {
                const esMismaSucursal = v.sucursal_id === sucursalId;
                const puedeCancelar = esSubgerente || esMismaSucursal;
                const puedeEditar = v.estado !== 'cancelada';

                return (
                  <tr key={v.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{v.id}</td>
                    <td style={{ padding: '12px' }}>{v.cliente_nombre || v.cliente || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>{v.vendedor || v.usuario_id || 'N/A'}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      RD$ {Number(v.total).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {new Date(v.fecha || v.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {v.estado === 'cancelada' ? (
                        <span style={{
                          backgroundColor: '#f44336',
                          color: 'white',
                          padding: '2px 12px',
                          borderRadius: '12px',
                          fontSize: '0.8rem'
                        }}>
                          ❌ Cancelada
                        </span>
                      ) : v.estado === 'completada' ? (
                        <span style={{
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          padding: '2px 12px',
                          borderRadius: '12px',
                          fontSize: '0.8rem'
                        }}>
                          ✅ Completada
                        </span>
                      ) : v.estado === 'pendiente' ? (
                        <span style={{
                          backgroundColor: '#ff9800',
                          color: 'white',
                          padding: '2px 12px',
                          borderRadius: '12px',
                          fontSize: '0.8rem'
                        }}>
                          ⏳ Pendiente
                        </span>
                      ) : (
                        <span style={{
                          backgroundColor: '#757575',
                          color: 'white',
                          padding: '2px 12px',
                          borderRadius: '12px',
                          fontSize: '0.8rem'
                        }}>
                          {v.estado || 'Desconocido'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {puedeEditar && (
                        <button
                          onClick={() => verDetalle(v.id)}
                          style={{
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 12px',
                            cursor: 'pointer',
                            marginRight: '5px'
                          }}
                        >
                          ✏️ Editar
                        </button>
                      )}
                      
                      {puedeEditar && puedeCancelar && (
                        <button
                          onClick={() => cancelarVenta(v.id)}
                          style={{
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 12px',
                            cursor: 'pointer'
                          }}
                        >
                          ❌ Cancelar
                        </button>
                      )}
                      {v.estado === 'cancelada' && (
                        <span style={{ color: '#999', fontSize: '0.75rem' }}>
                          {v.motivo_cancelacion || 'Cancelada'}
                        </span>
                      )}
                      {puedeEditar && !puedeCancelar && (
                        <span style={{ color: '#999', fontSize: '0.75rem' }}>
                          Solo vendedor de esta sucursal
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de edición */}
      {mostrarEdicion && ventaSeleccionada && ventaSeleccionada.estado !== 'cancelada' && (
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
            <p style={{ color: '#666' }}>👤 Vendedor: {ventaSeleccionada.vendedor || 'N/A'}</p>

            <hr style={{ margin: '15px 0' }} />

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