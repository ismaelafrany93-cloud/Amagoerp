import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'

function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({
    nombre: '',
    correo: '',
    password: '',
    rol: 'vendedor',
    sucursal: ''
  })

  useEffect(() => {
    cargarUsuarios()
  }, [])

  const cargarUsuarios = async () => {
    try {
      const response = await fetch('http://localhost:5000/usuarios')
      const data = await response.json()
      setUsuarios(data)
    } catch (error) {
      console.error('Error cargando usuarios:', error)
    } finally {
      setCargando(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)

    try {
      const url = editando ? `http://localhost:5000/usuarios/${editando}` : 'http://localhost:5000/usuarios'
      const method = editando ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await response.json()

      if (data.success) {
        alert(editando ? '✅ Usuario actualizado' : '✅ Usuario creado')
        setForm({ nombre: '', correo: '', password: '', rol: 'vendedor', sucursal: '' })
        setMostrarForm(false)
        setEditando(null)
        cargarUsuarios()
      } else {
        alert('❌ Error: ' + (data.message || data.error))
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error guardando usuario')
    } finally {
      setCargando(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return

    try {
      const response = await fetch(`http://localhost:5000/usuarios/${id}`, { method: 'DELETE' })
      const data = await response.json()

      if (data.success) {
        alert('✅ Usuario eliminado')
        cargarUsuarios()
      } else {
        alert('❌ Error eliminando usuario')
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error eliminando usuario')
    }
  }

  const handleReset = async (id) => {
    if (!window.confirm('¿Resetear contraseña a 123456?')) return

    try {
      const response = await fetch(`http://localhost:5000/usuarios/${id}/resetear`, { method: 'PUT' })
      const data = await response.json()

      if (data.success) {
        alert('✅ Contraseña reseteada a 123456')
      } else {
        alert('❌ Error reseteando contraseña')
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error reseteando contraseña')
    }
  }

  const handleEdit = (usuario) => {
    setForm({
      nombre: usuario.nombre,
      correo: usuario.correo,
      password: '',
      rol: usuario.rol,
      sucursal: usuario.sucursal || ''
    })
    setEditando(usuario.id)
    setMostrarForm(true)
  }

  return (
    <AdminLayout>
      <h1>👥 Usuarios</h1>

      <button onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm({ nombre: '', correo: '', password: '', rol: 'vendedor', sucursal: '' }) }} style={{ marginBottom: '20px', padding: '10px 20px', backgroundColor: '#003b6f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}>
        {mostrarForm ? '✕ Cancelar' : '➕ Nuevo Usuario'}
      </button>

      {mostrarForm && (
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#f5f7fb', padding: '25px', borderRadius: '12px', marginBottom: '25px', border: '2px solid #003b6f' }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>{editando ? '✏️ Editar Usuario' : '➕ Agregar Usuario'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Nombre *</label>
              <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required placeholder="Nombre completo" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Correo *</label>
              <input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} required placeholder="usuario@amago.com" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>{editando ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editando} placeholder={editando ? 'Dejar vacío para mantener' : 'Mínimo 4 caracteres'} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Rol *</label>
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
                <option value="vendedor">👤 Vendedor</option>
                <option value="supervisor">🏭 Supervisor</option>
                <option value="chofer">🚚 Chofer</option>
                <option value="subgerente">📊 Subgerente</option>
                <option value="dueno">👑 Dueño</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Sucursal</label>
              <input type="text" value={form.sucursal} onChange={(e) => setForm({ ...form, sucursal: e.target.value })} placeholder="Ej: Sucursal Norte" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
            </div>
          </div>
          <button type="submit" disabled={cargando} style={{ marginTop: '15px', padding: '12px 30px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}>{cargando ? 'Guardando...' : editando ? '✅ Actualizar Usuario' : '✅ Guardar Usuario'}</button>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#003b6f', color: 'white' }}>
            <th style={{ padding: '12px', textAlign: 'left' }}>ID</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Nombre</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Correo</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Rol</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Sucursal</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px' }}>{u.id}</td>
              <td style={{ padding: '12px' }}>{u.nombre}</td>
              <td style={{ padding: '12px' }}>{u.correo}</td>
              <td style={{ padding: '12px', textAlign: 'center' }}>
                <span style={{ backgroundColor: u.rol === 'dueno' ? '#d32f2f' : u.rol === 'subgerente' ? '#003b6f' : u.rol === 'supervisor' ? '#ff9800' : u.rol === 'chofer' ? '#4CAF50' : '#757575', color: 'white', padding: '2px 12px', borderRadius: '12px', fontSize: '0.8rem' }}>{u.rol}</span>
              </td>
              <td style={{ padding: '12px', textAlign: 'center' }}>{u.sucursal || '-'}</td>
              <td style={{ padding: '12px', textAlign: 'center' }}>
                <button onClick={() => handleEdit(u)} style={{ backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', marginRight: '5px' }}>✏️</button>
                <button onClick={() => handleReset(u.id)} style={{ backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', marginRight: '5px' }}>🔑</button>
                <button onClick={() => handleDelete(u.id)} style={{ backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer' }}>🗑️</button>
              </td>
            </tr>
          ))}
          {usuarios.length === 0 && <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>No hay usuarios registrados</td></tr>}
        </tbody>
      </table>
    </AdminLayout>
  )
}

export default Usuarios