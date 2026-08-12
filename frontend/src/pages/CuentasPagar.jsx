import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function CuentasPagar() {
  const [cuentas, setCuentas] = useState([])
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  
  const [nuevaCuenta, setNuevaCuenta] = useState({
    proveedor: '',
    concepto: '',
    monto_total: 0,
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: new Date().toISOString().split('T')[0],
    tipo: 'proveedor',
    factura_numero: '',
    observaciones: ''
  })

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario?.rol)
  const sucursalId = usuario?.sucursal_id || 3

  useEffect(() => {
    if (esAdmin) {
      cargarCuentas()
      cargarResumen()
    }
  }, [filtroEstado])

  const cargarCuentas = async () => {
    setCargando(true)
    try {
      let url = `${API_URL}/cuentas-pagar?sucursal_id=${sucursalId}`
      if (filtroEstado !== 'todos') {
        url += `&estado=${filtroEstado}`
      }
      const response = await fetch(url)
      const data = await response.json()
      setCuentas(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error:', error)
      setError('Error al cargar cuentas')
    } finally {
      setCargando(false)
    }
  }

  const cargarResumen = async () => {
    try {
      const response = await fetch(`${API_URL}/cuentas-pagar/resumen?sucursal_id=${sucursalId}`)
      const data = await response.json()
      setResumen(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const guardarCuenta = async () => {
    if (!nuevaCuenta.proveedor || !nuevaCuenta.concepto || !nuevaCuenta.monto_total) {
      setError('⚠️ Proveedor, concepto y monto son requeridos')
      return
    }

    try {
      const response = await fetch(`${API_URL}/cuentas-pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nuevaCuenta,
          sucursal_id: sucursalId,
          created_by: usuario.id
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setMensaje('✅ Cuenta creada correctamente')
        setMostrarFormulario(false)
        setNuevaCuenta({
          proveedor: '',
          concepto: '',
          monto_total: 0,
          fecha_emision: new Date().toISOString().split('T')[0],
          fecha_vencimiento: new Date().toISOString().split('T')[0],
          tipo: 'proveedor',
          factura_numero: '',
          observaciones: ''
        })
        cargarCuentas()
        cargarResumen()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setError('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('❌ Error al crear cuenta')
    }
  }

  const pagarCuenta = async (id, montoPendiente) => {
    const monto = prompt(`¿Cuánto deseas pagar? (Pendiente: RD$ ${montoPendiente.toFixed(2)})`)
    if (!monto) return
    
    const montoPagado = parseFloat(monto)
    if (isNaN(montoPagado) || montoPagado <= 0) {
      setError('⚠️ Monto inválido')
      return
    }

    try {
      const response = await fetch(`${API_URL}/cuentas-pagar/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto_pagado: montoPagado,
          fecha_pago: new Date().toISOString().split('T')[0]
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setMensaje('✅ Pago registrado correctamente')
        cargarCuentas()
        cargarResumen()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setError('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('❌ Error al registrar pago')
    }
  }

  const eliminarCuenta = async (id) => {
    if (!window.confirm('¿Eliminar esta cuenta?')) return

    try {
      const response = await fetch(`${API_URL}/cuentas-pagar/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        setMensaje('✅ Cuenta eliminada')
        cargarCuentas()
        cargarResumen()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setError('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('❌ Error al eliminar')
    }
  }

  const formatearPrecio = (valor) => {
    return `RD$ ${Number(valor).toFixed(2)}`
  }

  const getEstadoColor = (estado) => {
    const colores = {
      'pendiente': '#FF9800',
      'parcial': '#2196F3',
      'pagado': '#4CAF50'
    }
    return colores[estado] || '#666'
  }

  const getEstadoEmoji = (estado) => {
    const emojis = {
      'pendiente': '⏳',
      'parcial': '🔄',
      'pagado': '✅'
    }
    return emojis[estado] || '❓'
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
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>📋 Cuentas por Pagar</h1>
            <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
              {cuentas.length} cuentas registradas
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
            {mostrarFormulario ? '✕ Cancelar' : '+ Nueva Cuenta'}
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

        {/* RESUMEN */}
        {resumen && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '15px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              textAlign: 'center',
              borderTop: '4px solid #003b6f'
            }}>
              <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Total Adeudado</p>
              <h3 style={{ margin: '5px 0', color: '#003b6f' }}>
                {formatearPrecio(resumen.total_adeudado)}
              </h3>
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '15px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              textAlign: 'center',
              borderTop: '4px solid #4CAF50'
            }}>
              <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Pagado</p>
              <h3 style={{ margin: '5px 0', color: '#1b5e20' }}>
                {formatearPrecio(resumen.total_pagado)}
              </h3>
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '15px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              textAlign: 'center',
              borderTop: '4px solid #FF9800'
            }}>
              <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Pendiente</p>
              <h3 style={{ margin: '5px 0', color: '#e65100' }}>
                {formatearPrecio(resumen.total_pendiente)}
              </h3>
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '15px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              textAlign: 'center',
              borderTop: '4px solid #9C27B0'
            }}>
              <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Cuentas</p>
              <h3 style={{ margin: '5px 0', color: '#4a148c' }}>
                {resumen.pendientes + resumen.parciales} pendientes · {resumen.pagados} pagadas
              </h3>
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
            <label style={{ fontWeight: '500', marginRight: '5px', color: '#555' }}>📊 Estado:</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }}
            >
              <option value="todos">Todos</option>
              <option value="pendiente">⏳ Pendientes</option>
              <option value="parcial">🔄 Parciales</option>
              <option value="pagado">✅ Pagados</option>
            </select>
          </div>
          <button
            onClick={cargarCuentas}
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

        {/* FORMULARIO NUEVA CUENTA */}
        {mostrarFormulario && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '25px',
            marginBottom: '20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, color: '#003b6f' }}>📝 Nueva Cuenta por Pagar</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '15px'
            }}>
              <input
                type="text"
                placeholder="Proveedor *"
                value={nuevaCuenta.proveedor}
                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, proveedor: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <input
                type="text"
                placeholder="Concepto *"
                value={nuevaCuenta.concepto}
                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, concepto: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <input
                type="number"
                placeholder="Monto Total *"
                value={nuevaCuenta.monto_total || ''}
                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, monto_total: parseFloat(e.target.value) || 0 })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <input
                type="date"
                label="Fecha Emisión"
                value={nuevaCuenta.fecha_emision}
                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, fecha_emision: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <input
                type="date"
                label="Fecha Vencimiento"
                value={nuevaCuenta.fecha_vencimiento}
                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, fecha_vencimiento: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <select
                value={nuevaCuenta.tipo}
                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, tipo: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              >
                <option value="proveedor">🏭 Proveedor</option>
                <option value="servicio">⚡ Servicio</option>
                <option value="material">🔧 Material</option>
              </select>
              <input
                type="text"
                placeholder="Factura #"
                value={nuevaCuenta.factura_numero}
                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, factura_numero: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <textarea
                placeholder="Observaciones"
                value={nuevaCuenta.observaciones}
                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, observaciones: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '60px' }}
              />
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button
                onClick={guardarCuenta}
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
                💾 Guardar Cuenta
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

        {/* TABLA DE CUENTAS */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          overflowX: 'auto'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>📋 Lista de Cuentas</h3>
          
          {cuentas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <p style={{ fontSize: '1.2rem' }}>📭 No hay cuentas registradas</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f7fa', borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>Proveedor</th>
                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>Concepto</th>
                  <th style={{ padding: '10px 15px', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '10px 15px', textAlign: 'right' }}>Pagado</th>
                  <th style={{ padding: '10px 15px', textAlign: 'right' }}>Pendiente</th>
                  <th style={{ padding: '10px 15px', textAlign: 'center' }}>Vencimiento</th>
                  <th style={{ padding: '10px 15px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '10px 15px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cuentas.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 15px' }}><strong>{c.proveedor}</strong></td>
                    <td style={{ padding: '10px 15px' }}>{c.concepto}</td>
                    <td style={{ padding: '10px 15px', textAlign: 'right' }}>
                      {formatearPrecio(c.monto_total)}
                    </td>
                    <td style={{ padding: '10px 15px', textAlign: 'right', color: '#4CAF50' }}>
                      {formatearPrecio(c.monto_pagado)}
                    </td>
                    <td style={{ padding: '10px 15px', textAlign: 'right', color: '#e65100' }}>
                      {formatearPrecio(c.monto_pendiente)}
                    </td>
                    <td style={{ padding: '10px 15px', textAlign: 'center' }}>
                      {new Date(c.fecha_vencimiento).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 15px', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: getEstadoColor(c.estado) + '20',
                        color: getEstadoColor(c.estado),
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.8rem'
                      }}>
                        {getEstadoEmoji(c.estado)} {c.estado}
                      </span>
                    </td>
                    <td style={{ padding: '10px 15px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {c.estado !== 'pagado' && (
                          <button
                            onClick={() => pagarCuenta(c.id, c.monto_pendiente)}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                          >
                            💰 Pagar
                          </button>
                        )}
                        <button
                          onClick={() => eliminarCuenta(c.id)}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default CuentasPagar