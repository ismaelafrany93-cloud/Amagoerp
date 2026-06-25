import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Creditos() {
  const [clientes, setClientes] = useState([])
  const [cuentas, setCuentas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [selectedCliente, setSelectedCliente] = useState('')
  const [abonoMonto, setAbonoMonto] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarClientes()
    cargarCuentas()
  }, [])

  const cargarClientes = async () => {
    try {
      const response = await fetch(`${API_URL}/clientes`)
      const data = await response.json()
      setClientes(data)
    } catch (error) {
      console.error('Error cargando clientes:', error)
    }
  }

  const cargarCuentas = async () => {
    try {
      const response = await fetch(`${API_URL}/creditos`)
      const data = await response.json()
      setCuentas(data)
    } catch (error) {
      console.error('Error cargando cuentas:', error)
    } finally {
      setCargando(false)
    }
  }

  const registrarAbono = async (e) => {
    e.preventDefault()
    if (!selectedCliente || !abonoMonto || parseFloat(abonoMonto) <= 0) {
      alert('⚠️ Selecciona un cliente y un monto válido')
      return
    }

    try {
      const usuario = JSON.parse(localStorage.getItem('usuario'))
      
      const response = await fetch(`${API_URL}/creditos/abonos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: parseInt(selectedCliente),
          monto: parseFloat(abonoMonto),
          usuario_id: usuario.id
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('✅ Abono registrado correctamente')
        setAbonoMonto('')
        setSelectedCliente('')
        cargarClientes()
        cargarCuentas()
      } else {
        alert('❌ Error: ' + (data.error || 'No se pudo registrar'))
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error registrando abono')
    }
  }

  const totalDeuda = cuentas.reduce((acc, c) => acc + (c.saldo_pendiente || 0), 0)

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
      <h1>💰 Cuentas por Cobrar</h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{ backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ margin: 0, color: '#0d47a1' }}>💰 Total Deuda</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0 0 0', color: '#d32f2f' }}>
            RD$ {totalDeuda.toFixed(2)}
          </p>
        </div>
        <div style={{ backgroundColor: '#e8f5e9', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ margin: 0, color: '#1b5e20' }}>👥 Clientes con Deuda</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0 0 0' }}>
            {cuentas.filter(c => c.saldo_pendiente > 0).length}
          </p>
        </div>
      </div>

      <div style={{
        border: '2px solid #003b6f',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '30px',
        backgroundColor: '#f8faff'
      }}>
        <h3 style={{ marginTop: 0, color: '#003b6f' }}>💵 Registrar Abono</h3>
        <form onSubmit={registrarAbono}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Cliente *</label>
              <select
                value={selectedCliente}
                onChange={(e) => setSelectedCliente(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              >
                <option value="">Seleccionar cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} - Debe: RD$ {c.saldo_pendiente?.toFixed(2) || '0.00'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Monto del Abono *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={abonoMonto}
                onChange={(e) => setAbonoMonto(e.target.value)}
                required
                placeholder="0.00"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>
          </div>
          <button
            type="submit"
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
            ✅ Registrar Abono
          </button>
        </form>
      </div>

      <h2>📋 Clientes con Deuda</h2>
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
            <th style={{ padding: '12px', textAlign: 'left' }}>Cliente</th>
            <th style={{ padding: '12px', textAlign: 'right' }}>Teléfono</th>
            <th style={{ padding: '12px', textAlign: 'right' }}>Total Ventas</th>
            <th style={{ padding: '12px', textAlign: 'right' }}>Abonado</th>
            <th style={{ padding: '12px', textAlign: 'right' }}>Saldo Pendiente</th>
          </tr>
        </thead>
        <tbody>
          {cuentas.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                No hay cuentas por cobrar
              </td>
            </tr>
          ) : (
            cuentas.map((c, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{c.cliente_nombre}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>{c.telefono || 'N/A'}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>RD$ {Number(c.total_venta).toFixed(2)}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>RD$ {Number(c.abonado).toFixed(2)}</td>
                <td style={{
                  padding: '12px',
                  textAlign: 'right',
                  color: (c.saldo_pendiente || 0) > 0 ? '#d32f2f' : '#4CAF50',
                  fontWeight: (c.saldo_pendiente || 0) > 0 ? 'bold' : 'normal'
                }}>
                  RD$ {Number(c.saldo_pendiente).toFixed(2)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminLayout>
  )
}

export default Creditos