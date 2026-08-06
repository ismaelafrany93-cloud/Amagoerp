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
    sucursal_id: ''
  })
  const [sucursales, setSucursales] = useState([])

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario.rol)
  const sucursalId = usuario.sucursal_id || 3

  useEffect(() => {
    cargarDashboard()
    cargarSucursales()
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

  const cargarSucursales = async () => {
    try {
      const response = await fetch(`${API_URL}/sucursales`)
      const data = await response.json()
      setSucursales(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando sucursales:', error)
      setSucursales([])
    }
  }

  const formatearPrecio = (valor) => {
    return `RD$ ${Number(valor).toFixed(2)}`
  }

  const getNombreMes = (mes) => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return meses[mes - 1] || mes
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
  const ventasPorMes = datos?.ventas_por_mes || []
  const topProductos = datos?.top_productos || []
  const vendedores = datos?.vendedores || []

  const maxVentas = Math.max(...ventasPorMes.map(m => m.total), 1)

  return (
    <AdminLayout>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h1 style={{ margin: 0 }}>📊 Dashboard Financiero</h1>
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: '#003b6f'
        }}>
          📅 {getNombreMes(filtros.mes)} {filtros.ano}
        </div>
      </div>

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
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m}>{getNombreMes(m)}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontWeight: '500', marginRight: '5px' }}>📆 Año:</label>
          <select
            value={filtros.ano}
            onChange={(e) => setFiltros({ ...filtros, ano: parseInt(e.target.value) })}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
          >
            {[2024, 2025, 2026].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {esAdmin && (
          <div>
            <label style={{ fontWeight: '500', marginRight: '5px' }}>🏢 Sucursal:</label>
            <select
              value={filtros.sucursal_id}
              onChange={(e) => setFiltros({ ...filtros, sucursal_id: e.target.value })}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ddd', minWidth: '150px' }}
            >
              <option value="">Todas</option>
              {sucursales.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
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
      
      {/* Ventas del Día */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: '4px solid #003b6f'
        }}>
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>📅 Ventas del Día</p>
          <h2 style={{ margin: '5px 0', color: '#003b6f' }}>{formatearPrecio(resumen.ventas_dia?.total || 0)}</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>
            {resumen.ventas_dia?.cantidad || 0} ventas · {formatearPrecio(resumen.ventas_dia?.contado || 0)} contado
          </p>
        </div>

        <div style={{
          backgroundColor: '#e8f5e9',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: '4px solid #4CAF50'
        }}>
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>📈 Ventas del Mes</p>
          <h2 style={{ margin: '5px 0', color: '#1b5e20' }}>{formatearPrecio(resumen.ventas_mes?.total || 0)}</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>
            {resumen.ventas_mes?.cantidad || 0} ventas · {formatearPrecio(resumen.ventas_mes?.credito || 0)} crédito
          </p>
        </div>

        <div style={{
          backgroundColor: '#fff3e0',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: '4px solid #ff9800'
        }}>
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>📊 Ventas del Año</p>
          <h2 style={{ margin: '5px 0', color: '#e65100' }}>{formatearPrecio(resumen.ventas_ano?.total || 0)}</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>
            {resumen.ventas_ano?.cantidad || 0} ventas totales
          </p>
        </div>

        <div style={{
          backgroundColor: '#f3e5f5',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: '4px solid #9C27B0'
        }}>
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>💰 Ganancia Neta</p>
          <h2 style={{ margin: '5px 0', color: '#4a148c' }}>
            {formatearPrecio(resumen.ganancia?.bruta || 0)}
          </h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>
            Margen: {resumen.ganancia?.margen?.toFixed(1) || 0}%
          </p>
        </div>
      </div>

      {/* ========================================== */}
      {/* CUENTAS POR COBRAR Y PAGAR */}
      {/* ========================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '25px'
      }}>
        {/* Cuentas por Cobrar */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ marginTop: 0, color: '#ff9800' }}>📋 Cuentas por Cobrar</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Total Pendiente</p>
              <h3 style={{ margin: 0, color: '#e65100' }}>{formatearPrecio(resumen.cuentas_cobrar?.total || 0)}</h3>
            </div>
            <div>
              <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Cantidad</p>
              <h3 style={{ margin: 0, color: '#003b6f' }}>{resumen.cuentas_cobrar?.cantidad || 0}</h3>
            </div>
          </div>
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                backgroundColor: '#ffebee',
                color: '#c62828',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem'
              }}>
                🔴 +30 días: {formatearPrecio(resumen.cuentas_cobrar?.vencido_30 || 0)}
              </span>
              <span style={{
                backgroundColor: '#ffcdd2',
                color: '#b71c1c',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem'
              }}>
                🔴 +60 días: {formatearPrecio(resumen.cuentas_cobrar?.vencido_60 || 0)}
              </span>
              <span style={{
                backgroundColor: '#ef9a9a',
                color: '#880e4f',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem'
              }}>
                🔴 +90 días: {formatearPrecio(resumen.cuentas_cobrar?.vencido_90 || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Cuentas por Pagar */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ marginTop: 0, color: '#f44336' }}>📦 Cuentas por Pagar</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Total Pendiente</p>
              <h3 style={{ margin: 0, color: '#c62828' }}>{formatearPrecio(resumen.cuentas_pagar?.total || 0)}</h3>
            </div>
            <div>
              <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Cantidad</p>
              <h3 style={{ margin: 0, color: '#003b6f' }}>{resumen.cuentas_pagar?.cantidad || 0}</h3>
            </div>
          </div>
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                backgroundColor: '#ffebee',
                color: '#c62828',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem'
              }}>
                🔴 +30 días: {formatearPrecio(resumen.cuentas_pagar?.vencido_30 || 0)}
              </span>
              <span style={{
                backgroundColor: '#ffcdd2',
                color: '#b71c1c',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem'
              }}>
                🔴 +60 días: {formatearPrecio(resumen.cuentas_pagar?.vencido_60 || 0)}
              </span>
              <span style={{
                backgroundColor: '#ef9a9a',
                color: '#880e4f',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem'
              }}>
                🔴 +90 días: {formatearPrecio(resumen.cuentas_pagar?.vencido_90 || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* INVERSIÓN Y GANANCIA */}
      {/* ========================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '15px',
        marginBottom: '25px'
      }}>
        <div style={{
          backgroundColor: '#e8f5e9',
          padding: '15px',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid #4CAF50'
        }}>
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>💰 Inversión en Producción</p>
          <h2 style={{ margin: '5px 0', color: '#1b5e20' }}>{formatearPrecio(resumen.inversion?.total || 0)}</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>
            {resumen.inversion?.cantidad_producciones || 0} producciones
          </p>
        </div>

        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '15px',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid #003b6f'
        }}>
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>📈 Ventas del Mes</p>
          <h2 style={{ margin: '5px 0', color: '#003b6f' }}>{formatearPrecio(resumen.ventas_mes?.total || 0)}</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>
            {resumen.ventas_mes?.cantidad || 0} ventas
          </p>
        </div>

        <div style={{
          backgroundColor: '#f3e5f5',
          padding: '15px',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid #9C27B0'
        }}>
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>🎯 Margen de Ganancia</p>
          <h2 style={{ margin: '5px 0', color: '#4a148c' }}>
            {resumen.ganancia?.margen?.toFixed(1) || 0}%
          </h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>
            Ganancia: {formatearPrecio(resumen.ganancia?.bruta || 0)}
          </p>
        </div>
      </div>

      {/* ========================================== */}
      {/* GRÁFICO DE VENTAS POR MES */}
      {/* ========================================== */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '25px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h3 style={{ marginTop: 0, color: '#003b6f' }}>📈 Ventas Mensuales {filtros.ano}</h3>
        <div style={{
          display: 'flex',
          gap: '6px',
          alignItems: 'flex-end',
          height: '200px',
          padding: '10px 0',
          overflowX: 'auto'
        }}>
          {ventasPorMes.length === 0 ? (
            <p style={{ color: '#999', padding: '20px' }}>No hay ventas registradas este año</p>
          ) : (
            ventasPorMes.map((mes) => {
              const altura = Math.max((mes.total / (maxVentas || 1)) * 170, 10)
              return (
                <div key={mes.mes} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                  minWidth: '40px'
                }}>
                  <div style={{
                    width: '100%',
                    height: `${altura}px`,
                    backgroundColor: '#003b6f',
                    borderRadius: '4px 4px 0 0',
                    opacity: 0.7,
                    minHeight: '5px',
                    transition: 'height 0.3s ease'
                  }} />
                  <span style={{ fontSize: '0.6rem', color: '#666', marginTop: '4px' }}>
                    {getNombreMes(mes.mes).substring(0, 3)}
                  </span>
                  <span style={{ fontSize: '0.5rem', color: '#999' }}>
                    {formatearPrecio(mes.total)}
                  </span>
                </div>
              )
            })
          )}
        </div>
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
        <h3 style={{ marginTop: 0, color: '#003b6f' }}>🏆 Top 10 Productos Más Vendidos</h3>
        {topProductos.length === 0 ? (
          <p style={{ color: '#999', padding: '20px', textAlign: 'center' }}>No hay productos vendidos este mes</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>#</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Producto</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Unidades</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {topProductos.map((p, index) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: index < 3 ? '#ff9800' : '#666' }}>
                      #{index + 1}
                    </td>
                    <td style={{ padding: '8px' }}>{p.nombre}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                      {p.total_vendido}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#003b6f' }}>
                      {formatearPrecio(p.total_ingresos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                  <th style={{ padding: '8px', textAlign: 'left' }}>Vendedor</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Ventas</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {vendedores.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>
                      <strong>{v.nombre}</strong>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#003b6f' }}>
                      {formatearPrecio(v.total_ventas)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{v.cantidad_ventas || 0}</td>
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