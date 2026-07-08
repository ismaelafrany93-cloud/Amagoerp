import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Inventario() {
  const [productos, setProductos] = useState([])
  const [todosProductos, setTodosProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [form, setForm] = useState({
    producto_id: '',
    stock: 0
  })

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esSucursalPrincipal = usuario.sucursal_id === 1
  const esSubgerente = usuario.rol === 'subgerente' || usuario.rol === 'dueno' || usuario.rol === 'dueño' || usuario.rol === 'admin'
  const esSucursal = usuario.sucursal_id && usuario.sucursal_id > 0

  const sucursalId = usuario.sucursal_id || null
  const esSucursalBani = sucursalId === 2 // Cambia 2 por el ID de Baní

  useEffect(() => {
    cargarInventario()
    if (esSubgerente) {
      cargarTodosProductos()
    }
  }, [])

  const cargarInventario = async () => {
    try {
      let url = `${API_URL}/inventario`
      
      // Si es usuario de sucursal (no principal), filtrar por su sucursal
      if (esSucursal && !esSucursalPrincipal) {
        url = `${API_URL}/inventario?sucursal_id=${sucursalId}`
      }
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setProductos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando inventario:', error)
      setError('Error al cargar el inventario: ' + error.message)
      setProductos([])
    } finally {
      setCargando(false)
    }
  }

  const cargarTodosProductos = async () => {
    try {
      const response = await fetch(`${API_URL}/productos`)
      const data = await response.json()
      setTodosProductos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando productos:', error)
    }
  }

  const handleAgregarProducto = async (e) => {
    e.preventDefault()
    if (!form.producto_id) {
      alert('⚠️ Selecciona un producto')
      return
    }

    setCargando(true)
    try {
      const response = await fetch(`${API_URL}/inventario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: parseInt(form.producto_id),
          sucursal_id: sucursalId || 2, // Si es Baní, usa su ID
          stock: parseInt(form.stock) || 0
        })
      })

      const data = await response.json()
      if (data.success) {
        setMensaje('✅ Producto agregado al inventario de la sucursal')
        setForm({ producto_id: '', stock: 0 })
        setMostrarForm(false)
        cargarInventario()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setMensaje('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setMensaje('❌ Error al agregar producto')
    } finally {
      setCargando(false)
    }
  }

  const handleEliminarProducto = async (productoId) => {
    if (!window.confirm('¿Eliminar este producto del inventario de la sucursal?')) return

    try {
      const response = await fetch(`${API_URL}/inventario/${productoId}?sucursal_id=${sucursalId || 2}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        setMensaje('✅ Producto eliminado de la sucursal')
        cargarInventario()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setMensaje('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setMensaje('❌ Error al eliminar producto')
    }
  }

  const infoSucursal = () => {
    if (esSucursalPrincipal) return '📊 Inventario General - Todas las sucursales'
    if (esSucursal) return `🏢 Inventario - ${usuario.sucursal_nombre || 'Mi Sucursal'}`
    return '📊 Inventario'
  }

  if (cargando) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Cargando inventario...</h2>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>❌ Error</h2>
          <p style={{ color: '#f44336' }}>{error}</p>
          <button 
            onClick={cargarInventario}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#003b6f',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Reintentar
          </button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <h1>📦 {infoSucursal()}</h1>

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

      {/* Mostrar opciones de gestión SOLO para dueño/subgerente */}
      {esSubgerente && !esSucursalPrincipal && (
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #003b6f'
        }}>
          <p style={{ margin: 0, color: '#003b6f' }}>
            🔑 <strong>Gestión de Inventario de {usuario.sucursal_nombre || 'la Sucursal'}</strong>
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#666' }}>
            Solo tú puedes agregar o eliminar productos de esta sucursal
          </p>
        </div>
      )}

      {/* Botón para agregar productos (solo dueño/subgerente de sucursal) */}
      {esSubgerente && !esSucursalPrincipal && (
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
          {mostrarForm ? '✕ Cancelar' : '➕ Agregar Producto a Sucursal'}
        </button>
      )}

      {/* Formulario para agregar producto a la sucursal */}
      {mostrarForm && esSubgerente && !esSucursalPrincipal && (
        <form onSubmit={handleAgregarProducto} style={{
          backgroundColor: '#f5f7fb',
          padding: '25px',
          borderRadius: '12px',
          marginBottom: '25px',
          border: '2px solid #003b6f'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>
            Agregar Producto a {usuario.sucursal_nombre || 'la Sucursal'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Producto *</label>
              <select
                value={form.producto_id}
                onChange={(e) => setForm({ ...form, producto_id: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              >
                <option value="">Seleccionar producto</option>
                {todosProductos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Stock Inicial</label>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
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
            {cargando ? 'Agregando...' : '✅ Agregar Producto'}
          </button>
        </form>
      )}

      {/* Tabla de inventario */}
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
            <th style={{ padding: '12px', textAlign: 'left' }}>Producto</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Categoría</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Stock</th>
            <th style={{ padding: '12px', textAlign: 'right' }}>Precio</th>
            {esSubgerente && !esSucursalPrincipal && (
              <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
            )}
          </tr>
        </thead>
        <tbody>
          {!Array.isArray(productos) || productos.length === 0 ? (
            <tr>
              <td colSpan={esSubgerente && !esSucursalPrincipal ? 6 : 5} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                {esSucursal && !esSucursalPrincipal 
                  ? 'No hay productos en esta sucursal. Agrega productos desde el botón "Agregar Producto a Sucursal"'
                  : 'No hay productos en el inventario'}
              </td>
            </tr>
          ) : (
            productos.map((p) => (
              <tr key={p.id || Math.random()} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{p.id}</td>
                <td style={{ padding: '12px' }}>{p.nombre || 'Sin nombre'}</td>
                <td style={{ padding: '12px' }}>{p.categoria || 'N/A'}</td>
                <td style={{
                  padding: '12px',
                  textAlign: 'center',
                  color: (p.stock || 0) <= 0 ? '#f44336' : (p.stock || 0) <= 5 ? '#ff9800' : '#4CAF50',
                  fontWeight: (p.stock || 0) <= 5 ? 'bold' : 'normal'
                }}>
                  {p.stock || 0}
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  RD$ {Number(p.precio || 0).toFixed(2)}
                </td>
                {esSubgerente && !esSucursalPrincipal && (
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleEliminarProducto(p.id)}
                      style={{
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 12px',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminLayout>
  )
}

export default Inventario