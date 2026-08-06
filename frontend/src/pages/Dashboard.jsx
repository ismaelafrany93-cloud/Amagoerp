import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Dashboard() {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [filtros, setFiltros] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    sucursal_id: '',
    usuario_id: ''
  })
  const [usuarios, setUsuarios] = useState([])
  const [mostrarMeta, setMostrarMeta] = useState(false)
  const [nuevaMeta, setNuevaMeta] = useState('')

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario.rol)
  const esSucursalPrincipal = usuario.sucursal_id === 3
  const sucursalId = usuario.sucursal_id || 3

  useEffect(() => {
    cargarDashboard()
    if (esAdmin) {
      cargarUsuarios()
    }
  }, [filtros])

  const cargarDashboard = async () => {
    setCargando(true)
    setError('')
    try {
      const params = new URLSearchParams({
        mes: filtros.mes,
        ano: filtros.ano,
        sucursal_id: filtros.sucursal_id || sucursalId || 3
      })
      
      if (filtros.usuario_id) {
        params.append('usuario_id', filtros.usuario_id)
      }
      
      const url = `${API_URL}/dashboard?${params.toString()}`
      console.log('📊 Cargando dashboard:', url)
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Error ${response.status}`)
      }
      const data = await response.json()
      setDatos(data)
    } catch (error) {
      console.error('Error cargando dashboard:', error)
      setError('Error al cargar el dashboard')
    } finally {
      setCargando(false)
    }
  }

  const cargarUsuarios = async () => {
    try {
      const url = `${API_URL}/dashboard/usuarios?sucursal_id=${sucursalId || 3}`
      const response = await fetch(url)
      const data = await response.json()
      setUsuarios(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando usuarios:', error)
    }
  }

  const guardarMeta = async () => {
    if (!nuevaMeta || parseFloat(nuevaMeta) <= 0) {
      alert('⚠️ Ingresa una meta válida')
      return
    }

    try {
      const response = await fetch(`${API_URL}/dashboard/objetivos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mes: filtros.mes,
          ano: filtros.ano,
          meta_ventas: parseFloat(nuevaMeta),
          sucursal_id: sucursalId || 3
        })
      })

      const data = await response.json()
      if (data.success) {
        alert('✅ Meta guardada correctamente')
        setMostrarMeta(false)
        setNuevaMeta('')
        cargarDashboard()
      } else {
        alert('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error guardando meta')
    }
  }

  const formatearPrecio = (valor) => {
    return `RD$ ${Number(valor).toFixed(2)}`
  }

  if (cargando) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Cargando dashboard...</h2>
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
            onClick={cargarDashboard}
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

  const resumen = datos?.resumen || {}
  const vendedores = datos?.vendedores || []
  const operarios = datos?.operarios || []
  const topProductos = datos?.top_productos || []
  const ventasPorDia = datos?.ventas_por_dia || []

  return (
    <AdminLayout>
      <h1>📊 Dashboard</h1>

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
          <label style={{ fontWeight: '500', marginRight: '5px' }}>📅 Mes:</label>
          <select
            value={filtros.mes}
            onChange={(e) => setFiltros({ ...filtros, mes: parseInt(e.target.value) })}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
          >
            <option value={1}>Enero</option>
            <option value={2}>Febrero</option>
            <option value={3}>Marzo</option>
            <option value={4}>Abril</option>
            <option value={5}>Mayo</option>
            <option value={6}>Junio</option>
            <option value={7}>Julio</option>
            <option value={8}>Agosto</option>
            <option value={9}>Septiembre</option>
            <option value={10}>Octubre</option>
            <option value={11}>Noviembre</option>
            <option value={12}>Diciembre</option>
          </select>
        </div>

        <div>
          <label style={{ fontWeight: '500', marginRight: '5px' }}>📆 Año:</label>
          <select
            value={filtros.ano}
            onChange={(e) => setFiltros({ ...filtros, ano: parseInt(e.target.value) })}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
        </div>

        {esAdmin && (
          <>
            <div>
              <label style={{ fontWeight: '500', marginRight: '5px' }}>👤 Empleado:</label>
              <select
                value={filtros.usuario_id}
                onChange={(e) => setFiltros({ ...filtros, usuario_id: e.target.value })}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ddd', minWidth: '150px' }}
              >
                <option value="">Todos</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
                ))}
              </select>
            </div>
          </>
        )}

        <button
          onClick={cargarDashboard}
          style={{
            padding: '8px 20px',
            backgroundColor: '#003b6f',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🔄 Actualizar
        </button>
      </div>

      {/* ========================================== */}
      {/* TARJETAS DE RESUMEN */}
      {/* ========================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '25px'
      }}>
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: '4px solid #003b6f'
        }}>
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>💰 Ventas del Mes</p>
          <h2 style={{ margin: '5px 0', color: '#003b6f' }}>{formatearPrecio(resumen.ventas?.total || 0)}</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>
            {resumen.ventas?.cantidad || 0} ventas · {formatearPrecio(resumen.ventas?.contado || 0)} contado
          </p>
        </div>

        <div style={{
          backgroundColor: '#fff3e0',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: '4px solid #ff9800'
        }}>
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>📋 Cuentas por Cobrar</p>
          <h2 style={{ margin: '5px 0', color: '#e65100' }}>{formatearPrecio(resumen.cuentas_cobrar?.total || 0)}</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>
            {resumen.cuentas_cobrar?.cantidad || 0} pendientes · {formatearPrecio(resumen.cuentas_cobrar?.vencido || 0)} vencido
          </p>
        </div>

        <div style={{
          backgroundColor: '#e8f5e9',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: '4px solid #4CAF50'
        }}>
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>📦 Cuentas por Pagar</p>
          <h2 style={{ margin: '5px 0', color: '#1b5e20' }}>{formatearPrecio(resumen.cuentas_pagar?.total || 0)}</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>
            {resumen.cuentas_pagar?.cantidad || 0} facturas pendientes
          </p>
        </div>

        <div style={{
          backgroundColor: '#f3e5f5',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: '4px solid #9C27B0'  // 👈 CORREGIDO
        }}>
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>🎯 Objetivo del Mes</p>
          <h2 style={{ margin: '5px 0', color: '#4a148c' }}>
            {resumen.objetivos?.porcentaje || 0}%
          </h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>
            {formatearPrecio(resumen.objetivos?.real || 0)} de {formatearPrecio(resumen.objetivos?.meta || 0)}
          </p>
          {esAdmin && (
            <button
              onClick={() => setMostrarMeta(!mostrarMeta)}
              style={{
                marginTop: '8px',
                padding: '4px 12px',
                backgroundColor: '#9C27B0',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              {mostrarMeta ? '✕ Cerrar' : '📝 Editar Meta'}
            </button>
          )}
          {mostrarMeta && esAdmin && (
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
              <input
                type="number"
                step="0.01"
                value={nuevaMeta}
                onChange={(e) => setNuevaMeta(e.target.value)}
                placeholder="Meta en RD$"
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.85rem'
                }}
              />
              <button
                onClick={guardarMeta}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Guardar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* GRÁFICO DE VENTAS POR DÍA */}
      {/* ========================================== */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '25px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h3 style={{ marginTop: 0, color: '#003b6f' }}>📈 Ventas Diarias</h3>
        <div style={{
          display: 'flex',
          gap: '4px',
          alignItems: 'flex-end',
          height: '150px',
          padding: '10px 0',
          overflowX: 'auto'
        }}>
          {ventasPorDia.length === 0 ? (
            <p style={{ color: '#999', padding: '20px' }}>No hay ventas registradas este mes</p>
          ) : (
            ventasPorDia.map((dia) => {
              const altura = Math.max((dia.total / (resumen.ventas?.total || 1)) * 130, 10)
              return (
                <div key={dia.dia} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1
                }}>
                  <div style={{
                    width: '100%',
                    height: `${altura}px`,
                    backgroundColor: '#003b6f',
                    borderRadius: '4px 4px 0 0',
                    opacity: 0.7,
                    minHeight: '5px'
                  }} />
                  <span style={{ fontSize: '0.6rem', color: '#666', marginTop: '4px' }}>
                    {dia.dia}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* DESGLOSE POR VENDEDORES */}
      {/* ========================================== */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '25px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h3 style={{ marginTop: 0, color: '#003b6f' }}>👤 Desglose por Vendedores</h3>
        {vendedores.length === 0 ? (
          <p style={{ color: '#999', padding: '20px', textAlign: 'center' }}>No hay vendedores registrados</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Vendedor</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Ventas</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Cantidad</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Contado</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Crédito</th>
                </tr>
              </thead>
              <tbody>
                {vendedores.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>
                      <strong>{v.nombre}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#999', marginLeft: '8px' }}>
                        {v.sucursal_nombre || 'Sin sucursal'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#003b6f' }}>
                      {formatearPrecio(v.total_ventas)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{v.cantidad_ventas || 0}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#4CAF50' }}>
                      {formatearPrecio(v.ventas_contado)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#ff9800' }}>
                      {formatearPrecio(v.ventas_credito)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* DESGLOSE POR OPERARIOS */}
      {/* ========================================== */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '25px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h3 style={{ marginTop: 0, color: '#003b6f' }}>🏭 Desglose por Operarios</h3>
        {operarios.length === 0 ? (
          <p style={{ color: '#999', padding: '20px', textAlign: 'center' }}>No hay operarios registrados</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Operario</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Área</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Total Producido</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Registros</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Productos</th>
                </tr>
              </thead>
              <tbody>
                {operarios.map((o) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>
                      <strong>{o.nombre}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#999', marginLeft: '8px' }}>
                        {o.sucursal_nombre || 'Sin sucursal'}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{
                        backgroundColor: '#e3f2fd',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        color: '#003b6f'
                      }}>
                        {o.area_nombre || 'Sin área'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#003b6f' }}>
                      {o.total_producido} unidades
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{o.cantidad_producciones || 0}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{o.productos_diferentes || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* TOP PRODUCTOS */}
      {/* ========================================== */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '25px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h3 style={{ marginTop: 0, color: '#003b6f' }}>🏆 Top Productos Más Vendidos</h3>
        {topProductos.length === 0 ? (
          <p style={{ color: '#999', padding: '20px', textAlign: 'center' }}>No hay productos vendidos este mes</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>#</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Producto</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Cantidad Vendida</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Veces Vendido</th>
                </tr>
              </thead>
              <tbody>
                {topProductos.map((p, index) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: index < 3 ? '#ff9800' : '#666' }}>
                      #{index + 1}
                    </td>
                    <td style={{ padding: '10px' }}>{p.nombre}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                      {p.total_vendido} unidades
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{p.veces_vendido || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default Dashboard