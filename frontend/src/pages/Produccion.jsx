import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Produccion() {
  const [productos, setProductos] = useState([])
  const [producciones, setProducciones] = useState([])
  const [resumen, setResumen] = useState([])
  const [operarios, setOperarios] = useState([])
  const [cargando, setCargando] = useState(false)
  const [mostrarGestionOperarios, setMostrarGestionOperarios] = useState(false)
  const [nuevoOperario, setNuevoOperario] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [editando, setEditando] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  const [form, setForm] = useState({
    producto_id: '',
    operario: '',
    cantidad: 1,
    observacion: '',
    foto: null,
    fecha: new Date().toISOString().split('T')[0]
  })

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const rol = usuario?.rol || ''
  const puedeGestionarOperarios = ['dueno', 'dueño', 'subgerente', 'admin'].includes(rol)
  const esSupervisor = ['supervisor', 'subgerente', 'dueno', 'dueño', 'admin'].includes(rol)

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
      console.log('📦 Producciones cargadas:', data)
      setProducciones(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando producciones:', error)
      setProducciones([])
    }
  }

  const cargarResumen = async () => {
    try {
      const response = await fetch(`${API_URL}/produccion/resumen`)
      const data = await response.json()
      setResumen(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando resumen:', error)
      setResumen([])
    }
  }

  const cargarOperarios = async () => {
    try {
      const response = await fetch(`${API_URL}/operarios`)
      const data = await response.json()
      setOperarios(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando operarios:', error)
      setOperarios([])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)

    const formData = new FormData()
    formData.append('producto_id', form.producto_id)
    formData.append('operario', form.operario)
    formData.append('cantidad', form.cantidad)
    formData.append('observacion', form.observacion)
    formData.append('fecha', form.fecha)

    const usuario = JSON.parse(localStorage.getItem('usuario'))
    formData.append('supervisor_id', usuario.id)

    if (form.foto) formData.append('foto', form.foto)

    try {
      const url = editando ? `${API_URL}/produccion/${editando}` : `${API_URL}/produccion`
      const method = editando ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setMensaje(editando ? '✅ Producción actualizada correctamente' : '✅ Producción registrada correctamente')
        setForm({ producto_id: '', operario: '', cantidad: 1, observacion: '', foto: null, fecha: new Date().toISOString().split('T')[0] })
        setEditando(null)
        setMostrarForm(false)
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
    setForm({
      producto_id: produccion.producto_id || '',
      operario: produccion.operario || '',
      cantidad: produccion.cantidad || 1,
      observacion: produccion.observacion || '',
      foto: null,
      fecha: produccion.fecha ? produccion.fecha.split('T')[0] : new Date().toISOString().split('T')[0]
    })
    setEditando(produccion.id)
    setMostrarForm(true)
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

  const handleAgregarOperario = async (e) => {
    e.preventDefault()
    if (!nuevoOperario.trim()) {
      alert('⚠️ Ingresa un nombre de operario')
      return
    }

    try {
      const response = await fetch(`${API_URL}/operarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoOperario.trim() })
      })

      const data = await response.json()

      if (data.success) {
        setMensaje('✅ Operario agregado correctamente')
        setNuevoOperario('')
        cargarOperarios()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error: ' + (data.message || 'No se pudo agregar'))
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error agregando operario')
    }
  }

  const handleEliminarOperario = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar a "${nombre}"?`)) return

    try {
      const response = await fetch(`${API_URL}/operarios/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setMensaje('✅ Operario eliminado correctamente')
        cargarOperarios()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error eliminando operario')
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error eliminando operario')
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

      {puedeGestionarOperarios && (
        <div style={{
          border: '2px solid #ff9800',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          backgroundColor: '#fff8e1'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#e65100' }}>👷 Gestión de Operarios</h3>
            <button
              onClick={() => setMostrarGestionOperarios(!mostrarGestionOperarios)}
              style={{
                padding: '6px 16px',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {mostrarGestionOperarios ? '✕ Cerrar' : '📋 Gestionar'}
            </button>
          </div>

          {mostrarGestionOperarios && (
            <div style={{ marginTop: '15px' }}>
              <form onSubmit={handleAgregarOperario} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input
                  type="text"
                  value={nuevoOperario}
                  onChange={(e) => setNuevoOperario(e.target.value)}
                  placeholder="Nombre del nuevo operario"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  ✅ Agregar
                </button>
              </form>

              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f0f4f8' }}>
                      <th style={{ padding: '6px', textAlign: 'left' }}>Operario</th>
                      <th style={{ padding: '6px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operarios.map((op) => (
                      <tr key={op.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '6px' }}>{op.nombre}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleEliminarOperario(op.id, op.nombre)}
                            style={{
                              backgroundColor: '#f44336',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '2px 10px',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {esSupervisor && (
        <button
          onClick={() => {
            setMostrarForm(!mostrarForm)
            setEditando(null)
            setForm({ producto_id: '', operario: '', cantidad: 1, observacion: '', foto: null, fecha: new Date().toISOString().split('T')[0] })
          }}
          style={{
            marginBottom: '20px',
            padding: '10px 20px',
            backgroundColor: '#003b6f',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          {mostrarForm ? '✕ Cancelar' : '➕ Nuevo Registro'}
        </button>
      )}

      {mostrarForm && esSupervisor && (
        <div style={{
          border: '2px solid #003b6f',
          borderRadius: '12px',
          padding: '25px',
          marginBottom: '30px',
          backgroundColor: '#f8faff'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>
            {editando ? '✏️ Editar Producción' : '📝 Registrar Producción'}
          </h3>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Producto *</label>
                <select
                  value={form.producto_id}
                  onChange={(e) => setForm({ ...form, producto_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                >
                  <option value="">Seleccionar producto</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Operario *</label>
                <select
                  value={form.operario}
                  onChange={(e) => setForm({ ...form, operario: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                >
                  <option value="">Seleccionar operario</option>
                  {operarios.map(op => (
                    <option key={op.id} value={op.nombre}>{op.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Cantidad *</label>
                <input
                  type="number"
                  min="1"
                  value={form.cantidad}
                  onChange={(e) => setForm({ ...form, cantidad: parseInt(e.target.value) || 1 })}
                  required
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Fecha</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Observación</label>
                <textarea
                  value={form.observacion}
                  onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                  placeholder="Notas sobre esta producción..."
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', minHeight: '50px' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Foto (opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setForm({ ...form, foto: e.target.files[0] })}
                  style={{ width: '100%', padding: '6px 0' }}
                />
                {editando && (
                  <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '5px' }}>
                    Si no seleccionas una nueva foto, se mantiene la actual
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              style={{
                marginTop: '15px',
                padding: '12px 30px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              {cargando ? 'Guardando...' : editando ? '✅ Actualizar' : '✅ Registrar Producción'}
            </button>
          </form>
        </div>
      )}

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
                <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>{item.total_producido} unidades</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h2>📋 Historial de Producción</h2>
      {producciones.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>No hay registros de producción</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {producciones.map((prod) => (
            <div key={prod.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: 'white' }}>
              {prod.foto && (
                <img
                  src={`${API_URL}${prod.foto}`}
                  alt="Producción"
                  style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '6px', marginBottom: '10px' }}
                />
              )}
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