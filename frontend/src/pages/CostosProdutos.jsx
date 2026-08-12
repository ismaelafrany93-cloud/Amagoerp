import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function CostosProductos() {
  const [productos, setProductos] = useState([])
  const [costos, setCostos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [gananciaTotal, setGananciaTotal] = useState(null)
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1)
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear())

  const [nuevoCosto, setNuevoCosto] = useState({
    producto_id: '',
    costo_unitario: 0,
    costo_materiales: 0,
    costo_mano_obra: 0,
    costo_transporte: 0,
    otros_costos: 0
  })

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario?.rol)
  const sucursalId = usuario?.sucursal_id || 3

  useEffect(() => {
    if (esAdmin) {
      cargarProductos()
      cargarCostos()
      cargarGananciaTotal()
    }
  }, [filtroMes, filtroAno])

  const cargarProductos = async () => {
    try {
      const response = await fetch(`${API_URL}/productos`)
      const data = await response.json()
      setProductos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const cargarCostos = async () => {
    try {
      const response = await fetch(`${API_URL}/costos-productos?sucursal_id=${sucursalId}`)
      const data = await response.json()
      setCostos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const cargarGananciaTotal = async () => {
    try {
      const response = await fetch(
        `${API_URL}/costos-productos/ganancia-total?mes=${filtroMes}&ano=${filtroAno}&sucursal_id=${sucursalId}`
      )
      const data = await response.json()
      setGananciaTotal(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const guardarCosto = async () => {
    if (!nuevoCosto.producto_id || !nuevoCosto.costo_unitario) {
      setError('⚠️ Producto y costo unitario son requeridos')
      return
    }

    try {
      const response = await fetch(`${API_URL}/costos-productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nuevoCosto,
          sucursal_id: sucursalId,
          created_by: usuario.id
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setMensaje('✅ Costo registrado correctamente')
        setMostrarFormulario(false)
        setNuevoCosto({
          producto_id: '',
          costo_unitario: 0,
          costo_materiales: 0,
          costo_mano_obra: 0,
          costo_transporte: 0,
          otros_costos: 0
        })
        cargarCostos()
        cargarGananciaTotal()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setError('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('❌ Error al registrar costo')
    }
  }

  const formatearPrecio = (valor) => {
    return `RD$ ${Number(valor).toFixed(2)}`
  }

  const getNombreMes = (mes) => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return meses[mes - 1] || mes
  }

  if (!esAdmin) {
    return (
      <AdminLayout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>⛔ Acceso Denegado</h2>
          <p>No tienes permisos para ver este módulo</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* HEADER */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px',
          flexWrap: 'wrap',
          gap: '15px',
          background: 'linear-gradient(135deg, #003b6f, #005a9c)',
          padding: '20px 30px',
          borderRadius: '16px',
          color: 'white'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>📊 Costos y Ganancias</h1>
            <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
              {costos.length} productos con costo registrado
            </p>
          </div>
          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            style={{
              padding: '10px 24px',
              backgroundColor: mostrarFormulario ? '#ff5722' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 'bold'
            }}
          >
            {mostrarFormulario ? '✕ Cancelar' : '+ Registrar Costo'}
          </button>
        </div>

        {/* MENSAJES */}
        {mensaje && (
          <div style={{
            backgroundColor: '#e8f5e9',
            color: '#1b5e20',
            padding: '12px 20px',
            borderRadius: '10px',
            marginBottom: '15px',
            borderLeft: '4px solid #4CAF50'
          }}>
            {mensaje}
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '12px 20px',
            borderRadius: '10px',
            marginBottom: '15px',
            borderLeft: '4px solid #f44336'
          }}>
            {error}
            <button
              onClick={() => setError('')}
              style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* RESUMEN DE GANANCIA */}
        {gananciaTotal && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '18px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              textAlign: 'center',
              borderTop: '4px solid #003b6f'
            }}>
              <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>
                📊 {getNombreMes(filtroMes)} {filtroAno}
              </p>
              <h2 style={{ margin: '5px 0', color: '#003b6f' }}>
                {formatearPrecio(gananciaTotal.total_ventas)}
              </h2>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#666' }}>Total Ventas</p>
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '18px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              textAlign: 'center',
              borderTop: '4px solid #FF9800'
            }}>
              <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>💰 Costo Total</p>
              <h2 style={{ margin: '5px 0', color: '#e65100' }}>
                {formatearPrecio(gananciaTotal.total_costo)}
              </h2>
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '18px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              textAlign: 'center',
              borderTop: '4px solid #4CAF50'
            }}>
              <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>📈 Ganancia Bruta</p>
              <h2 style={{ margin: '5px 0', color: '#1b5e20' }}>
                {formatearPrecio(gananciaTotal.ganancia_bruta)}
              </h2>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#666' }}>
                Margen: {gananciaTotal.margen_ganancia?.toFixed(1)}%
              </p>
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '18px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              textAlign: 'center',
              borderTop: '4px solid #9C27B0'
            }}>
              <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>📊 Productos</p>
              <h2 style={{ margin: '5px 0', color: '#4a148c' }}>
                {gananciaTotal.detalle?.length || 0}
              </h2>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#666' }}>unidades vendidas</p>
            </div>
          </div>
        )}

        {/* FILTROS */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '15px 20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex',
          gap: '15px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div>
            <label style={{ fontWeight: '500', marginRight: '5px', color: '#555' }}>📅 Mes:</label>
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(parseInt(e.target.value))}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }}
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                <option key={m} value={m}>{getNombreMes(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: '500', marginRight: '5px', color: '#555' }}>📆 Año:</label>
            <select
              value={filtroAno}
              onChange={(e) => setFiltroAno(parseInt(e.target.value))}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }}
            >
              {[2024, 2025, 2026, 2027].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <button
            onClick={cargarGananciaTotal}
            style={{
              padding: '8px 24px',
              backgroundColor: '#003b6f',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🔄 Actualizar
          </button>
        </div>

        {/* FORMULARIO NUEVO COSTO */}
        {mostrarFormulario && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '25px',
            marginBottom: '20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, color: '#003b6f' }}>📝 Registrar Costo de Producto</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '15px'
            }}>
              <select
                value={nuevoCosto.producto_id}
                onChange={(e) => setNuevoCosto({ ...nuevoCosto, producto_id: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              >
                <option value="">Seleccionar Producto *</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Costo Unitario *"
                value={nuevoCosto.costo_unitario || ''}
                onChange={(e) => setNuevoCosto({ ...nuevoCosto, costo_unitario: parseFloat(e.target.value) || 0 })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <input
                type="number"
                placeholder="Costo Materiales"
                value={nuevoCosto.costo_materiales || ''}
                onChange={(e) => setNuevoCosto({ ...nuevoCosto, costo_materiales: parseFloat(e.target.value) || 0 })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <input
                type="number"
                placeholder="Costo Mano de Obra"
                value={nuevoCosto.costo_mano_obra || ''}
                onChange={(e) => setNuevoCosto({ ...nuevoCosto, costo_mano_obra: parseFloat(e.target.value) || 0 })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <input
                type="number"
                placeholder="Costo Transporte"
                value={nuevoCosto.costo_transporte || ''}
                onChange={(e) => setNuevoCosto({ ...nuevoCosto, costo_transporte: parseFloat(e.target.value) || 0 })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <input
                type="number"
                placeholder="Otros Costos"
                value={nuevoCosto.otros_costos || ''}
                onChange={(e) => setNuevoCosto({ ...nuevoCosto, otros_costos: parseFloat(e.target.value) || 0 })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button
                onClick={guardarCosto}
                style={{
                  padding: '12px 40px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                💾 Guardar Costo
              </button>
              <button
                onClick={() => setMostrarFormulario(false)}
                style={{
                  padding: '12px 30px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* TABLA DE COSTOS */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          overflowX: 'auto'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>📋 Costos de Productos</h3>
          
          {costos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <p style={{ fontSize: '1.2rem' }}>📭 No hay costos registrados</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f7fa', borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>Producto</th>
                  <th style={{ padding: '10px 15px', textAlign: 'right' }}>Precio Venta</th>
                  <th style={{ padding: '10px 15px', textAlign: 'right' }}>Costo Unitario</th>
                  <th style={{ padding: '10px 15px', textAlign: 'right' }}>Ganancia</th>
                  <th style={{ padding: '10px 15px', textAlign: 'center' }}>Margen</th>
                  <th style={{ padding: '10px 15px', textAlign: 'center' }}>Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {costos.map(c => {
                  const ganancia = c.precio_venta - c.costo_unitario
                  const margen = c.precio_venta > 0 ? (ganancia / c.precio_venta) * 100 : 0
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 15px' }}>
                        <strong>{c.producto_nombre}</strong>
                      </td>
                      <td style={{ padding: '10px 15px', textAlign: 'right' }}>
                        {formatearPrecio(c.precio_venta)}
                      </td>
                      <td style={{ padding: '10px 15px', textAlign: 'right' }}>
                        {formatearPrecio(c.costo_unitario)}
                      </td>
                      <td style={{ padding: '10px 15px', textAlign: 'right', color: ganancia > 0 ? '#4CAF50' : '#f44336' }}>
                        {formatearPrecio(ganancia)}
                      </td>
                      <td style={{ padding: '10px 15px', textAlign: 'center' }}>
                        <span style={{
                          backgroundColor: margen > 30 ? '#e8f5e9' : margen > 15 ? '#fff3e0' : '#ffebee',
                          color: margen > 30 ? '#1b5e20' : margen > 15 ? '#e65100' : '#c62828',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.8rem'
                        }}>
                          {margen.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: '10px 15px', textAlign: 'center', fontSize: '0.75rem', color: '#999' }}>
                        {new Date(c.fecha_actualizacion).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default CostosProductos