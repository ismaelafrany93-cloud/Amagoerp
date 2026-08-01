import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Inventario({ sucursalId: propSucursalId, sucursalNombre: propSucursalNombre }) {

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
  const rol = usuario?.rol || ''
  
  const esSubgerente = ['dueno', 'dueño', 'subgerente', 'admin'].includes(rol)
  const esVendedor = ['vendedor', 'vendedora'].includes(rol)
  
  const esSucursalPrincipal = usuario.sucursal_id === 3
  const esSucursal = usuario.sucursal_id && usuario.sucursal_id > 0

  const sucursalId = propSucursalId || usuario.sucursal_id || 3
  const sucursalNombre = propSucursalNombre || usuario.sucursal_nombre || 'Principal'
  const esPrincipal = sucursalId === 3

  const puedeEditar = esSubgerente
  const puedeVer = true

  // 👇 ESTADOS PARA EDICIÓN EN LÍNEA
  const [editandoPrecio, setEditandoPrecio] = useState(null)
  const [editandoStock, setEditandoStock] = useState(null)

  useEffect(() => {
    cargarInventario()
    if (esSubgerente) {
      cargarTodosProductos()
    }
  }, [sucursalId])

  const cargarInventario = async () => {
    setCargando(true)
    setError('')
    try {
      const idSucursal = sucursalId || usuario.sucursal_id || 3
      const url = `${API_URL}/inventario?sucursal_id=${idSucursal}`
      
      console.log('📊 Cargando inventario desde:', url)
      
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

  // 👇 ACTUALIZAR PRECIO EN LÍNEA
  const actualizarPrecio = async (productoId, nuevoPrecio) => {
    if (!puedeEditar) {
      alert('⛔ No tienes permisos para editar precios')
      return
    }

    if (esPrincipal) {
      alert('⚠️ No se puede modificar el precio en la sucursal Principal')
      return
    }

    if (nuevoPrecio < 0) {
      alert('⚠️ El precio no puede ser negativo')
      return
    }

    try {
      const response = await fetch(`${API_URL}/inventario/precio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productoId,
          sucursal_id: sucursalId,
          precio_venta: nuevoPrecio
        })
      })

      const data = await response.json()
      if (data.success) {
        setMensaje('✅ Precio actualizado correctamente')
        cargarInventario()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error actualizando precio')
    }
  }

  // 👇 ACTUALIZAR STOCK EN LÍNEA
  const actualizarStock = async (productoId, nuevoStock) => {
    if (!puedeEditar) {
      alert('⛔ No tienes permisos para editar stock')
      return
    }

    if (nuevoStock < 0) {
      alert('⚠️ El stock no puede ser negativo')
      return
    }

    try {
      const response = await fetch(`${API_URL}/inventario/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productoId,
          sucursal_id: sucursalId,
          stock: nuevoStock
        })
      })

      const data = await response.json()
      if (data.success) {
        setMensaje('✅ Stock actualizado correctamente')
        cargarInventario()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error actualizando stock')
    }
  }

  const handleAgregarProducto = async (e) => {
    e.preventDefault()
    
    if (!puedeEditar) {
      alert('⛔ No tienes permisos para agregar productos')
      return
    }

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
          sucursal_id: sucursalId || 3,
          stock: parseInt(form.stock) || 0,
          precio: parseFloat(form.precio) || 0,
          precio_mayor: parseFloat(form.precio_mayor) || null,
          cantidad_mayor: parseInt(form.cantidad_mayor) || 0
        })
      })

      const data = await response.json()
      if (data.success) {
        setMensaje('✅ Producto agregado al inventario de la sucursal')
        setForm({ producto_id: '', stock: 0, precio: '', precio_mayor: '', cantidad_mayor: '' })
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
    if (!puedeEditar) {
      alert('⛔ No tienes permisos para eliminar productos')
      return
    }

    if (esPrincipal) {
      alert('⚠️ No se puede eliminar productos de la sucursal Principal')
      return
    }

    if (!window.confirm('¿Eliminar este producto del inventario de la sucursal?')) return

    try {
      const response = await fetch(`${API_URL}/inventario/${productoId}?sucursal_id=${sucursalId || 3}`, {
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
    if (sucursalId === 3) return '📊 Inventario General - Principal'
    if (sucursalId === 1) return '🏢 Inventario - Baní'
    if (sucursalId === 2) return '🏢 Inventario - Sabana'
    return `🏢 Inventario - ${sucursalNombre}`
  }

  const getPermisoMensaje = () => {
    if (!puedeEditar && sucursalId && sucursalId !== 3) {
      return '🔒 Solo el Dueño, Subgerente o Administrador puede modificar el inventario de esta sucursal'
    }
    return null
  }

  const formatearPrecio = (precio) => {
    return `RD$ ${Number(precio).toFixed(2)}`
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

      {getPermisoMensaje() && (
        <div style={{
          backgroundColor: '#fff3e0',
          padding: '12px 20px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #ff9800',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '1.5rem' }}>🔒</span>
          <div>
            <p style={{ margin: 0, color: '#e65100', fontWeight: 'bold' }}>
              {getPermisoMensaje()}
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#666' }}>
              Puedes ver los productos, pero no agregar, editar ni eliminar
            </p>
          </div>
        </div>
      )}

      {esSubgerente && sucursalId && sucursalId !== 3 && puedeEditar && (
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #003b6f'
        }}>
          <p style={{ margin: 0, color: '#003b6f' }}>
            🔑 <strong>Gestión de Inventario de {sucursalNombre}</strong>
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#666' }}>
            Los precios que configures aquí son exclusivos para esta sucursal
          </p>
        </div>
      )}

      {esSubgerente && sucursalId && sucursalId !== 3 && puedeEditar && (
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

      {mostrarForm && esSubgerente && sucursalId && sucursalId !== 3 && puedeEditar && (
        <form onSubmit={handleAgregarProducto} style={{
          backgroundColor: '#f5f7fb',
          padding: '25px',
          borderRadius: '12px',
          marginBottom: '25px',
          border: '2px solid #003b6f'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>
            Agregar Producto a {sucursalNombre}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Producto *</label>
              <select
                value={form.producto_id}
                onChange={(e) => {
                  const id = e.target.value
                  const producto = todosProductos.find(p => p.id === parseInt(id))
                  setForm({ 
                    ...form, 
                    producto_id: id,
                    precio: producto?.precio || '',
                    precio_mayor: producto?.precio_mayor || '',
                    cantidad_mayor: producto?.cantidad_mayor || ''
                  })
                }}
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
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Precio Normal (RD$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
                required
                placeholder="0.00"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
              <p style={{ fontSize: '0.7rem', color: '#4CAF50', marginTop: '3px' }}>
                💰 Precio específico para esta sucursal
              </p>
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

      {/* CONTADOR DE PRODUCTOS */}
      <div style={{
        marginBottom: '15px',
        padding: '10px 15px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <span>
          <strong>Total productos:</strong> {productos.length}
        </span>
        {!esPrincipal && (
          <span>
            <strong>Sin precio:</strong> {productos.filter(p => (p.precio_venta || 0) === 0).length}
          </span>
        )}
        <span>
          <strong>Stock total:</strong> {productos.reduce((acc, p) => acc + (p.stock || 0), 0)}
        </span>
      </div>

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
            <th style={{ padding: '12px', textAlign: 'center' }}>Precio</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Precio Mayor</th>
            {esSubgerente && sucursalId && sucursalId !== 3 && puedeEditar && (
              <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
            )}
          </tr>
        </thead>
        <tbody>
          {!Array.isArray(productos) || productos.length === 0 ? (
            <tr>
              <td colSpan={esSubgerente && sucursalId && sucursalId !== 3 && puedeEditar ? 7 : 6} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                {sucursalId && sucursalId !== 3
                  ? `No hay productos en ${sucursalNombre}.`
                  : 'No hay productos en el inventario'}
              </td>
            </tr>
          ) : (
            productos.map((p) => {
              const precioEsCero = (p.precio_venta || p.precio || 0) === 0
              const stockEsCero = (p.stock || 0) === 0
              const esEditable = puedeEditar && !esPrincipal
              
              return (
                <tr key={p.id || Math.random()} style={{ 
                  borderBottom: '1px solid #eee',
                  backgroundColor: esPrincipal ? 'white' : (precioEsCero ? '#fff8e1' : 'white')
                }}>
                  <td style={{ padding: '12px' }}>{p.id}</td>
                  <td style={{ padding: '12px' }}>{p.nombre || 'Sin nombre'}</td>
                  <td style={{ padding: '12px' }}>{p.categoria || 'N/A'}</td>
                  
                  {/* 👇 STOCK EDITABLE */}
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {esEditable ? (
                      <input
                        type="number"
                        min="0"
                        value={p.stock || 0}
                        onChange={(e) => {
                          const nuevoStock = parseInt(e.target.value) || 0
                          if (nuevoStock >= 0) {
                            actualizarStock(p.id, nuevoStock)
                          }
                        }}
                        style={{
                          width: '70px',
                          padding: '4px 8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          textAlign: 'center',
                          backgroundColor: stockEsCero ? '#fff3e0' : 'white'
                        }}
                      />
                    ) : (
                      <span style={{ 
                        color: stockEsCero ? '#f44336' : '#333',
                        fontWeight: stockEsCero ? 'bold' : 'normal'
                      }}>
                        {p.stock || 0}
                      </span>
                    )}
                    {stockEsCero && (
                      <span style={{ fontSize: '0.6rem', color: '#ff9800', display: 'block' }}>
                        ⚠️ Sin stock
                      </span>
                    )}
                  </td>

                  {/* 👇 PRECIO EDITABLE */}
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {esEditable ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={p.precio_venta || p.precio || 0}
                        onChange={(e) => {
                          const nuevoPrecio = parseFloat(e.target.value) || 0
                          if (nuevoPrecio >= 0) {
                            actualizarPrecio(p.id, nuevoPrecio)
                          }
                        }}
                        style={{
                          width: '120px',
                          padding: '4px 8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          textAlign: 'center',
                          backgroundColor: precioEsCero ? '#fff3e0' : 'white',
                          fontWeight: precioEsCero ? 'bold' : 'normal',
                          color: precioEsCero ? '#ff9800' : '#333'
                        }}
                      />
                    ) : (
                      <span style={{ color: '#666' }}>
                        {formatearPrecio(p.precio || p.precio_venta || 0)}
                      </span>
                    )}
                    {!esPrincipal && precioEsCero && (
                      <span style={{ fontSize: '0.6rem', color: '#ff9800', display: 'block' }}>
                        ⚠️ Configurar precio
                      </span>
                    )}
                    {esPrincipal && (
                      <span style={{ fontSize: '0.6rem', color: '#666', display: 'block' }}>
                        Precio fijo
                      </span>
                    )}
                  </td>

                  {/* 👇 PRECIO MAYOR */}
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {p.precio_mayor ? `RD$ ${Number(p.precio_mayor).toFixed(2)}` : 'N/A'}
                  </td>

                  {esSubgerente && sucursalId && sucursalId !== 3 && puedeEditar && (
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleEliminarProducto(p.id)}
                        style={{
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#d32f2f'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#f44336'}
                      >
                        🗑️ Eliminar
                      </button>
                    </td>
                  )}
                  {esSubgerente && sucursalId && sucursalId !== 3 && !puedeEditar && (
                    <td style={{ padding: '12px', textAlign: 'center', color: '#999', fontSize: '0.8rem' }}>
                      🔒 Solo lectura
                    </td>
                  )}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </AdminLayout>
  )
}

export default Inventario