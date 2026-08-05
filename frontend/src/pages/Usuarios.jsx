import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [areas, setAreas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [form, setForm] = useState({
    nombre: '',
    correo: '',
    password: '',
    rol: 'vendedor',
    sucursal_id: '',
    area_id: ''
  })

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario.rol)

  useEffect(() => {
    cargarUsuarios()
    cargarSucursales()
    cargarAreas()
  }, [])

  const cargarUsuarios = async () => {
    try {
      const response = await fetch(`${API_URL}/usuarios`)
      const data = await response.json()
      setUsuarios(data)
    } catch (error) {
      console.error('Error cargando usuarios:', error)
    } finally {
      setCargando(false)
    }
  }

  const cargarSucursales = async () => {
    try {
      const response = await fetch(`${API_URL}/sucursales`)
      const data = await response.json()
      setSucursales(data)
    } catch (error) {
      console.error('Error cargando sucursales:', error)
    }
  }

  const cargarAreas = async () => {
    try {
      const response = await fetch(`${API_URL}/usuarios/areas`)
      const data = await response.json()
      setAreas(data)
    } catch (error) {
      console.error('Error cargando áreas:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setMensaje('')

    try {
      const url = editando ? `${API_URL}/usuarios/${editando}` : `${API_URL}/usuarios`
      const method = editando ? 'PUT' : 'POST'

      const datosEnviar = {
        nombre: form.nombre,
        correo: form.correo,
        rol: form.rol,
        sucursal_id: form.sucursal_id || null,
        area_id: form.area_id || null
      }

      if (form.password) {
        datosEnviar.password = form.password
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosEnviar)
      })

      const data = await response.json()

      if (data.success) {
        setMensaje(editando ? '✅ Usuario actualizado correctamente' : '✅ Usuario creado correctamente')
        setForm({ nombre: '', correo: '', password: '', rol: 'vendedor', sucursal_id: '', area_id: '' })
        setMostrarForm(false)
        setEditando(null)
        cargarUsuarios()
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
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return

    try {
      const response = await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE' })
      const data = await response.json()

      if (data.success) {
        setMensaje('✅ Usuario eliminado')
        cargarUsuarios()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setMensaje('❌ Error eliminando usuario')
      }
    } catch (error) {
      console.error('Error:', error)
      setMensaje('❌ Error eliminando usuario')
    }
  }

  const handleReset = async (id) => {
    if (!window.confirm('¿Resetear contraseña a 123456?')) return

    try {
      const response = await fetch(`${API_URL}/usuarios/${id}/resetear`, { method: 'PUT' })
      const data = await response.json()

      if (data.success) {
        setMensaje('✅ Contraseña reseteada a 123456')
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setMensaje('❌ Error reseteando contraseña')
      }
    } catch (error) {
      console.error('Error:', error)
      setMensaje('❌ Error reseteando contraseña')
    }
  }

  const handleEdit = (usuario) => {
    setForm({
      nombre: usuario.nombre,
      correo: usuario.correo,
      password: '',
      rol: usuario.rol,
      sucursal_id: usuario.sucursal_id || '',
      area_id: usuario.area_id || ''
    })
    setEditando(usuario.id)
    setMostrarForm(true)
  }

  const getAreaNombre = (areaId) => {
    const area = areas.find(a => a.id === parseInt(areaId))
    return area ? area.nombre : 'Sin área'
  }

  const getAreaIcono = (areaId) => {
    const area = areas.find(a => a.id === parseInt(areaId))
    return area ? area.icono : '🏭'
  }

  if (cargando) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Cargando usuarios...</h2>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <h1>👥 Usuarios</h1>

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

      {esAdmin && (
        <button
          onClick={() => {
            setMostrarForm(!mostrarForm)
            setEditando(null)
            setForm({ nombre: '', correo: '', password: '', rol: 'vendedor', sucursal_id: '', area_id: '' })
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
          {mostrarForm ? '✕ Cancelar' : '➕ Nuevo Usuario'}
        </button>
      )}

      {mostrarForm && esAdmin && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#f5f7fb',
          padding: '25px',
          borderRadius: '12px',
          marginBottom: '25px',
          border: '2px solid #003b6f'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>
            {editando ? '✏️ Editar Usuario' : '➕ Agregar Usuario'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
                placeholder="Nombre completo"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Correo *</label>
              <input
                type="email"
                value={form.correo}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
                required
                placeholder="usuario@amago.com"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>
                {editando ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editando}
                placeholder={editando ? 'Dejar vacío para mantener' : 'Mínimo 4 caracteres'}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Rol *</label>
              <select
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              >
                <option value="vendedor">👤 Vendedor</option>
                <option value="supervisor">🏭 Supervisor</option>
                <option value="chofer">🚚 Chofer</option>
                <option value="subgerente">📊 Subgerente</option>
                <option value="dueno">👑 Dueño</option>
                <option value="admin">🛡️ Admin</option>
                <option value="operario">🔧 Operario</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Sucursal</label>
              <select
                value={form.sucursal_id}
                onChange={(e) => setForm({ ...form, sucursal_id: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              >
                <option value="">Sin sucursal</option>
                {sucursales.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
              <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '5px' }}>
                ⚠️ Si el usuario no tiene sucursal, no verá el menú completo
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>🏷️ Área (solo para Supervisores)</label>
              <select
                value={form.area_id}
                onChange={(e) => setForm({ ...form, area_id: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              >
                <option value="">Sin área</option>
                {areas.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.icono || '🏭'} {a.nombre}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '0.75rem', color: '#ff9800', marginTop: '5px' }}>
                ⚠️ Los supervisores deben tener un área asignada para ver sus productos
              </p>
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
            {cargando ? 'Guardando...' : editando ? '✅ Actualizar Usuario' : '✅ Guardar Usuario'}
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
              <th style={{ padding: '12px', textAlign: 'left' }}>Correo</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Rol</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>🏷️ Área</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Sucursal</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                  No hay usuarios registrados
                </td>
              </tr>
            ) : (
              usuarios.map((u) => {
                const esSupervisor = u.rol === 'supervisor'
                return (
                  <tr key={u.id} style={{ 
                    borderBottom: '1px solid #eee',
                    backgroundColor: esSupervisor && !u.area_id ? '#fff8e1' : 'white'
                  }}>
                    <td style={{ padding: '12px' }}>{u.id}</td>
                    <td style={{ padding: '12px' }}>{u.nombre}</td>
                    <td style={{ padding: '12px' }}>{u.correo}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: u.rol === 'dueno' ? '#d32f2f' :
                                       u.rol === 'admin' ? '#6a1b9a' :
                                       u.rol === 'subgerente' ? '#003b6f' :
                                       u.rol === 'supervisor' ? '#ff9800' :
                                       u.rol === 'chofer' ? '#4CAF50' :
                                       u.rol === 'operario' ? '#795548' : '#757575',
                        color: 'white',
                        padding: '2px 12px',
                        borderRadius: '12px',
                        fontSize: '0.8rem'
                      }}>
                        {u.rol}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {esSupervisor ? (
                        u.area_id ? (
                          <span style={{
                            backgroundColor: '#e3f2fd',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            color: '#003b6f'
                          }}>
                            {getAreaIcono(u.area_id)} {getAreaNombre(u.area_id)}
                          </span>
                        ) : (
                          <span style={{ color: '#ff9800', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            ⚠️ Sin área
                          </span>
                        )
                      ) : (
                        <span style={{ color: '#999', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {u.sucursal_nombre || u.sucursal || (
                        <span style={{ color: '#f44336', fontWeight: 'bold' }}>⚠️ Sin sucursal</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {esAdmin && (
                        <>
                          <button
                            onClick={() => handleEdit(u)}
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
                            onClick={() => handleReset(u.id)}
                            style={{
                              backgroundColor: '#ff9800',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 10px',
                              cursor: 'pointer',
                              marginRight: '5px'
                            }}
                          >
                            🔑
                          </button>
                          {u.id !== usuario.id && (
                            <button
                              onClick={() => handleDelete(u.id)}
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
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}

export default Usuarios