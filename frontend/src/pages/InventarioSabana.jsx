import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function InventarioSabana() {
  const [productos, setProductos] = useState([])
  const [todosProductos, setTodosProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [form, setForm] = useState({
    producto_id: '',
    stock: 0,
    precio: '',
    precio_mayor: '',
    cantidad_mayor: ''
  })

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esSubgerente = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario.rol)
  const SUCURSAL_SABANA_ID = 2

  useEffect(() => {
    cargarInventarioSabana()
    if (esSubgerente) {
      cargarTodosProductos()
    }
  }, [])

  const cargarInventarioSabana = async () => {
    try {
      const response = await fetch(`${API_URL}/inventario?sucursal_id=${SUCURSAL_SABANA_ID}`)
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setProductos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando inventario de Sabana:', error)
      setError('Error al cargar el inventario de Sabana: ' + error.message)
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
          sucursal_id: SUCURSAL_SABANA_ID,
          stock: parseInt(form.stock) || 0,
          precio: parseFloat(form.precio) || 0,
          precio_mayor: parseFloat(form.precio_mayor) || null,
          cantidad_mayor: parseInt(form.cantidad_mayor) || 0
        })
      })

      const data = await response.json()
      if (data.success) {
        setMensaje('✅ Producto agregado al inventario de Sabana')
        setForm({ producto_id: '', stock: 0, precio: '', precio_mayor: '', cantidad_mayor: '' })
        setMostrarForm(false)
        cargarInventarioSabana()
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
    if (!window.confirm('¿Eliminar este producto del inventario de Sabana?')) return

    try {
      const response = await fetch(`${API_URL}/inventario/${productoId}?sucursal_id=${SUCURSAL_SABANA_ID}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        setMensaje('✅ Producto eliminado de Sabana')
        cargarInventarioSabana()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setMensaje('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setMensaje('❌ Error al eliminar producto')
    }
  }

  if (cargando) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Cargando inventario de Sabana...</h2>
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
            onClick={cargarInventarioSabana}
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
      <h1>🏢 Inventario - Sabana</h1>

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
        backgroundColor: '#e3f2fd',
        padding: '10px 15px',
        borderRadius: '8px',
        marginBottom: '20px',
        borderLeft: '4px solid #003b6f'
      }}>
        <p style={{ margin: 0, color: '#003b6f' }}>
          📦 Inventario exclusivo de la sucursal de Sabana
        </p>
        {esSubgerente && (
          <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#666' }}>
            🔑 Puedes agregar o eliminar productos desde aquí
          </p>
        )}
        <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#666' }}>
          🔄 Las transferencias recibidas actualizan el stock automáticamente
        </p>
      </div>

      {/* 👇 BOTÓN PARA AGREGAR PRODUCTOS (SOLO SUBGERENTE/DUEÑO) */}
      {esSubgerente && (
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
          {mostrarForm ? '✕ Cancelar' : '➕ Agregar Producto a Sabana'}
        </button>
      )}

      {/* 👇 FORMULARIO PARA AGREGAR PRODUCTO */}
      {mostrarForm && esSubgerente && (
        <form onSubmit={handleAgregarProducto} style={{
          backgroundColor: '#f5f7fb',
          padding: '25px',
          borderRadius: '12px',
          marginBottom: '25px',
          border: '2px solid #003b6f'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>
            Agregar Producto a Sabana
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
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Precio Normal (RD$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
                placeholder="0.00"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Precio Mayor (RD$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.precio_mayor}
                onChange={(e) => setForm({ ...form, precio_mayor: e.target.value })}
                placeholder="0.00"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Cantidad Mínima para Mayor</label>
              <input
                type="number"
                min="0"
                value={form.cantidad_mayor}
                onChange={(e) => setForm({ ...form, cantidad_mayor: e.target.value })}
                placeholder="10"
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
            <th style={{ padding: '12px', textAlign: 'right' }}>Precio Normal</th>
            <th style={{ padding: '12px', textAlign: 'right' }}>Precio Mayor</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Cant. Mín.</th>
            {esSubgerente && (
              <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
            )}
          </tr>
        </thead>
        <tbody>
          {!Array.isArray(productos) || productos.length === 0 ? (
            <tr>
              <td colSpan={esSubgerente ? 8 : 7} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                No hay productos en el inventario de Sabana
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
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {p.precio_mayor ? `RD$ ${Number(p.precio_mayor).toFixed(2)}` : 'N/A'}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {p.cantidad_mayor || 0}
                </td>
                {esSubgerente && (
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

export default InventarioSabana