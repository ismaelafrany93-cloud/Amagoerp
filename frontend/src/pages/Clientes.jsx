import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Clientes() {
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    referencia: '',
    es_mayorista: false  // 👈 NUEVO CAMPO
  })

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esSubgerente = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario.rol)
  const sucursalId = usuario?.sucursal_id || null

  useEffect(() => {
    cargarClientes()
  }, [])

  const cargarClientes = async () => {
    try {
      let url = `${API_URL}/clientes`
      if (sucursalId && !esSubgerente) {
        url = `${API_URL}/clientes?sucursal_id=${sucursalId}`
      }
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setClientes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando clientes:', error)
      setMensaje('❌ Error cargando clientes')
      setClientes([])
    } finally {
      setCargando(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setMensaje('')

    try {
      const url = editando ? `${API_URL}/clientes/${editando}` : `${API_URL}/clientes`
      const method = editando ? 'PUT' : 'POST'

      const datosEnviar = {
        nombre: form.nombre,
        telefono: form.telefono || '',
        direccion: form.direccion || '',
        referencia: form.referencia || '',
        sucursal_id: sucursalId,
        es_mayorista: form.es_mayorista || false  // 👈 NUEVO
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosEnviar)
      })

      const data = await response.json()

      if (data.success) {
        setMensaje(editando ? '✅ Cliente actualizado correctamente' : '✅ Cliente creado correctamente')
        setForm({ nombre: '', telefono: '', direccion: '', referencia: '', es_mayorista: false })
        setMostrarForm(false)
        setEditando(null)
        cargarClientes()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setMensaje('❌ Error: ' + (data.message || data.error))
      }
    } catch (error) {
      console.error('Error:', error)
      setMensaje('❌ Error al guardar')
    } finally {
      setCargando(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este cliente?')) return

    try {
      const response = await fetch(`${API_URL}/clientes/${id}`, { method: 'DELETE' })
      const data = await response.json()

      if (data.success) {
        setMensaje('✅ Cliente eliminado')
        cargarClientes()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setMensaje('❌ Error eliminando cliente')
      }
    } catch (error) {
      console.error('Error:', error)
      setMensaje('❌ Error eliminando cliente')
    }
  }

  const handleEdit = (cliente) => {
    setForm({
      nombre: cliente.nombre,
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      referencia: cliente.referencia || '',
      es_mayorista: cliente.es_mayorista || false  // 👈 NUEVO
    })
    setEditando(cliente.id)
    setMostrarForm(true)
  }

  if (cargando) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Cargando clientes...</h2>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <h1>👤 Clientes</h1>

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

      <button
        onClick={() => {
          setMostrarForm(!mostrarForm)
          setEditando(null)
          setForm({ nombre: '', telefono: '', direccion: '', referencia: '', es_mayorista: false })
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
        {mostrarForm ? '✕ Cancelar' : '➕ Nuevo Cliente'}
      </button>

      {mostrarForm && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#f5f7fb',
          padding: '25px',
          borderRadius: '12px',
          marginBottom: '25px',
          border: '2px solid #003b6f'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>
            {editando ? '✏️ Editar Cliente' : '➕ Agregar Cliente'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
                placeholder="Nombre del cliente"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Teléfono</label>
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="809-555-0000"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Dirección</label>
              <input
                type="text"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                placeholder="Calle, número, sector"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Referencia</label>
              <input
                type="text"
                value={form.referencia}
                onChange={(e) => setForm({ ...form, referencia: e.target.value })}
                placeholder="Punto de referencia"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                backgroundColor: form.es_mayorista ? '#e8f5e9' : 'transparent',
                padding: '10px',
                borderRadius: '8px',
                border: form.es_mayorista ? '2px solid #4CAF50' : '2px solid transparent',
                transition: 'all 0.3s'
              }}>
                <input
                  type="checkbox"
                  checked={form.es_mayorista || false}
                  onChange={(e) => setForm({ ...form, es_mayorista: e.target.checked })}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#4CAF50' }}
                />
                <div>
                  <span style={{ fontWeight: 'bold' }}>👑 Cliente Mayorista</span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#666' }}>
                    {form.es_mayorista
                      ? '✅ Siempre aplica precio al por mayor'
                      : 'Marcar si este cliente es mayorista'}
                  </p>
                </div>
              </label>
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
            {cargando ? 'Guardando...' : editando ? '✅ Actualizar Cliente' : '✅ Guardar Cliente'}
          </button>
        </form>
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
              <th style={{ padding: '12px', textAlign: 'left' }}>ID</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Nombre</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Teléfono</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Dirección</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Sucursal</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Tipo</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                  No hay clientes registrados
                </td>
              </tr>
            ) : (
              clientes.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{c.id}</td>
                  <td style={{ padding: '12px' }}>{c.nombre}</td>
                  <td style={{ padding: '12px' }}>{c.telefono || 'N/A'}</td>
                  <td style={{ padding: '12px' }}>{c.direccion || 'N/A'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {c.sucursal_nombre || 'Sin sucursal'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {c.es_mayorista ? (
                      <span style={{
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '0.8rem'
                      }}>
                        👑 Mayorista
                      </span>
                    ) : (
                      <span style={{
                        backgroundColor: '#757575',
                        color: 'white',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '0.8rem'
                      }}>
                        Normal
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleEdit(c)}
                      style={{
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 10px',
                        cursor: 'pointer',
                        marginRight: '5px'
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      style={{
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 10px',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️
                    </button>
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

export default Clientes