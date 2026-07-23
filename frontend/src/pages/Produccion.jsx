import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Produccion() {
  const [productos, setProductos] = useState([])
  const [producciones, setProducciones] = useState([])
  const [resumen, setResumen] = useState([])
  const [detalleOperarios, setDetalleOperarios] = useState([])
  const [operarios, setOperarios] = useState([])
  const [areas, setAreas] = useState([])
  const [estadisticas, setEstadisticas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [editando, setEditando] = useState(null)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0])
  const [areaSeleccionada, setAreaSeleccionada] = useState('')
  const [mostrarEstadisticas, setMostrarEstadisticas] = useState(false)
  
  // 👇 ESTADOS PARA GESTIÓN DE OPERARIOS
  const [mostrarGestionOperarios, setMostrarGestionOperarios] = useState(false)
  const [nuevoOperario, setNuevoOperario] = useState('')
  const [operarioEditando, setOperarioEditando] = useState(null)
  const [nuevoOperarioArea, setNuevoOperarioArea] = useState('')

  const [form, setForm] = useState({
    operario: '',
    fecha: new Date().toISOString().split('T')[0],
    observacion_general: '',
    productos: [],
    area_id: ''
  })

  const [productoSeleccionado, setProductoSeleccionado] = useState('')
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState(1)
  const [observacionProducto, setObservacionProducto] = useState('')

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esSupervisor = ['supervisor', 'subgerente', 'dueno', 'dueño', 'admin'].includes(usuario.rol)
  const puedeGestionarOperarios = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario.rol)

  // 👇 DETECTAR EL ÁREA DEL SUPERVISOR
  const areaDelSupervisor = usuario.area_id || null
  const esSupervisorDeArea = esSupervisor && areaDelSupervisor !== null

  // Áreas predefinidas
  const AREAS_PREDEFINIDAS = [
    { id: 1, nombre: 'Tapicería', icono: '🪑', color: '#FF6B6B' },
    { id: 2, nombre: 'Modulares', icono: '📦', color: '#4ECDC4' },
    { id: 3, nombre: 'Pintura', icono: '🎨', color: '#FFE66D' },
    { id: 4, nombre: 'Cristales', icono: '💎', color: '#A8E6CF' },
    { id: 5, nombre: 'Materiales', icono: '🧵', color: '#DDA0DD' }
  ]

  useEffect(() => {
    cargarProductos()
    cargarAreas()
    cargarEstadisticas()
    
    // Si el supervisor tiene un área asignada, filtrar automáticamente
    if (esSupervisorDeArea) {
      setAreaSeleccionada(String(areaDelSupervisor))
      setForm(prev => ({ ...prev, area_id: String(areaDelSupervisor) }))
    }
    
    cargarProducciones()
    cargarResumen()
    cargarDetalleOperarios()
    cargarOperarios()
  }, [])

  // Recargar cuando cambia el área seleccionada
  useEffect(() => {
    cargarProducciones()
    cargarResumen()
    cargarDetalleOperarios()
    cargarOperarios()
    cargarEstadisticas()
  }, [areaSeleccionada])

  const cargarProductos = async () => {
    try {
      const response = await fetch(`${API_URL}/productos`)
      const data = await response.json()
      setProductos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando productos:', error)
    }
  }

  const cargarAreas = async () => {
    try {
      const response = await fetch(`${API_URL}/produccion/areas`)
      const data = await response.json()
      setAreas(Array.isArray(data) && data.length > 0 ? data : AREAS_PREDEFINIDAS)
    } catch (error) {
      console.error('Error cargando áreas:', error)
      setAreas(AREAS_PREDEFINIDAS)
    }
  }

  const cargarEstadisticas = async () => {
    try {
      const url = areaDelSupervisor 
        ? `${API_URL}/produccion/estadisticas?area_id=${areaDelSupervisor}`
        : `${API_URL}/produccion/estadisticas`
      const response = await fetch(url)
      const data = await response.json()
      setEstadisticas(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
      setEstadisticas([])
    }
  }

  const cargarProducciones = async () => {
    try {
      let url = `${API_URL}/produccion`
      const params = new URLSearchParams()
      
      if (areaSeleccionada) {
        params.append('area_id', areaSeleccionada)
      } else if (esSupervisorDeArea) {
        params.append('area_id', areaDelSupervisor)
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      setProducciones(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando producciones:', error)
      setProducciones([])
    }
  }

  const cargarResumen = async () => {
    try {
      let url = `${API_URL}/produccion/resumen?fecha=${fechaSeleccionada}`
      if (areaSeleccionada) {
        url += `&area_id=${areaSeleccionada}`
      } else if (esSupervisorDeArea) {
        url += `&area_id=${areaDelSupervisor}`
      }
      const response = await fetch(url)
      const data = await response.json()
      setResumen(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando resumen:', error)
      setResumen([])
    }
  }

  const cargarDetalleOperarios = async () => {
    try {
      let url = `${API_URL}/produccion/detalle-por-operario?fecha=${fechaSeleccionada}`
      if (areaSeleccionada) {
        url += `&area_id=${areaSeleccionada}`
      } else if (esSupervisorDeArea) {
        url += `&area_id=${areaDelSupervisor}`
      }
      const response = await fetch(url)
      const data = await response.json()
      setDetalleOperarios(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando detalle de operarios:', error)
      setDetalleOperarios([])
    }
  }

  const cargarOperarios = async () => {
    try {
      let url = `${API_URL}/produccion/operarios`
      if (areaSeleccionada) {
        url += `?area_id=${areaSeleccionada}`
      } else if (esSupervisorDeArea) {
        url += `?area_id=${areaDelSupervisor}`
      }
      const response = await fetch(url)
      const data = await response.json()
      setOperarios(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando operarios:', error)
      setOperarios([])
    }
  }

  // ============================================
  // GESTIÓN DE OPERARIOS
  // ============================================
  const handleAgregarOperario = async (e) => {
    e.preventDefault()
    if (!nuevoOperario.trim()) {
      alert('⚠️ Ingresa un nombre de operario')
      return
    }

    try {
      const response = await fetch(`${API_URL}/operarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre: nuevoOperario.trim(),
          area_id: nuevoOperarioArea || areaDelSupervisor || null
        })
      })

      const data = await response.json()

      if (data.success) {
        setMensaje('✅ Operario agregado correctamente')
        setNuevoOperario('')
        setNuevoOperarioArea('')
        cargarOperarios()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error: ' + (data.message || 'No se pudo agregar'))
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error agregando operario')
    }
  }

  const handleEliminarOperario = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar a "${nombre}"?`)) return

    try {
      const response = await fetch(`${API_URL}/operarios/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setMensaje('✅ Operario eliminado correctamente')
        cargarOperarios()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error eliminando operario')
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error eliminando operario')
    }
  }

  const agregarProducto = () => {
    if (!productoSeleccionado) {
      alert('⚠️ Selecciona un producto')
      return
    }
    if (!cantidadSeleccionada || cantidadSeleccionada <= 0) {
      alert('⚠️ Ingresa una cantidad válida')
      return
    }

    const producto = productos.find(p => p.id === parseInt(productoSeleccionado))
    if (!producto) return

    const existe = form.productos.find(p => p.producto_id === producto.id)
    if (existe) {
      setForm({
        ...form,
        productos: form.productos.map(p =>
          p.producto_id === producto.id
            ? { ...p, cantidad: p.cantidad + cantidadSeleccionada }
            : p
        )
      })
    } else {
      setForm({
        ...form,
        productos: [
          ...form.productos,
          {
            producto_id: producto.id,
            producto_nombre: producto.nombre,
            cantidad: cantidadSeleccionada,
            observacion: observacionProducto
          }
        ]
      })
    }

    setProductoSeleccionado('')
    setCantidadSeleccionada(1)
    setObservacionProducto('')
  }

  const eliminarProductoForm = (producto_id) => {
    setForm({
      ...form,
      productos: form.productos.filter(p => p.producto_id !== producto_id)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.operario) {
      alert('⚠️ Selecciona un operario')
      return
    }

    // Si el supervisor tiene área, usarla automáticamente
    const areaId = form.area_id || areaDelSupervisor
    
    if (!areaId) {
      alert('⚠️ Selecciona un área de producción')
      return
    }

    if (form.productos.length === 0) {
      alert('⚠️ Agrega al menos un producto')
      return
    }

    setCargando(true)

    try {
      const response = await fetch(`${API_URL}/produccion/multiple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operario: form.operario,
          supervisor_id: usuario.id,
          productos: form.productos.map(p => ({
            producto_id: p.producto_id,
            cantidad: p.cantidad,
            observacion: p.observacion || form.observacion_general
          })),
          fecha: form.fecha,
          observacion_general: form.observacion_general,
          sucursal_id: usuario.sucursal_id || 3,
          area_id: parseInt(areaId)
        })
      })

      const data = await response.json()

      if (data.success) {
        setMensaje(`✅ ${data.registros?.length || 0} registros de producción creados en ${data.area || 'el área'} - Total: ${data.total_productos || 0} unidades`)
        setForm({
          operario: '',
          fecha: new Date().toISOString().split('T')[0],
          observacion_general: '',
          productos: [],
          area_id: areaId // Mantener el área
        })
        cargarProducciones()
        cargarResumen()
        cargarDetalleOperarios()
        cargarEstadisticas()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error: ' + (data.error || 'No se pudo guardar'))
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error guardando producción')
    } finally {
      setCargando(false)
    }
  }

  const handleEdit = (produccion) => {
    setEditando(produccion.id)
    setForm({
      operario: produccion.operario || '',
      fecha: produccion.fecha ? produccion.fecha.split('T')[0] : new Date().toISOString().split('T')[0],
      observacion_general: produccion.observacion || '',
      productos: [{
        producto_id: produccion.producto_id,
        producto_nombre: produccion.producto_nombre,
        cantidad: produccion.cantidad,
        observacion: produccion.observacion || ''
      }],
      area_id: produccion.area_id || areaDelSupervisor || ''
    })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ ¿Estás seguro de eliminar este registro de producción?\n\nEl stock se ajustará automáticamente.')) return

    try {
      const response = await fetch(`${API_URL}/produccion/${id}`, {
        method: 'DELETE'
      })
      const data = await response.json()

      if (data.success) {
        setMensaje('✅ Registro eliminado correctamente')
        cargarProducciones()
        cargarResumen()
        cargarDetalleOperarios()
        cargarEstadisticas()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error: ' + (data.message || data.error))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al eliminar')
    }
  }

  const cambiarFecha = (e) => {
    const nuevaFecha = e.target.value
    setFechaSeleccionada(nuevaFecha)
    setTimeout(() => {
      cargarDetalleOperarios()
      cargarResumen()
    }, 100)
  }

  const cambiarArea = (e) => {
    const area = e.target.value
    setAreaSeleccionada(area)
    setForm({ ...form, area_id: area })
    setTimeout(() => {
      cargarProducciones()
      cargarResumen()
      cargarDetalleOperarios()
      cargarOperarios()
      cargarEstadisticas()
    }, 100)
  }

  const getAreaNombre = (areaId) => {
    const area = areas.find(a => a.id === parseInt(areaId))
    return area ? area.nombre : 'Sin área'
  }

  const getAreaIcono = (areaId) => {
    const area = areas.find(a => a.id === parseInt(areaId))
    return area ? area.icono : '🏭'
  }

  const getAreaColor = (areaId) => {
    const area = areas.find(a => a.id === parseInt(areaId))
    return area ? area.color : '#757575'
  }

  // Áreas que puede ver el usuario
  const areasVisibles = esSupervisorDeArea 
    ? areas.filter(a => a.id === areaDelSupervisor)
    : areas

  if (cargando) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Guardando producción...</h2>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <h1>🏭 Producción</h1>

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

      {/* 👇 BANNER DEL ÁREA DEL SUPERVISOR */}
      {esSupervisorDeArea && (
        <div style={{
          backgroundColor: getAreaColor(areaDelSupervisor) + '20',
          border: `2px solid ${getAreaColor(areaDelSupervisor)}`,
          borderRadius: '12px',
          padding: '15px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <span style={{ fontSize: '2rem' }}>{getAreaIcono(areaDelSupervisor)}</span>
          <div>
            <h3 style={{ margin: 0, color: getAreaColor(areaDelSupervisor) }}>
              {getAreaNombre(areaDelSupervisor)}
            </h3>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '0.9rem' }}>
              👋 Bienvenido, Supervisor de {getAreaNombre(areaDelSupervisor)}
            </p>
          </div>
          <span style={{
            marginLeft: 'auto',
            backgroundColor: getAreaColor(areaDelSupervisor),
            color: 'white',
            padding: '4px 16px',
            borderRadius: '20px',
            fontSize: '0.8rem'
          }}>
            ✅ Tu área
          </span>
        </div>
      )}

      {/* 👇 FILTRO POR ÁREA */}
      <div style={{
        backgroundColor: '#f0f4f8',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ddd'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 'bold', color: '#003b6f' }}>🏷️ Filtrar por Área:</label>
          <select
            value={areaSeleccionada}
            onChange={cambiarArea}
            disabled={esSupervisorDeArea}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              minWidth: '200px',
              opacity: esSupervisorDeArea ? 0.7 : 1
            }}
          >
            <option value="">📋 Todas las áreas</option>
            {(esSupervisorDeArea ? areas.filter(a => a.id === areaDelSupervisor) : areas).map(a => (
              <option key={a.id} value={a.id}>
                {a.icono} {a.nombre}
              </option>
            ))}
          </select>
          {esSupervisorDeArea && (
            <span style={{
              backgroundColor: getAreaColor(areaDelSupervisor),
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '0.85rem'
            }}>
              {getAreaIcono(areaDelSupervisor)} {getAreaNombre(areaDelSupervisor)}
            </span>
          )}
          {areaSeleccionada && !esSupervisorDeArea && (
            <button
              onClick={() => {
                setAreaSeleccionada('')
                setForm({ ...form, area_id: '' })
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ✕ Limpiar filtro
            </button>
          )}
          <span style={{ color: '#666', fontSize: '0.85rem' }}>
            {areaSeleccionada ? `Mostrando: ${getAreaIcono(areaSeleccionada)} ${getAreaNombre(areaSeleccionada)}` : 'Mostrando todas las áreas'}
          </span>
        </div>
      </div>

      {/* ========================================== */}
      {/* GESTIÓN DE OPERARIOS - PANEL FLOTANTE */}
      {/* ========================================== */}
      {puedeGestionarOperarios && (
        <div style={{
          border: '2px solid #ff9800',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          backgroundColor: '#fff8e1'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#e65100' }}>👷 Gestión de Operarios</h3>
            <button
              onClick={() => setMostrarGestionOperarios(!mostrarGestionOperarios)}
              style={{
                padding: '6px 16px',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {mostrarGestionOperarios ? '✕ Cerrar' : '📋 Gestionar'}
            </button>
          </div>

          {mostrarGestionOperarios && (
            <div style={{ marginTop: '15px' }}>
              <form onSubmit={handleAgregarOperario} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                <input
                  type="text"
                  value={nuevoOperario}
                  onChange={(e) => setNuevoOperario(e.target.value)}
                  placeholder="Nombre del nuevo operario"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    minWidth: '150px'
                  }}
                />
                {!esSupervisorDeArea && (
                  <select
                    value={nuevoOperarioArea}
                    onChange={(e) => setNuevoOperarioArea(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      minWidth: '150px'
                    }}
                  >
                    <option value="">Área del operario</option>
                    {AREAS_PREDEFINIDAS.map(a => (
                      <option key={a.id} value={a.id}>{a.icono} {a.nombre}</option>
                    ))}
                  </select>
                )}
                {esSupervisorDeArea && (
                  <span style={{
                    padding: '8px 12px',
                    backgroundColor: getAreaColor(areaDelSupervisor) + '20',
                    borderRadius: '6px',
                    color: getAreaColor(areaDelSupervisor),
                    fontWeight: 'bold'
                  }}>
                    {getAreaIcono(areaDelSupervisor)} {getAreaNombre(areaDelSupervisor)}
                  </span>
                )}
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  ✅ Agregar
                </button>
              </form>

              {operarios.length === 0 ? (
                <p style={{ color: '#999', textAlign: 'center', padding: '10px' }}>No hay operarios registrados en esta área</p>
              ) : (
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f0f4f8' }}>
                        <th style={{ padding: '6px', textAlign: 'left' }}>Operario</th>
                        <th style={{ padding: '6px', textAlign: 'left' }}>Área</th>
                        <th style={{ padding: '6px', textAlign: 'center' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operarios.map((op) => (
                        <tr key={op.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '6px' }}>👤 {op.nombre}</td>
                          <td style={{ padding: '6px' }}>
                            {op.area_id ? (
                              <span style={{
                                backgroundColor: op.area_color || '#eee',
                                color: op.area_color ? 'white' : '#333',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem'
                              }}>
                                {op.area_icono || '🏭'} {op.area_nombre || 'Sin área'}
                              </span>
                            ) : (
                              <span style={{ color: '#999', fontSize: '0.8rem' }}>Sin asignar</span>
                            )}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleEliminarOperario(op.id, op.nombre)}
                              style={{
                                backgroundColor: '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '2px 10px',
                                cursor: 'pointer',
                                fontSize: '0.8rem'
                              }}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* FORMULARIO DE PRODUCCIÓN MÚLTIPLE */}
      {/* ========================================== */}
      {esSupervisor && (
        <div style={{
          border: '2px solid #003b6f',
          borderRadius: '12px',
          padding: '25px',
          marginBottom: '30px',
          backgroundColor: '#f8faff'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>
            {editando ? '✏️ Editar Producción' : '📝 Registrar Producción Múltiple'}
            {esSupervisorDeArea && (
              <span style={{
                marginLeft: '10px',
                fontSize: '0.85rem',
                color: getAreaColor(areaDelSupervisor)
              }}>
                - {getAreaIcono(areaDelSupervisor)} {getAreaNombre(areaDelSupervisor)}
              </span>
            )}
          </h3>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>👷 Operario *</label>
                <select
                  value={form.operario}
                  onChange={(e) => setForm({ ...form, operario: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                >
                  <option value="">Seleccionar operario</option>
                  {operarios.map(op => (
                    <option key={op.id} value={op.nombre}>{op.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>🏷️ Área *</label>
                <select
                  value={form.area_id || areaDelSupervisor || ''}
                  onChange={(e) => setForm({ ...form, area_id: e.target.value })}
                  required
                  disabled={esSupervisorDeArea}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: esSupervisorDeArea ? '#f5f5f5' : 'white'
                  }}
                >
                  <option value="">Seleccionar área</option>
                  {AREAS_PREDEFINIDAS.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.icono} {a.nombre}
                    </option>
                  ))}
                </select>
                {esSupervisorDeArea && (
                  <div style={{
                    marginTop: '4px',
                    fontSize: '0.75rem',
                    color: getAreaColor(areaDelSupervisor)
                  }}>
                    Área asignada automáticamente
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>📅 Fecha</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>📝 Observación General</label>
              <textarea
                value={form.observacion_general}
                onChange={(e) => setForm({ ...form, observacion_general: e.target.value })}
                placeholder="Notas generales para toda la producción..."
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', minHeight: '40px' }}
              />
            </div>

            <div style={{
              backgroundColor: '#f0f4f8',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#003b6f' }}>➕ Agregar Productos</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Producto</label>
                  <select
                    value={productoSeleccionado}
                    onChange={(e) => setProductoSeleccionado(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                  >
                    <option value="">Seleccionar producto</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={cantidadSeleccionada}
                    onChange={(e) => setCantidadSeleccionada(parseInt(e.target.value) || 1)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Observación</label>
                  <input
                    type="text"
                    value={observacionProducto}
                    onChange={(e) => setObservacionProducto(e.target.value)}
                    placeholder="Nota..."
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={agregarProducto}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      width: '100%'
                    }}
                  >
                    ➕ Agregar
                  </button>
                </div>
              </div>
            </div>

            {form.productos.length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: '#003b6f' }}>📋 Productos a producir ({form.productos.length})</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#e3f2fd' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Producto</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Cantidad</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.productos.map((p) => (
                      <tr key={p.producto_id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px' }}>{p.producto_nombre}</td>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                          {p.cantidad}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => eliminarProductoForm(p.producto_id)}
                            style={{
                              backgroundColor: '#f44336',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 10px',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                      <td style={{ padding: '8px' }}>TOTAL</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {form.productos.reduce((acc, p) => acc + p.cantidad, 0)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando || form.productos.length === 0}
              style={{
                padding: '12px 30px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: cargando || form.productos.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                opacity: cargando || form.productos.length === 0 ? 0.6 : 1
              }}
            >
              {cargando ? 'Guardando...' : editando ? '✅ Actualizar' : '✅ Guardar Producción'}
            </button>
          </form>
        </div>
      )}

      {/* ========================================== */}
      {/* DETALLE POR OPERARIO - PANEL PRINCIPAL */}
      {/* ========================================== */}
      <div style={{
        backgroundColor: '#f5f7fb',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '30px',
        border: '2px solid #003b6f'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, color: '#003b6f' }}>👷 Detalle por Operario</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ fontWeight: '500', color: '#003b6f' }}>📅 Fecha:</label>
            <input
              type="date"
              value={fechaSeleccionada}
              onChange={cambiarFecha}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '0.95rem'
              }}
            />
            <button
              onClick={() => {
                const hoy = new Date().toISOString().split('T')[0]
                setFechaSeleccionada(hoy)
                setTimeout(() => {
                  cargarDetalleOperarios()
                  cargarResumen()
                }, 100)
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#003b6f',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              📅 Hoy
            </button>
          </div>
        </div>

        {detalleOperarios.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '30px',
            color: '#999'
          }}>
            <p style={{ margin: 0 }}>No hay producción registrada para esta fecha</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {detalleOperarios.map((op) => (
              <div key={op.operario} style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '15px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                borderLeft: `4px solid ${op.area_color || '#003b6f'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#003b6f' }}>👤 {op.operario}</h3>
                    <span style={{
                      fontSize: '0.8rem',
                      color: op.area_color || '#666'
                    }}>
                      {op.area_icono || '🏭'} {op.area || 'Sin área'}
                    </span>
                  </div>
                  <span style={{
                    backgroundColor: op.area_color || '#003b6f',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.85rem'
                  }}>
                    Total: {op.total_general} u
                  </span>
                </div>

                <div style={{ marginTop: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #eee' }}>
                        <th style={{ padding: '4px 0', textAlign: 'left' }}>Producto</th>
                        <th style={{ padding: '4px 0', textAlign: 'center' }}>Cantidad</th>
                        <th style={{ padding: '4px 0', textAlign: 'center' }}>Registros</th>
                      </tr>
                    </thead>
                    <tbody>
                      {op.productos.map((p, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '6px 0' }}>{p.producto_nombre}</td>
                          <td style={{ padding: '6px 0', textAlign: 'center', fontWeight: 'bold', color: '#003b6f' }}>
                            {p.cantidad}
                          </td>
                          <td style={{ padding: '6px 0', textAlign: 'center', color: '#666' }}>
                            {p.numero_registros}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid #eee',
                  fontSize: '0.8rem',
                  color: '#999'
                }}>
                  📊 {op.productos.length} productos diferentes
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* RESUMEN DE PRODUCCIÓN */}
      {/* ========================================== */}
      <h2>📊 Resumen de producción hoy</h2>
      {resumen.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>Sin producción hoy</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f4f8' }}>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Área</th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Operario</th>
              <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>Total Producido</th>
              <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>Registros</th>
            </tr>
          </thead>
          <tbody>
            {resumen.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                  <span style={{ marginRight: '6px' }}>{item.area_icono || '🏭'}</span>
                  {item.area_nombre || 'Sin área'}
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.operario}</td>
                <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd', fontWeight: 'bold' }}>
                  {item.total_producido} unidades
                </td>
                <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>
                  {item.numero_registros}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ========================================== */}
      {/* HISTORIAL */}
      {/* ========================================== */}
      <h2>📋 Historial de Producción</h2>
      {producciones.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>No hay registros de producción</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {producciones.map((prod) => (
            <div key={prod.id} style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '15px',
              backgroundColor: 'white',
              borderLeft: `4px solid ${prod.area_color || '#003b6f'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: '0 0 5px 0' }}>{prod.producto_nombre || 'Producto sin nombre'}</h3>
                <span style={{
                  fontSize: '0.75rem',
                  backgroundColor: prod.area_color || '#eee',
                  color: prod.area_color ? 'white' : '#333',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {prod.area_icono || '🏭'} {prod.area_nombre || 'Sin área'}
                </span>
              </div>
              <p><strong>Operario:</strong> {prod.operario || 'N/A'}</p>
              <p><strong>Cantidad:</strong> {prod.cantidad}</p>
              <p><strong>Supervisor:</strong> {prod.supervisor_nombre || 'N/A'}</p>
              <p><strong>Fecha:</strong> {prod.fecha ? new Date(prod.fecha).toLocaleDateString() : 'N/A'}</p>
              {prod.observacion && <p><strong>Observación:</strong> {prod.observacion}</p>}

              {esSupervisor && (
                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleEdit(prod)}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(prod.id)}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              )}
              {!esSupervisor && (
                <p style={{ marginTop: '10px', color: '#999', fontSize: '0.75rem' }}>
                  Solo supervisores pueden editar/eliminar
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}

export default Produccion