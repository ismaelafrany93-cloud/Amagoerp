import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'  // 👈 Importar la URL centralizada

function Clientes() {
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', telefono: '', direccion: '', cedula: '' })

  useEffect(() => {
    cargarClientes()
  }, [])

  const cargarClientes = async () => {
    try {
      const response = await fetch(`${API_URL}/clientes`)  // 👈 Cambiado
      const data = await response.json()
      setClientes(data)
    } catch (error) {
      console.error('Error cargando clientes:', error)
    } finally {
      setCargando(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)

    try {
      const response = await fetch(`${API_URL}/clientes`, {  // 👈 Cambiado
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await response.json()

      if (data.success) {
        alert('✅ Cliente agregado correctamente')
        setForm({ nombre: '', telefono: '', direccion: '', cedula: '' })
        setMostrarForm(false)
        cargarClientes()
      } else {
        alert('❌ Error: ' + (data.error || 'No se pudo agregar'))
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error agregando cliente')
    } finally {
      setCargando(false)
    }
  }

  return (
    <AdminLayout>
      <h1>👤 Clientes</h1>

      <button onClick={() => setMostrarForm(!mostrarForm)} style={{ marginBottom: '20px', padding: '10px 20px', backgroundColor: '#003b6f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}>
        {mostrarForm ? '✕ Cancelar' : '➕ Nuevo Cliente'}
      </button>

      {mostrarForm && (
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#f5f7fb', padding: '25px', borderRadius: '12px', marginBottom: '25px', border: '2px solid #003b6f' }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>Agregar Cliente</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Nombre *</label>
              <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required placeholder="Nombre completo" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Teléfono</label>
              <input type="text" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="809-555-0000" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Dirección</label>
              <input type="text" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Calle, número, sector" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Cédula</label>
              <input type="text" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} placeholder="001-1234567-8" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
            </div>
          </div>
          <button type="submit" disabled={cargando} style={{ marginTop: '15px', padding: '12px 30px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}>{cargando ? 'Guardando...' : '✅ Guardar Cliente'}</button>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#003b6f', color: 'white' }}>
            <th style={{ padding: '12px', textAlign: 'left' }}>Nombre</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Teléfono</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Dirección</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Cédula</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px' }}>{c.nombre}</td>
              <td style={{ padding: '12px' }}>{c.telefono || 'N/A'}</td>
              <td style={{ padding: '12px' }}>{c.direccion || 'N/A'}</td>
              <td style={{ padding: '12px', textAlign: 'center' }}>{c.cedula || 'N/A'}</td>
            </tr>
          ))}
          {clientes.length === 0 && <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>No hay clientes registrados</td></tr>}
        </tbody>
      </table>
    </AdminLayout>
  )
}

export default Clientes