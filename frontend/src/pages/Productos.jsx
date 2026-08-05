import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Productos() {
  const [productos, setProductos] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [areas, setAreas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [form, setForm] = useState({
    nombre: '',
    categoria: '',
    descripcion: '',
    precio: '',
    precio_mayor: '',
    cantidad_mayor: '',
    stock: '',
    sucursal_id: '',
    area_id: ''
  })

  // ============================================
  // 1. OBTENER USUARIO Y LOGS DE DEPURACIÓN
  // ============================================
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  console.log('🔍 1. Usuario desde localStorage:', usuario)
  
  const rol = usuario?.rol || ''
  console.log('🔍 2. Rol:', rol)
  
  const areaId = usuario?.area_id || null
  console.log('🔍 3. area_id:', areaId)
  
  const esSupervisor = rol === 'supervisor'
  console.log('🔍 4. esSupervisor:', esSupervisor)
  
  const esSubgerente = ['dueno', 'dueño', 'subgerente', 'admin'].includes(rol)
  console.log('🔍 5. esSubgerente:', esSubgerente)
  
  const areaDelSupervisor = esSupervisor ? areaId : null
  console.log('🔍 6. areaDelSupervisor:', areaDelSupervisor)

  // ============================================
  // 2. EFECTO PARA CARGAR DATOS AL INICIAR
  // ============================================
  useEffect(() => {
    console.log('🔄 useEffect ejecutándose - cargando datos...')
    cargarProductos()
    cargarSucursales()
    cargarAreas()
  }, [])

  // ============================================
  // 3. CARGAR PRODUCTOS CON FILTRO POR ÁREA
  // ============================================
  const cargarProductos = async () => {
    console.log('📦 Iniciando cargarProductos...')
    setCargando(true)
    try {
      let url = `${API_URL}/productos`
      const params = new URLSearchParams()
      
      // 👇 SOLO SI ES SUPERVISOR Y TIENE ÁREA, FILTRAR
      if (esSupervisor && areaDelSupervisor) {
        params.append('area_id', areaDelSupervisor)
        console.log('🔍 APLICANDO FILTRO - Supervisor filtrando por área:', areaDelSupervisor)
      } else {
        console.log('🔍 SIN FILTRO - No es supervisor o no tiene área')
        console.log('   - Rol:', rol)
        console.log('   - esSupervisor:', esSupervisor)
        console.log('   - areaDelSupervisor:', areaDelSupervisor)
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }
      
      console.log('📦 URL FINAL:', url)
      
      const response = await fetch(url)
      console.log('📦 Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}`)
      }
      const data = await response.json()
      console.log('📦 Productos recibidos:', data.length)
      console.log('📦 Primeros 5 productos:', data.slice(0, 5).map(p => ({ id: p.id, nombre: p.nombre, area_id: p.area_id })))
      setProductos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('❌ Error cargando productos:', error)
      setMensaje('❌ Error cargando productos')
    } finally {
      setCargando(false)
      console.log('📦 cargarProductos finalizado')
    }
  }

  // ============================================
  // 4. CARGAR SUCURSALES Y ÁREAS
  // ============================================
  const cargarSucursales = async () => {
    try {
      const response = await fetch(`${API_URL}/sucursales`)
      const data = await response.json()
      console.log('📦 Sucursales cargadas:', data.length)
      setSucursales(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando sucursales:', error)
      setSucursales([])
    }
  }

  const cargarAreas = async () => {
    try {
      const response = await fetch(`${API_URL}/usuarios/areas`)
      const data = await response.json()
      console.log('📦 Áreas cargadas:', data.length)
      setAreas(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando áreas:', error)
      setAreas([])
    }
  }

  // ============================================
  // 5. FUNCIONES AUXILIARES
  // ============================================
  const getAreaNombre = (areaId) => {
    const area = areas.find(a => a.id === parseInt(areaId))
    return area ? area.nombre : 'Sin área'
  }

  const getAreaIcono = (areaId) => {
    const area = areas.find(a => a.id === parseInt(areaId))
    return area ? area.icono : '🏭'
  }

  // ============================================
  // 6. CRUD DE PRODUCTOS
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setMensaje('')

    try {
      const url = editando ? `${API_URL}/productos/${editando}` : `${API_URL}/productos`
      const method = editando ? 'PUT' : 'POST'

      const datosEnviar = {
        nombre: form.nombre,
        categoria: form.categoria || 'General',
        descripcion: form.descripcion || '',
        precio: parseFloat(form.precio) || 0,
        precio_mayor: form.precio_mayor ? parseFloat(form.precio_mayor) : null,
        cantidad_mayor: parseInt(form.cantidad_mayor) || 0,
        stock: parseInt(form.stock) || 0,
        sucursal_id: form.sucursal_id || null,
        area_id: form.area_id || null
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosEnviar)
      })

      const data = await response.json()

      if (data.success) {
        setMensaje(editando ? '✅ Producto actualizado correctamente' : '✅ Producto creado correctamente')
        setForm({ nombre: '', categoria: '', descripcion: '', precio: '', precio_mayor: '', cantidad_mayor: '', stock: '', sucursal_id: '', area_id: '' })
        setMostrarForm(false)
        setEditando(null)
        cargarProductos()
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

  const handleAreaChange = async (productoId, nuevoAreaId) => {
    try {
      const productoActual = productos.find(p => p.id === productoId)
      if (!productoActual) return

      const response = await fetch(`${API_URL}/productos/${productoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: productoActual.nombre,
          categoria: productoActual.categoria || 'General',
          descripcion: productoActual.descripcion || '',
          precio: productoActual.precio || 0,
          precio_mayor: productoActual.precio_mayor || null,
          cantidad_mayor: productoActual.cantidad_mayor || 0,
          stock: productoActual.stock || 0,
          sucursal_id: productoActual.sucursal_id || 3,
          area_id: nuevoAreaId || null
        })
      })

      const data = await response.json()
      if (data.success) {
        setMensaje('✅ Área actualizada correctamente')
        cargarProductos()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error actualizando área')
    }
  }

  const handleEdit = (producto) => {
    setForm({
      nombre: producto.nombre || '',
      categoria: producto.categoria || '',
      descripcion: producto.descripcion || '',
      precio: producto.precio || '',
      precio_mayor: producto.precio_mayor || '',
      cantidad_mayor: producto.cantidad_mayor || '',
      stock: producto.stock || '',
      sucursal_id: producto.sucursal_id || '',
      area_id: producto.area_id || ''
    })
    setEditando(producto.id)
    setMostrarForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ ¿Estás seguro de eliminar este producto?')) return

    try {
      const response = await fetch(`${API_URL}/productos/${id}`, {
        method: 'DELETE'
      })
      const data = await response.json()

      if (data.success) {
        setMensaje('✅ Producto eliminado')
        cargarProductos()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setMensaje('❌ Error eliminando producto')
      }
    } catch (error) {
      console.error('Error:', error)
      setMensaje('❌ Error eliminando producto')
    }
  }

  const handleUpdateStock = async (productoId, nuevoStock) => {
    if (nuevoStock === undefined || nuevoStock === null) return

    try {
      const response = await fetch(`${API_URL}/productos/${productoId}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock: parseInt(nuevoStock) || 0,
          sucursal_id: 3
        })
      })

      const data = await response.json()
      if (data.success) {
        setMensaje('✅ Stock actualizado correctamente')
        cargarProductos()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setMensaje('❌ Error: ' + data.message)
      }
    } catch (error) {
      console.error('Error:', error)
      setMensaje('❌ Error actualizando stock')
    }
  }

  // ============================================
  // 7. RENDER
  // ============================================
  if (cargando) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Cargando productos...</h2>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <h1>📦 Productos</h1>

      {/* 👇 BANNER DEL ÁREA DEL SUPERVISOR */}
      {esSupervisor && areaDelSupervisor && (
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '10px 15px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #003b6f',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '2rem' }}>{getAreaIcono(areaDelSupervisor)}</span>
          <div>
            <p style={{ margin: 0, color: '#003b6f', fontWeight: 'bold' }}>
              👋 Bienvenido, Supervisor de {getAreaNombre(areaDelSupervisor)}
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#666' }}>
              📦 Solo ves los productos de tu área asignada
            </p>
          </div>
        </div>
      )}

      {/* 👇 BANNER PARA SUBGERENTE/DUEÑO */}
      {esSubgerente && (
        <div style={{
          backgroundColor: '#e8f5e9',
          padding: '10px 15px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #4CAF50',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '2rem' }}>👑</span>
          <div>
            <p style={{ margin: 0, color: '#1b5e20', fontWeight: 'bold' }}>
              {rol === 'subgerente' ? 'Subgerente' : 'Administrador'} - Visión completa
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#666' }}>
              📦 Puedes ver y asignar áreas a todos los productos
            </p>
          </div>
        </div>
      )}

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

      {esSubgerente && (
        <button
          onClick={() => {
            setMostrarForm(!mostrarForm)
            setEditando(null)
            setForm({ nombre: '', categoria: '', descripcion: '', precio: '', precio_mayor: '', cantidad_mayor: '', stock: '', sucursal_id: '', area_id: '' })
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
          {mostrarForm ? '✕ Cancelar' : '➕ Nuevo Producto'}
        </button>
      )}

      {mostrarForm && esSubgerente && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#f5f7fb',
          padding: '25px',
          borderRadius: '12px',
          marginBottom: '25px',
          border: '2px solid #003b6f'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>
            {editando ? '✏️ Editar Producto' : '➕ Agregar Producto'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
                placeholder="Nombre del producto"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Categoría</label>
              <input
                type="text"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                placeholder="Ej: Muebles, Sillas"
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
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Cant. Mín. Mayor</label>
              <input
                type="number"
                min="0"
                value={form.cantidad_mayor}
                onChange={(e) => setForm({ ...form, cantidad_mayor: e.target.value })}
                placeholder="10"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Stock</label>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                placeholder="0"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
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
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Área</label>
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
            {cargando ? 'Guardando...' : editando ? '✅ Actualizar Producto' : '✅ Guardar Producto'}
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
        {esSubgerente && (
          <span>
            <strong>Sin área:</strong> {productos.filter(p => !p.area_id).length}
          </span>
        )}
        <span>
          <strong>Con área:</strong> {productos.filter(p => p.area_id).length}
        </span>
      </div>

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
              <th style={{ padding: '12px', textAlign: 'left' }}>Producto</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Categoría</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>🏷️ Área</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Precio</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Stock</th>
              {esSubgerente && (
                <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
              )}
              {esSupervisor && (
                <th style={{ padding: '12px', textAlign: 'center' }}>Acción</th>
              )}
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr>
                <td colSpan={esSubgerente ? 7 : (esSupervisor ? 7 : 6)} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                  {esSupervisor 
                    ? `No hay productos en tu área (${getAreaNombre(areaDelSupervisor)})`
                    : 'No hay productos registrados'}
                </td>
              </tr>
            ) : (
              productos.map((p) => {
                const sinArea = !p.area_id
                return (
                  <tr key={p.id} style={{ 
                    borderBottom: '1px solid #eee',
                    backgroundColor: sinArea ? '#fff8e1' : 'white'
                  }}>
                    <td style={{ padding: '12px' }}>{p.id}</td>
                    <td style={{ padding: '12px' }}>{p.nombre}</td>
                    <td style={{ padding: '12px' }}>{p.categoria || 'N/A'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {esSubgerente ? (
                        <select
                          value={p.area_id || ''}
                          onChange={(e) => {
                            const nuevoAreaId = e.target.value ? parseInt(e.target.value) : null
                            const productosActualizados = productos.map(prod => {
                              if (prod.id === p.id) {
                                return { ...prod, area_id: nuevoAreaId }
                              }
                              return prod
                            })
                            setProductos(productosActualizados)
                            handleAreaChange(p.id, nuevoAreaId)
                          }}
                          style={{
                            padding: '4px 8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            backgroundColor: sinArea ? '#fff3e0' : 'white',
                            fontSize: '0.85rem',
                            minWidth: '120px'
                          }}
                        >
                          <option value="">Sin área</option>
                          {areas.map(a => (
                            <option key={a.id} value={a.id}>
                              {a.icono || '🏭'} {a.nombre}
                            </option>
                          ))}
                        </select>
                      ) : (
                        p.area_id ? (
                          <span style={{
                            backgroundColor: '#e3f2fd',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            color: '#003b6f'
                          }}>
                            {getAreaIcono(p.area_id)} {getAreaNombre(p.area_id)}
                          </span>
                        ) : (
                          <span style={{ color: '#ff9800', fontSize: '0.75rem' }}>⚠️ Sin área</span>
                        )
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      RD$ {Number(p.precio).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        value={p.stock || 0}
                        onChange={(e) => {
                          const nuevosProductos = productos.map(prod => {
                            if (prod.id === p.id) {
                              return { ...prod, stock: parseInt(e.target.value) || 0 }
                            }
                            return prod
                          })
                          setProductos(nuevosProductos)
                        }}
                        onBlur={(e) => {
                          const nuevoStock = parseInt(e.target.value) || 0
                          if (nuevoStock !== p.stock) {
                            handleUpdateStock(p.id, nuevoStock)
                          }
                        }}
                        style={{
                          width: '80px',
                          padding: '6px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          textAlign: 'center'
                        }}
                      />
                    </td>
                    {esSubgerente && (
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleEdit(p)}
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
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
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
                    )}
                    {esSupervisor && (
                      <td style={{ padding: '12px', textAlign: 'center', color: '#999', fontSize: '0.8rem' }}>
                        Solo lectura
                      </td>
                    )}
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

export default Productos