import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Entregas() {
  const [codigo, setCodigo] = useState('')
  const [entrega, setEntrega] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [motivo, setMotivo] = useState('')
  const [recibidoPor, setRecibidoPor] = useState('')
  const [confirmacionRecibido, setConfirmacionRecibido] = useState(null)
  const [mostrarDevolucion, setMostrarDevolucion] = useState(false)

  useEffect(() => {
    limpiarTodo()
  }, [])

  const limpiarTodo = () => {
    setCodigo('')
    setEntrega(null)
    setMensaje('')
    setMotivo('')
    setRecibidoPor('')
    setConfirmacionRecibido(null)
    setMostrarDevolucion(false)
  }

  const buscarEntrega = async () => {
    if (!codigo.trim()) {
      alert('⚠️ Ingresa un código de entrega (número)')
      return
    }

    setCargando(true)
    setMensaje('')
    setConfirmacionRecibido(null)
    setMostrarDevolucion(false)
    setEntrega(null)

    try {
      const codigoLimpio = parseInt(codigo)
      if (isNaN(codigoLimpio)) {
        setMensaje('❌ Código inválido. Debe ser un número.')
        setCargando(false)
        return
      }

      const response = await fetch(`${API_URL}/entregas/codigo/${codigoLimpio}`)
      const data = await response.json()

      if (data.success) {
        setEntrega(data.entrega)
        setMensaje('')
      } else {
        setEntrega(null)
        setMensaje('❌ ' + (data.message || 'Código no válido'))
      }
    } catch (error) {
      console.error('Error buscando entrega:', error)
      setMensaje('❌ Error buscando la entrega')
    } finally {
      setCargando(false)
    }
  }

  const confirmarEntrega = async (entregado) => {
    if (!entregado) {
      if (!motivo.trim()) {
        alert('⚠️ Debes escribir el motivo de la no entrega')
        return
      }
      if (!confirmacionRecibido) {
        alert('⚠️ Debes confirmar si recibiste la mercancía o no')
        return
      }
    }

    setCargando(true)

    try {
      const usuario = JSON.parse(localStorage.getItem('usuario'))
      const codigoLimpio = parseInt(codigo)

      const body = {
        codigo: codigoLimpio,
        entregado: entregado,
        chofer_id: usuario.id
      }

      if (!entregado) {
        body.motivo = motivo
        body.recibido_por = recibidoPor || usuario.nombre
        body.recibido_confirmacion = confirmacionRecibido
      }

      const response = await fetch(`${API_URL}/entregas/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (data.success) {
        alert(entregado ? '✅ Entrega confirmada' : '❌ No entrega registrada')
        limpiarTodo()
      } else {
        alert('❌ Error: ' + (data.message || 'No se pudo procesar'))
      }
    } catch (error) {
      console.error('Error confirmando entrega:', error)
      alert('❌ Error procesando la entrega')
    } finally {
      setCargando(false)
    }
  }

  const handleEntregado = () => {
    if (window.confirm('¿Confirmas que entregaste la mercancía?')) {
      confirmarEntrega(true)
    }
  }

  const handleNoEntregado = () => {
    if (mostrarDevolucion) {
      setMostrarDevolucion(false)
      setConfirmacionRecibido(null)
      setMotivo('')
      return
    }
    setMostrarDevolucion(true)
    setConfirmacionRecibido(null)
    setMotivo('')
  }

  return (
    <AdminLayout>
      <h1>🚚 Entregas</h1>

      <div style={{ backgroundColor: '#f5f7fb', padding: '30px', borderRadius: '12px', maxWidth: '600px' }}>
        <h3>Ingresa el código de entrega (número)</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="number" 
            value={codigo} 
            onChange={(e) => setCodigo(e.target.value)} 
            placeholder="Ej: 1, 2, 3, 10, 25..." 
            style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1.1rem' }} 
          />
          <button 
            onClick={buscarEntrega} 
            disabled={cargando} 
            style={{ padding: '12px 24px', backgroundColor: '#003b6f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            {cargando ? 'Buscando...' : '🔍 Buscar'}
          </button>
          <button 
            onClick={limpiarTodo} 
            style={{ padding: '12px 24px', backgroundColor: '#757575', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            ✕ Limpiar
          </button>
        </div>
        {mensaje && <div style={{ marginTop: '15px', padding: '10px 15px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '8px' }}>{mensaje}</div>}
      </div>

      {entrega && (
        <div style={{ marginTop: '30px', backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '2px solid #003b6f' }}>
          <h2 style={{ color: '#003b6f' }}>📦 Detalle de la Entrega</h2>
          
          <div style={{ 
            backgroundColor: '#e3f2fd', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#003b6f' }}>
              <strong>Código de Entrega:</strong> 
              <span style={{ fontSize: '28px', fontWeight: 'bold', marginLeft: '10px', letterSpacing: '4px' }}>
                {String(entrega.codigo_numero || entrega.codigo).padStart(4, '0')}
              </span>
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <p><strong>Cliente:</strong> {entrega.cliente_nombre}</p>
            <p><strong>Teléfono:</strong> {entrega.cliente_telefono || 'N/A'}</p>
            <p style={{ gridColumn: '1 / -1' }}><strong>Dirección:</strong> {entrega.cliente_direccion}</p>
            {entrega.cliente_referencia && <p style={{ gridColumn: '1 / -1' }}><strong>Referencia:</strong> {entrega.cliente_referencia}</p>}
          </div>

          <h3>Productos</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f4f8' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Producto</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Cantidad</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Precio</th>
              </tr>
            </thead>
            <tbody>
              {entrega.detalles?.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{item.producto_nombre}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{item.cantidad}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>RD$ {Number(item.precio).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="2" style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#003b6f' }}>
                  RD$ {Number(entrega.total).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
            <button 
              onClick={handleEntregado}
              disabled={cargando} 
              style={{ flex: 1, padding: '14px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer' }}
            >
              ✅ Entregaste
            </button>
            <button 
              onClick={handleNoEntregado}
              disabled={cargando} 
              style={{ 
                flex: 1, 
                padding: '14px', 
                backgroundColor: mostrarDevolucion ? '#757575' : '#f44336', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                fontSize: '1.1rem', 
                cursor: 'pointer' 
              }}
            >
              {mostrarDevolucion ? '✕ Cancelar' : '❌ No Entregaste'}
            </button>
          </div>

          {mostrarDevolucion && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3e0', borderRadius: '8px', border: '1px solid #ff9800' }}>
              <h4 style={{ color: '#e65100', marginTop: 0 }}>⚠️ Devolución de Mercancía</h4>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>
                  ¿Recibiste la mercancía de vuelta?
                </label>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="recibido" 
                      value="si" 
                      checked={confirmacionRecibido === 'si'} 
                      onChange={() => setConfirmacionRecibido('si')} 
                    />
                    ✅ Sí, la recibí
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="recibido" 
                      value="no" 
                      checked={confirmacionRecibido === 'no'} 
                      onChange={() => setConfirmacionRecibido('no')} 
                    />
                    ❌ No, no la recibí
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Motivo de la no entrega:</label>
                <textarea 
                  value={motivo} 
                  onChange={(e) => setMotivo(e.target.value)} 
                  placeholder="Ej: Cliente no estaba en la dirección, se negó a recibir, etc." 
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', minHeight: '60px' }} 
                />
              </div>

              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Recibido por:</label>
                <input 
                  type="text" 
                  value={recibidoPor} 
                  onChange={(e) => setRecibidoPor(e.target.value)} 
                  placeholder="Nombre de quien recibe la devolución" 
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }} 
                />
              </div>

              <button 
                onClick={() => confirmarEntrega(false)} 
                disabled={!confirmacionRecibido || !motivo.trim() || cargando} 
                style={{ 
                  marginTop: '15px',
                  padding: '12px 30px',
                  backgroundColor: (confirmacionRecibido && motivo.trim()) ? '#f44336' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (confirmacionRecibido && motivo.trim()) ? 'pointer' : 'not-allowed',
                  fontSize: '1rem'
                }}
              >
                ❌ Confirmar No Entrega
              </button>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  )
}

export default Entregas