import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Materiales() {
  const [materiales, setMateriales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    unidad: 'unidades',
    stock: 0,
    stock_minimo: 0
  })

  useEffect(() => {
    cargarMateriales()
  }, [])

  const cargarMateriales = async () => {
    try {
      const response = await fetch(`${API_URL}/materiales`)
      const data = await response.json()
      setMateriales(data)
    } catch (error) {
      console.error('Error cargando materiales:', error)
    } finally {
      setCargando(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)

    try {
      const response = await fetch(`${API_URL}/materiales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await response.json()

      if (data.success) {
        alert('✅ Material agregado correctamente')
        setForm({ nombre: '', unidad: 'unidades', stock: 0, stock_minimo: 0 })
        setMostrarForm(false)
        cargarMateriales()
      } else {
        alert('❌ Error: ' + (data.error || 'No se pudo agregar'))
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error agregando material')
    } finally {
      setCargando(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este material?')) return

    try {
      const response = await fetch(`${API_URL}/materiales/${id}`, {
        method: 'DELETE'
      })
      const data = await response.json()

      if (data.success) {
        alert('✅ Material eliminado')
        cargarMateriales()
      } else {
        alert('❌ Error eliminando material')
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error eliminando material')
    }
  }

  return (
    <AdminLayout>
      <h1>🔧 Materiales</h1>

      <button
        onClick={() => setMostrarForm(!mostrarForm)}
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
        {mostrarForm ? '✕ Cancelar' : '➕ Nuevo Material'}
      </button>

      {mostrarForm && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#f5f7fb',
          padding: '25px',
          borderRadius: '12px',
          marginBottom: '25px',
          border: '2px solid #003b6f'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>Agregar Material</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
                placeholder="Ej: Puertas"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Unidad</label>
              <input
                type="text"
                value={form.unidad}
                onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                placeholder="unidades, litros, kg"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Stock Inicial</label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
                placeholder="0"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Stock Mínimo</label>
              <input
                type="number"
                value={form.stock_minimo}
                onChange={(e) => setForm({ ...form, stock_minimo: parseInt(e.target.value) || 0 })}
                placeholder="0"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
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
            {cargando ? 'Guardando...' : '✅ Guardar Material'}
          </button>
        </form>
      )}

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
            <th style={{ padding: '12px', textAlign: 'left' }}>ID</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Nombre</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Unidad</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Stock</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Stock Mínimo</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {materiales.map((m) => (
            <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px' }}>{m.id}</td>
              <td style={{ padding: '12px' }}>{m.nombre}</td>
              <td style={{ padding: '12px', textAlign: 'center' }}>{m.unidad || 'unidades'}</td>
              <td style={{
                padding: '12px',
                textAlign: 'center',
                color: (m.stock || 0) <= (m.stock_minimo || 0) ? '#f44336' : '#4CAF50',
                fontWeight: (m.stock || 0) <= (m.stock_minimo || 0) ? 'bold' : 'normal'
              }}>
                {m.stock || 0}
              </td>
              <td style={{ padding: '12px', textAlign: 'center' }}>{m.stock_minimo || 0}</td>
              <td style={{ padding: '12px', textAlign: 'center' }}>
                <button
                  onClick={() => handleDelete(m.id)}
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
          ))}
          {materiales.length === 0 && (
            <tr>
              <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                No hay materiales registrados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </AdminLayout>
  )
}

export default Materiales