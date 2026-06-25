import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Productos() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    categoria: '',
    descripcion: '',
    precio: '',
    stock: ''
  })

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const rol = usuario?.rol || ''
  const puedeEditar = ['dueno', 'dueño', 'subgerente', 'supervisor'].includes(rol)

  useEffect(() => {
    cargarProductos()
  }, [])

  const cargarProductos = async () => {
    try {
      const response = await fetch(`${API_URL}/productos`)
      const data = await response.json()
      setProductos(data)
    } catch (error) {
      console.error('Error cargando productos:', error)
    } finally {
      setCargando(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)

    try {
      const response = await fetch(`${API_URL}/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          categoria: form.categoria,
          descripcion: form.descripcion,
          precio: parseFloat(form.precio) || 0,
          stock: parseInt(form.stock) || 0
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('✅ Producto agregado correctamente')
        setForm({ nombre: '', categoria: '', descripcion: '', precio: '', stock: '' })
        setMostrarForm(false)
        cargarProductos()
      } else {
        alert('❌ Error: ' + (data.error || 'No se pudo agregar'))
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error agregando producto')
    } finally {
      setCargando(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return

    try {
      const response = await fetch(`${API_URL}/productos/${id}`, {
        method: 'DELETE'
      })
      const data = await response.json()

      if (data.success) {
        alert('✅ Producto eliminado')
        cargarProductos()
      } else {
        alert('❌ Error eliminando producto')
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error eliminando producto')
    }
  }

  return (
    <AdminLayout>
      <h1>📦 Productos</h1>

      {puedeEditar && (
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
          {mostrarForm ? '✕ Cancelar' : '➕ Nuevo Producto'}
        </button>
      )}

      {!puedeEditar && (
        <p style={{ color: '#999', marginBottom: '20px' }}>
          👁️ Solo lectura. Contacta al administrador para agregar o eliminar productos.
        </p>
      )}

      {mostrarForm && (
        <form onSubmit={handleSubmit} style={{ 
          backgroundColor: '#f5f7fb', 
          padding: '25px', 
          borderRadius: '12px', 
          marginBottom: '25px', 
          border: '2px solid #003b6f' 
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>Agregar Producto</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Nombre *</label>
              <input 
                type="text" 
                value={form.nombre} 
                onChange={(e) => setForm({ ...form, nombre: e.target.value })} 
                required 
                placeholder="Ej: Credencia 2 puertas" 
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Categoría</label>
              <input 
                type="text" 
                value={form.categoria} 
                onChange={(e) => setForm({ ...form, categoria: e.target.value })} 
                placeholder="Ej: Credencias" 
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} 
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Descripción</label>
              <textarea 
                value={form.descripcion} 
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })} 
                placeholder="Descripción del producto..." 
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', minHeight: '50px' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Precio (RD$)</label>
              <input 
                type="number" 
                step="0.01" 
                value={form.precio} 
                onChange={(e) => setForm({ ...form, precio: e.target.value })} 
                placeholder="0.00" 
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Stock Inicial</label>
              <input 
                type="number" 
                value={form.stock} 
                onChange={(e) => setForm({ ...form, stock: e.target.value })} 
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
            {cargando ? 'Guardando...' : '✅ Guardar Producto'}
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
            <th style={{ padding: '12px', textAlign: 'left' }}>Categoría</th>
            <th style={{ padding: '12px', textAlign: 'right' }}>Precio</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Stock</th>
            {puedeEditar && <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px' }}>{p.id}</td>
              <td style={{ padding: '12px' }}>{p.nombre}</td>
              <td style={{ padding: '12px' }}>{p.categoria || 'N/A'}</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>RD$ {Number(p.precio).toFixed(2)}</td>
              <td style={{ 
                padding: '12px', 
                textAlign: 'center',
                color: (p.stock || 0) <= 0 ? '#f44336' : (p.stock || 0) <= 5 ? '#ff9800' : '#4CAF50',
                fontWeight: (p.stock || 0) <= 5 ? 'bold' : 'normal'
              }}>
                {p.stock || 0}
              </td>
              {puedeEditar && (
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button 
                    onClick={() => handleDelete(p.id)} 
                    style={{ 
                      backgroundColor: '#f44336', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      padding: '4px 12px', 
                      cursor: 'pointer' 
                    }}
                  >
                    🗑️
                  </button>
                </td>
              )}
            </tr>
          ))}
          {productos.length === 0 && (
            <tr>
              <td colSpan={puedeEditar ? 6 : 5} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                No hay productos registrados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </AdminLayout>
  )
}

export default Productos