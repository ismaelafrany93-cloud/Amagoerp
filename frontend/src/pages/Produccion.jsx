import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Produccion() {
  const [productos, setProductos] = useState([])
  const [producciones, setProducciones] = useState([])
  const [resumen, setResumen] = useState([])
  const [operarios, setOperarios] = useState([])
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [editando, setEditando] = useState(null)

  // Estado para el formulario
  const [form, setForm] = useState({
    operario: '',
    fecha: new Date().toISOString().split('T')[0],
    observacion_general: '',
    productos: []
  })

  // Estado para agregar un producto al formulario
  const [productoSeleccionado, setProductoSeleccionado] = useState('')
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState(1)
  const [observacionProducto, setObservacionProducto] = useState('')

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esSupervisor = ['supervisor', 'subgerente', 'dueno', 'dueño', 'admin'].includes(usuario.rol)

  useEffect(() => {
    cargarProductos()
    cargarProducciones()
    cargarResumen()
    cargarOperarios()
  }, [])

  const cargarProductos = async () => {
    try {
      const response = await fetch(`${API_URL}/productos`)
      const data = await response.json()
      setProductos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando productos:', error)
    }
  }

  const cargarProducciones = async () => {
    try {
      const response = await fetch(`${API_URL}/produccion`)
      const data = await response.json()
      setProducciones(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando producciones:', error)
    }
  }

  const cargarResumen = async () => {
    try {
      const response = await fetch(`${API_URL}/produccion/resumen`)
      const data = await response.json()
      setResumen(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando resumen:', error)
    }
  }

  const cargarOperarios = async () => {
    try {
      const response = await fetch(`${API_URL}/operarios`)
      const data = await response.json()
      setOperarios(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando operarios:', error)
    }
  }

  // ============================================
  // AGREGAR PRODUCTO AL FORMULARIO
  // ============================================
  const agregarProducto = () => {
    if (!productoSeleccionado) {
      alert('⚠️ Selecciona un producto')
      return
    }
    if (!cantidadSeleccionada || cantidadSeleccionada <= 0) {
      alert('⚠️ Ingresa una cantidad válida')
      return
    }

    const producto = productos.find(p => p.id === parseInt(productoSeleccionado))
    if (!producto) return

    // Verificar si el producto ya está en la lista
    const existe = form.productos.find(p => p.producto_id === producto.id)
    if (existe) {
      // Si ya existe, actualizar cantidad
      setForm({
        ...form,
        productos: form.productos.map(p =>
          p.producto_id === producto.id
            ? { ...p, cantidad: p.cantidad + cantidadSeleccionada }
            : p
        )
      })
    } else {
      setForm({
        ...form,
        productos: [
          ...form.productos,
          {
            producto_id: producto.id,
            producto_nombre: producto.nombre,
            cantidad: cantidadSeleccionada,
            observacion: observacionProducto
          }
        ]
      })
    }

    // Limpiar selección
    setProductoSeleccionado('')
    setCantidadSeleccionada(1)
    setObservacionProducto('')
  }

  // ============================================
  // ELIMINAR PRODUCTO DEL FORMULARIO
  // ============================================
  const eliminarProductoForm = (producto_id) => {
    setForm({
      ...form,
      productos: form.productos.filter(p => p.producto_id !== producto_id)
    })
  }

  // ============================================
  // ENVIAR FORMULARIO
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.operario) {
      alert('⚠️ Selecciona un operario')
      return
    }

    if (form.productos.length === 0) {
      alert('⚠️ Agrega al menos un producto')
      return
    }

    setCargando(true)

    try {
      const response = await fetch(`${API_URL}/produccion/multiple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operario: form.operario,
          supervisor_id: usuario.id,
          productos: form.productos.map(p => ({
            producto_id: p.producto_id,
            cantidad: p.cantidad,
            observacion: p.observacion || form.observacion_general
          })),
          fecha: form.fecha,
          observacion_general: form.observacion_general,
          sucursal_id: usuario.sucursal_id || 3
        })
      })

      const data = await response.json()

      if (data.success) {
        setMensaje(`✅ ${data.registros?.length || 0} registros de producción creados - Total: ${data.total_productos || 0} unidades`)
        setForm({
          operario: '',
          fecha: new Date().toISOString().split('T')[0],
          observacion_general: '',
          productos: []
        })
        cargarProducciones()
        cargarResumen()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error: ' + (data.error || 'No se pudo guardar'))
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error guardando producción')
    } finally {
      setCargando(false)
    }
  }

  const handleEdit = (produccion) => {
    setEditando(produccion.id)
    setForm({
      operario: produccion.operario || '',
      fecha: produccion.fecha ? produccion.fecha.split('T')[0] : new Date().toISOString().split('T')[0],
      observacion_general: produccion.observacion || '',
      productos: [{
        producto_id: produccion.producto_id,
        producto_nombre: produccion.producto_nombre,
        cantidad: produccion.cantidad,
        observacion: produccion.observacion || ''
      }]
    })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ ¿Estás seguro de eliminar este registro de producción?\n\nEl stock se ajustará automáticamente.')) return

    try {
      const response = await fetch(`${API_URL}/produccion/${id}`, {
        method: 'DELETE'
      })
      const data = await response.json()

      if (data.success) {
        setMensaje('✅ Registro eliminado correctamente')
        cargarProducciones()
        cargarResumen()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error: ' + (data.message || data.error))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al eliminar')
    }
  }

  if (cargando) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Guardando producción...</h2>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <h1>🏭 Producción</h1>

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

      {/* ========================================== */}
      {/* FORMULARIO DE PRODUCCIÓN MÚLTIPLE */}
      {/* ========================================== */}
      {esSupervisor && (
        <div style={{
          border: '2px solid #003b6f',
          borderRadius: '12px',
          padding: '25px',
          marginBottom: '30px',
          backgroundColor: '#f8faff'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>
            {editando ? '✏️ Editar Producción' : '📝 Registrar Producción Múltiple'}
          </h3>

          <form onSubmit={handleSubmit}>
            {/* Operario y Fecha */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Operario *</label>
                <select
                  value={form.operario}
                  onChange={(e) => setForm({ ...form, operario: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                >
                  <option value="">Seleccionar operario</option>
                  {operarios.map(op => (
                    <option key={op.id} value={op.nombre}>{op.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Fecha</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                />
              </div>
            </div>

            {/* Observación general */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Observación General</label>
              <textarea
                value={form.observacion_general}
                onChange={(e) => setForm({ ...form, observacion_general: e.target.value })}
                placeholder="Notas generales para toda la producción..."
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', minHeight: '40px' }}
              />
            </div>

            {/* Agregar productos */}
            <div style={{
              backgroundColor: '#f0f4f8',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#003b6f' }}>➕ Agregar Productos</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Producto</label>
                  <select
                    value={productoSeleccionado}
                    onChange={(e) => setProductoSeleccionado(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                  >
                    <option value="">Seleccionar producto</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={cantidadSeleccionada}
                    onChange={(e) => setCantidadSeleccionada(parseInt(e.target.value) || 1)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Observación</label>
                  <input
                    type="text"
                    value={observacionProducto}
                    onChange={(e) => setObservacionProducto(e.target.value)}
                    placeholder="Nota..."
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={agregarProducto}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      width: '100%'
                    }}
                  >
                    ➕ Agregar
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de productos agregados */}
            {form.productos.length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: '#003b6f' }}>📋 Productos a producir ({form.productos.length})</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#e3f2fd' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Producto</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Cantidad</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.productos.map((p) => (
                      <tr key={p.producto_id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px' }}>{p.producto_nombre}</td>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                          {p.cantidad}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => eliminarProductoForm(p.producto_id)}
                            style={{
                              backgroundColor: '#f44336',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 10px',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                      <td style={{ padding: '8px' }}>TOTAL</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {form.productos.reduce((acc, p) => acc + p.cantidad, 0)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando || form.productos.length === 0}
              style={{
                padding: '12px 30px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: cargando || form.productos.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                opacity: cargando || form.productos.length === 0 ? 0.6 : 1
              }}
            >
              {cargando ? 'Guardando...' : editando ? '✅ Actualizar' : '✅ Guardar Producción'}
            </button>
          </form>
        </div>
      )}

      {/* ========================================== */}
      {/* RESUMEN DE PRODUCCIÓN */}
      {/* ========================================== */}
      <h2>📊 Resumen de producción hoy</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f4f8' }}>
            <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Operario</th>
            <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>Total Producido</th>
          </tr>
        </thead>
        <tbody>
          {resumen.length === 0 ? (
            <tr>
              <td colSpan="2" style={{ padding: '15px', textAlign: 'center', color: '#999' }}>Sin producción hoy</td>
            </tr>
          ) : (
            resumen.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.operario}</td>
                <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>
                  {item.total_producido} unidades
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* ========================================== */}
      {/* HISTORIAL */}
      {/* ========================================== */}
      <h2>📋 Historial de Producción</h2>
      {producciones.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>No hay registros de producción</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {producciones.map((prod) => (
            <div key={prod.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: 'white' }}>
              <h3 style={{ margin: '0 0 5px 0' }}>{prod.producto_nombre || 'Producto sin nombre'}</h3>
              <p><strong>Operario:</strong> {prod.operario || 'N/A'}</p>
              <p><strong>Cantidad:</strong> {prod.cantidad}</p>
              <p><strong>Supervisor:</strong> {prod.supervisor_nombre || 'N/A'}</p>
              <p><strong>Fecha:</strong> {prod.fecha ? new Date(prod.fecha).toLocaleDateString() : 'N/A'}</p>
              {prod.observacion && <p><strong>Observación:</strong> {prod.observacion}</p>}

              {esSupervisor && (
                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleEdit(prod)}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(prod.id)}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              )}
              {!esSupervisor && (
                <p style={{ marginTop: '10px', color: '#999', fontSize: '0.75rem' }}>
                  Solo supervisores pueden editar/eliminar
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}

export default Produccion