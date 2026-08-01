import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Creditos() {
  const [creditos, setCreditos] = useState([])
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({
    cliente_id: '',
    monto: '',
    descripcion: '',
    fecha_vencimiento: ''
  })

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const rol = usuario?.rol || ''
  const sucursalId = usuario?.sucursal_id || null
  const sucursalNombre = usuario?.sucursal_nombre || 'Principal'
  
  // 👇 PERMISOS - Dueño y Subgerente tienen los mismos permisos
  const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(rol)
  const esVendedor = ['vendedor', 'vendedora'].includes(rol)
  const esSuperAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(rol) // 👈 SUBGERENTE TAMBIÉN
  
  // 👇 DETERMINAR SI PUEDE VER TODOS LOS CRÉDITOS (DUEÑO Y SUBGERENTE)
  const puedeVerTodos = esSuperAdmin // Dueño y Subgerente ven todos

  useEffect(() => {
    cargarCreditos()
    if (esAdmin) {
      cargarClientes()
    }
  }, [])

  const cargarCreditos = async () => {
    setCargando(true)
    try {
      let url = `${API_URL}/creditos`
      
      // 👇 SIEMPRE FILTRAR POR SUCURSAL, EXCEPTO PARA DUEÑO Y SUBGERENTE
      if (!puedeVerTodos && sucursalId) {
        url = `${API_URL}/creditos?sucursal_id=${sucursalId}`
      }
      
      console.log('📊 Cargando créditos desde:', url)
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setCreditos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando créditos:', error)
      setMensaje('❌ Error cargando créditos')
      setCreditos([])
    } finally {
      setCargando(false)
    }
  }

  const cargarClientes = async () => {
    try {
      let url = `${API_URL}/clientes`
      if (!puedeVerTodos && sucursalId) {
        url = `${API_URL}/clientes?sucursal_id=${sucursalId}`
      }
      const response = await fetch(url)
      const data = await response.json()
      setClientes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando clientes:', error)
      setClientes([])
    }
  }

  const handleAgregarCredito = async (e) => {
    e.preventDefault()
    
    if (!esAdmin) {
      alert('⛔ No tienes permisos para agregar créditos')
      return
    }

    if (!form.cliente_id || !form.monto || form.monto <= 0) {
      alert('⚠️ Selecciona un cliente y un monto válido')
      return
    }

    setCargando(true)
    try {
      const response = await fetch(`${API_URL}/creditos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: parseInt(form.cliente_id),
          monto: parseFloat(form.monto),
          descripcion: form.descripcion,
          fecha_vencimiento: form.fecha_vencimiento || null,
          sucursal_id: sucursalId || 3
        })
      })

      const data = await response.json()
      if (data.success) {
        setMensaje('✅ Crédito agregado correctamente')
        setForm({ cliente_id: '', monto: '', descripcion: '', fecha_vencimiento: '' })
        setMostrarForm(false)
        cargarCreditos()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setMensaje('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setMensaje('❌ Error al agregar crédito')
    } finally {
      setCargando(false)
    }
  }

  const handlePagarCredito = async (creditoId) => {
    if (!esAdmin) {
      alert('⛔ No tienes permisos para pagar créditos')
      return
    }

    const monto = prompt('💰 ¿Cuánto desea abonar?')
    if (!monto || parseFloat(monto) <= 0) return

    setCargando(true)
    try {
      const response = await fetch(`${API_URL}/creditos/${creditoId}/pagar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: parseFloat(monto)
        })
      })

      const data = await response.json()
      if (data.success) {
        setMensaje(`✅ Abono de RD$ ${parseFloat(monto).toFixed(2)} registrado`)
        cargarCreditos()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setMensaje('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setMensaje('❌ Error al registrar abono')
    } finally {
      setCargando(false)
    }
  }

  const creditosFiltrados = creditos.filter(c => {
    if (filtroCliente && c.cliente_id !== parseInt(filtroCliente)) return false
    if (filtroEstado && c.estado !== filtroEstado) return false
    return true
  })

  const getEstadoColor = (estado) => {
    const colores = {
      'pendiente': '#ff9800',
      'pagado': '#4CAF50',
      'vencido': '#f44336',
      'cancelado': '#757575'
    }
    return colores[estado] || '#757575'
  }

  const getEstadoLabel = (estado) => {
    const estados = {
      'pendiente': '⏳ Pendiente',
      'pagado': '✅ Pagado',
      'vencido': '❌ Vencido',
      'cancelado': '🚫 Cancelado'
    }
    return estados[estado] || estado
  }

  if (cargando) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Cargando créditos...</h2>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <h1>💰 Créditos y Cobros</h1>

      {/* 👇 BANNER DE SUCURSAL */}
      <div style={{
        backgroundColor: '#e3f2fd',
        padding: '10px 15px',
        borderRadius: '8px',
        marginBottom: '20px',
        borderLeft: '4px solid #003b6f'
      }}>
        <p style={{ margin: 0, color: '#003b6f' }}>
          🏢 <strong>{puedeVerTodos ? 'Todas las sucursales' : sucursalNombre || 'Mi Sucursal'}</strong>
          {!puedeVerTodos && ' - Solo créditos de tu sucursal'}
        </p>
        {puedeVerTodos && (
          <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#666' }}>
            👑 Como Dueño o Subgerente puedes ver todos los créditos de todas las sucursales
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

      {esAdmin && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#003b6f',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            {mostrarForm ? '✕ Cancelar' : '➕ Agregar Crédito'}
          </button>
        </div>
      )}

      {mostrarForm && esAdmin && (
        <form onSubmit={handleAgregarCredito} style={{
          backgroundColor: '#f5f7fb',
          padding: '25px',
          borderRadius: '12px',
          marginBottom: '25px',
          border: '2px solid #003b6f'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>📝 Nuevo Crédito</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Cliente *</label>
              <select
                value={form.cliente_id}
                onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              >
                <option value="">Seleccionar cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Monto (RD$) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                required
                placeholder="0.00"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Fecha de Vencimiento</label>
              <input
                type="date"
                value={form.fecha_vencimiento}
                onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Descripción</label>
              <input
                type="text"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Motivo del crédito..."
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
            {cargando ? 'Guardando...' : '✅ Guardar Crédito'}
          </button>
        </form>
      )}

      {/* FILTROS */}
      <div style={{
        display: 'flex',
        gap: '15px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <select
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          style={{
            padding: '8px 16px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            minWidth: '200px'
          }}
        >
          <option value="">Todos los clientes</option>
          {clientes.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={{
            padding: '8px 16px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            minWidth: '150px'
          }}
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">⏳ Pendiente</option>
          <option value="pagado">✅ Pagado</option>
          <option value="vencido">❌ Vencido</option>
          <option value="cancelado">🚫 Cancelado</option>
        </select>

        <button
          onClick={cargarCreditos}
          style={{
            padding: '8px 20px',
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

      {/* TABLA DE CRÉDITOS */}
      <div style={{
        overflowX: 'auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#003b6f', color: 'white' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>#</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Cliente</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Monto</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Abonado</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Saldo</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Vencimiento</th>
              {esAdmin && (
                <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
              )}
            </tr>
          </thead>
          <tbody>
            {creditosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={esAdmin ? 8 : 7} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                  No hay créditos registrados
                </td>
              </tr>
            ) : (
              creditosFiltrados.map((c, index) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{index + 1}</td>
                  <td style={{ padding: '12px' }}>{c.cliente_nombre || 'N/A'}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    RD$ {Number(c.monto).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    RD$ {Number(c.abonado || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: (c.saldo || c.monto) > 0 ? '#f44336' : '#4CAF50' }}>
                    RD$ {Number(c.saldo || c.monto).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: getEstadoColor(c.estado),
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '0.75rem'
                    }}>
                      {getEstadoLabel(c.estado)}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString() : 'N/A'}
                  </td>
                  {esAdmin && (
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {c.estado !== 'pagado' && c.estado !== 'cancelado' && (
                        <button
                          onClick={() => handlePagarCredito(c.id)}
                          style={{
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 12px',
                            cursor: 'pointer',
                            marginRight: '5px'
                          }}
                        >
                          💰 Abonar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}

export default Creditos