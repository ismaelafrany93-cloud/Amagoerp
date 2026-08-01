import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Inventario({ sucursalId, sucursalNombre }) {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    categoria: '',
    descripcion: '',
    precio: 0,
    stock: 0
  })

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario.rol)
  const esPrincipal = parseInt(sucursalId) === 3

  useEffect(() => {
    cargarInventario()
  }, [sucursalId])

  const cargarInventario = async () => {
    setCargando(true)
    try {
      const response = await fetch(`${API_URL}/inventario?sucursal_id=${sucursalId}`)
      const data = await response.json()
      console.log(`📦 ${sucursalNombre} - Productos recibidos:`, data.length)
      setProductos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando inventario:', error)
      setMensaje('❌ Error cargando inventario')
    } finally {
      setCargando(false)
    }
  }

  // 👇 ACTUALIZAR PRECIO
  const actualizarPrecio = async (productoId, nuevoPrecio) => {
    if (esPrincipal) {
      alert('⚠️ No se puede modificar el precio en la sucursal Principal')
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

  // 👇 ACTUALIZAR STOCK
  const actualizarStock = async (productoId, nuevoStock) => {
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

  // 👇 ELIMINAR PRODUCTO
  const eliminarProducto = async (productoId) => {
    if (esPrincipal) {
      alert('⚠️ No se puede eliminar productos de la sucursal Principal')
      return
    }

    if (!window.confirm(`¿Estás seguro de eliminar este producto de ${sucursalNombre}?`)) return

    try {
      const response = await fetch(`${API_URL}/inventario/producto`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productoId,
          sucursal_id: sucursalId
        })
      })

      const data = await response.json()
      if (data.success) {
        setMensaje('✅ Producto eliminado de la sucursal')
        cargarInventario()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error eliminando producto')
    }
  }

  // 👇 AGREGAR PRODUCTO
  const handleAgregarProducto = async (e) => {
    e.preventDefault()
    
    if (!nuevoProducto.nombre.trim()) {
      alert('⚠️ El nombre del producto es requerido')
      return
    }

    if (nuevoProducto.precio < 0) {
      alert('⚠️ El precio debe ser mayor o igual a 0')
      return
    }

    setCargando(true)

    try {
      const response = await fetch(`${API_URL}/inventario/producto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nuevoProducto,
          sucursal_id: sucursalId
        })
      })

      const data = await response.json()
      if (data.success) {
        setMensaje('✅ Producto agregado correctamente')
        setNuevoProducto({ nombre: '', categoria: '', descripcion: '', precio: 0, stock: 0 })
        setMostrarFormulario(false)
        cargarInventario()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error agregando producto')
    } finally {
      setCargando(false)
    }
  }

  const formatearPrecio = (precio) => {
    return `RD$ ${Number(precio).toFixed(2)}`
  }

  return (
    <AdminLayout>
      <h1>🏢 Inventario - {sucursalNombre}</h1>
      <p style={{ color: '#666' }}>📦 Inventario exclusivo de la sucursal de {sucursalNombre}</p>

      <div style={{
        backgroundColor: '#e3f2fd',
        padding: '10px 15px',
        borderRadius: '8px',
        marginBottom: '20px',
        borderLeft: '4px solid #003b6f'
      }}>
        <p style={{ margin: 0, color: '#003b6f' }}>
          {esPrincipal ? (
            <strong>📋 Inventario General - Total: {productos.length} productos</strong>
          ) : (
            <strong>🔑 Precios exclusivos para {sucursalNombre}</strong>
          )}
        </p>
        <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#666' }}>
          {esPrincipal ? (
            '📦 Catálogo completo de todos los productos'
          ) : (
            '📦 Puedes editar el precio y stock directamente en la tabla'
          )}
        </p>
        {!esPrincipal && (
          <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#ff9800' }}>
            ⚠️ Los productos con precio 0 aparecen en naranja - ¡Configúralos!
          </p>
        )}
      </div>

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

      {esAdmin && !esPrincipal && (
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            style={{
              padding: '10px 20px',
              backgroundColor: mostrarFormulario ? '#f44336' : '#003b6f',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            {mostrarFormulario ? '✕ Cerrar' : '➕ Agregar Producto a ' + sucursalNombre}
          </button>
          <button
            onClick={cargarInventario}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🔄 Actualizar
          </button>
        </div>
      )}

      {mostrarFormulario && !esPrincipal && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '2px solid #003b6f'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>📝 Agregar Producto a {sucursalNombre}</h3>
          <form onSubmit={handleAgregarProducto}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '500' }}>Nombre *</label>
                <input
                  type="text"
                  value={nuevoProducto.nombre}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '500' }}>Categoría</label>
                <input
                  type="text"
                  value={nuevoProducto.categoria}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, categoria: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '500' }}>Precio (RD$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={nuevoProducto.precio}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, precio: parseFloat(e.target.value) || 0 })}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '500' }}>Stock Inicial</label>
                <input
                  type="number"
                  min="0"
                  value={nuevoProducto.stock}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, stock: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: '500' }}>Descripción</label>
                <textarea
                  value={nuevoProducto.descripcion}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', minHeight: '50px' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button
                type="submit"
                disabled={cargando}
                style={{
                  padding: '10px 30px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  opacity: cargando ? 0.6 : 1
                }}
              >
                {cargando ? 'Guardando...' : '✅ Guardar Producto'}
              </button>
              <button
                type="button"
                onClick={() => setMostrarFormulario(false)}
                style={{
                  padding: '10px 30px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contador de productos */}
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
            <strong>Sin precio:</strong> {productos.filter(p => (p.precio || 0) === 0).length}
          </span>
        )}
        <span>
          <strong>Stock total:</strong> {productos.reduce((acc, p) => acc + (p.stock || 0), 0)}
        </span>
      </div>

      <div style={{
        overflowX: 'auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#003b6f', color: 'white' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>ID</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Producto</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Categoría</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Stock</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Precio {sucursalNombre}</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                  ⏳ Cargando productos...
                </td>
              </tr>
            ) : productos.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                  📦 No hay productos en esta sucursal
                </td>
              </tr>
            ) : (
              productos.map((p) => {
                const precioEsCero = (p.precio || 0) === 0
                const stockEsCero = (p.stock || 0) === 0
                
                return (
                  <tr key={p.id} style={{ 
                    borderBottom: '1px solid #eee',
                    backgroundColor: esPrincipal ? 'white' : (precioEsCero ? '#fff8e1' : 'white')
                  }}>
                    <td style={{ padding: '10px' }}>{p.id}</td>
                    <td style={{ padding: '10px' }}>{p.nombre}</td>
                    <td style={{ padding: '10px' }}>{p.categoria || 'General'}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
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
                      {stockEsCero && (
                        <span style={{ fontSize: '0.6rem', color: '#ff9800', display: 'block' }}>
                          ⚠️ Sin stock
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={p.precio || 0}
                        onChange={(e) => {
                          const nuevoPrecio = parseFloat(e.target.value) || 0
                          if (nuevoPrecio >= 0 && !esPrincipal) {
                            actualizarPrecio(p.id, nuevoPrecio)
                          }
                        }}
                        disabled={esPrincipal}
                        style={{
                          width: '120px',
                          padding: '4px 8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          textAlign: 'center',
                          backgroundColor: esPrincipal ? '#f5f5f5' : (precioEsCero ? '#fff3e0' : 'white'),
                          color: esPrincipal ? '#666' : (precioEsCero ? '#ff9800' : '#333'),
                          cursor: esPrincipal ? 'not-allowed' : 'text'
                        }}
                      />
                      {esPrincipal ? (
                        <span style={{ fontSize: '0.6rem', color: '#666', display: 'block' }}>
                          Precio fijo
                        </span>
                      ) : precioEsCero ? (
                        <span style={{ fontSize: '0.6rem', color: '#ff9800', display: 'block' }}>
                          ⚠️ Configurar precio
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.6rem', color: '#666', display: 'block' }}>
                          {formatearPrecio(p.precio)}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button
                        onClick={() => eliminarProducto(p.id)}
                        disabled={esPrincipal}
                        style={{
                          backgroundColor: esPrincipal ? '#999' : '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 12px',
                          cursor: esPrincipal ? 'not-allowed' : 'pointer',
                          opacity: esPrincipal ? 0.6 : 1
                        }}
                      >
                        🗑️ Eliminar
                      </button>
                      {esPrincipal && (
                        <span style={{ fontSize: '0.6rem', color: '#999', display: 'block' }}>
                          No se puede eliminar
                        </span>
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

export default Inventario