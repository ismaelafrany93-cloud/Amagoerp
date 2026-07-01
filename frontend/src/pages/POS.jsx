import { useState, useEffect, useMemo, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import AdminLayout from '../layouts/AdminLayout'
import Factura from '../components/Factura'
import API_URL from '../config'

function POS() {
  const [productos, setProductos] = useState([])
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(false)
  
  const [tipoPago, setTipoPago] = useState('contado')
  const [tipoEntrega, setTipoEntrega] = useState('retiro')
  
  const [codigoEntrega, setCodigoEntrega] = useState('')
  const [ventaCompletada, setVentaCompletada] = useState(false)
  const [ventaId, setVentaId] = useState(null)

  const [costoEnvio, setCostoEnvio] = useState('')
  const [descuento, setDescuento] = useState('')
  const [codigoAutorizacion, setCodigoAutorizacion] = useState('')
  const [mostrarAutorizacion, setMostrarAutorizacion] = useState(false)

  const [cliente, setCliente] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    referencia: '',
    detalles: ''
  })

  const facturaRef = useRef()

  const handlePrint = useReactToPrint({
    content: () => facturaRef.current,
    documentTitle: `Factura_${Date.now()}`,
    onAfterPrint: () => {
      nuevaVenta()
    }
  })

  useEffect(() => {
    cargarProductos()
  }, [])

  const cargarProductos = async () => {
    try {
      const response = await fetch(`${API_URL}/productos`)
      const data = await response.json()
      setProductos(data)
    } catch (error) {
      console.error('Error cargando productos:', error)
    }
  }

  const agregar = (producto) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id)
      if (existe) {
        return prev.map(item =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      }
      return [...prev, { ...producto, cantidad: 1 }]
    })
  }

  const actualizarCantidad = (id, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      setCarrito(prev => prev.filter(item => item.id !== id))
    } else {
      setCarrito(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, cantidad: nuevaCantidad }
            : item
        )
      )
    }
  }

  const eliminar = (id) => {
    setCarrito(prev => prev.filter(item => item.id !== id))
  }

  const subtotal = useMemo(() => {
    return carrito.reduce((acc, item) => {
      return acc + (Number(item.precio) * item.cantidad)
    }, 0)
  }, [carrito])

  const total = useMemo(() => {
    const envio = parseFloat(costoEnvio) || 0
    const desc = parseFloat(descuento) || 0
    const base = subtotal + envio
    return base - (base * (desc / 100))
  }, [subtotal, costoEnvio, descuento])

  const limpiarCarrito = () => {
    if (window.confirm('¿Vaciar todo el carrito?')) {
      setCarrito([])
      setCostoEnvio('')
      setDescuento('')
      setCodigoAutorizacion('')
      setMostrarAutorizacion(false)
    }
  }

  const cobrar = async () => {
    if (!cliente.nombre.trim()) {
      alert('⚠️ Por favor ingresa el nombre del cliente')
      return
    }

    if (carrito.length === 0) {
      alert('⚠️ El carrito está vacío')
      return
    }

    const desc = parseFloat(descuento) || 0
    if (desc > 0 && !codigoAutorizacion.trim()) {
      alert('⚠️ Para aplicar un descuento debes ingresar el código de autorización')
      return
    }

    setCargando(true)

    try {
      const usuario = JSON.parse(localStorage.getItem('usuario'))

      const esCredito = tipoPago === 'credito'
      const esDomicilio = tipoEntrega === 'domicilio'

      const response = await fetch(`${API_URL}/ventas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuario.id,
          carrito: carrito.map(item => ({
            id: item.id,
            precio: item.precio,
            cantidad: item.cantidad
          })),
          total: subtotal,
          tipo_pago: esCredito ? 'Crédito' : 'Efectivo',
          tipo_venta: esCredito ? 'credito' : 'contado',
          tipo_entrega: esDomicilio ? 'domicilio' : 'retiro',
          cliente_nombre: cliente.nombre,
          cliente_telefono: cliente.telefono,
          cliente_direccion: cliente.direccion,
          cliente_referencia: cliente.referencia,
          detalles: cliente.detalles,
          costo_envio: parseFloat(costoEnvio) || 0,
          descuento: parseFloat(descuento) || 0,
          codigo_autorizacion: codigoAutorizacion || null
        })
      })

      const data = await response.json()

      if (data.success) {
        setVentaId(data.ventaId)
        
        if (esCredito || esDomicilio) {
          setCodigoEntrega(data.codigo)
        }
        
        setVentaCompletada(true)
        
        let mensaje = `✅ Venta completada #${data.ventaId} - Total: RD$ ${data.total.toFixed(2)}`
        if (data.descuento_aplicado > 0) {
          mensaje += `\n💰 Descuento aplicado: ${data.descuento_aplicado}%`
          mensaje += `\n🔑 Autorizado: ${data.autorizado ? 'SÍ' : 'NO'}`
        }
        alert(mensaje)
      } else {
        alert('❌ Error: ' + (data.error || data.message || 'No se pudo guardar'))
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error guardando venta')
    } finally {
      setCargando(false)
    }
  }
  const nuevaVenta = () => {
  setVentaCompletada(false)
  setCodigoEntrega('')
  setCarrito([])
  setCliente({ nombre: '', telefono: '', direccion: '', referencia: '', detalles: '' })
  setTipoPago('contado')
  setTipoEntrega('retiro')
  setVentaId(null)
  setCostoEnvio('')
  setDescuento('')
  setCodigoAutorizacion('')
  setMostrarAutorizacion(false)
}

const getTipoFactura = () => {
  if (tipoPago === 'credito' && tipoEntrega === 'domicilio') return '📦 Crédito con Entrega a Domicilio'
  if (tipoPago === 'credito' && tipoEntrega === 'retiro') return '📦 Crédito - Retiro en Tienda'
  if (tipoPago === 'contado' && tipoEntrega === 'domicilio') return '🚚 Contado con Entrega a Domicilio'
  return '💰 Contado - Retiro en Tienda'
}

if (ventaCompletada) {
  return (
    <AdminLayout>
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ color: '#003b6f' }}>✅ Factura Generada</h1>
        <div style={{
          border: '2px solid #003b6f',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '550px',
          margin: '30px auto',
          backgroundColor: '#f5f7fb'
        }}>
          <h2>{getTipoFactura()}</h2>
          {codigoEntrega && (
            <div style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#003b6f',
              letterSpacing: '4px',
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '2px dashed #003b6f'
            }}>
              {codigoEntrega}
            </div>
          )}
          <p style={{ marginTop: '20px', color: '#666' }}>
            {tipoPago === 'credito' 
              ? 'Cliente debe pagar el monto pendiente' 
              : 'Venta pagada al contado'}
            {tipoEntrega === 'domicilio' && ' - El chofer realizará la entrega'}
            {tipoEntrega === 'retiro' && ' - Cliente retira en tienda'}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => window.print()} 
              style={{
                padding: '12px 30px',
                backgroundColor: '#003b6f',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              🖨️ Imprimir Factura
            </button>
            <button 
              onClick={nuevaVenta} 
              style={{
                padding: '12px 30px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Nueva Venta
            </button>
          </div>
        </div>

        <div id="factura-para-imprimir" style={{ 
          position: 'fixed', 
          left: '0', 
          top: '0',
          width: '100mm',
          backgroundColor: 'white',
          padding: '15px',
          zIndex: 9999,
          visibility: 'hidden'
        }}>
          <Factura
            ref={facturaRef}
            venta={{ id: ventaId }}
            cliente={cliente}
            carrito={carrito}
            total={total}
            tipoVenta={tipoPago === 'credito' ? 'credito' : 'contado'}
            tipoEntrega={tipoEntrega}
            codigoEntrega={codigoEntrega}
          />
        </div>
      </div>
    </AdminLayout>
  )
}
return (
    <AdminLayout>
      <h1>🛒 Punto de Venta</h1>

      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '15px',
        padding: '15px',
        backgroundColor: '#e3f2fd',
        borderRadius: '12px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <label style={{ fontWeight: 'bold', color: '#003b6f' }}>💳 Tipo de Pago:</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="radio"
            checked={tipoPago === 'contado'}
            onChange={() => setTipoPago('contado')}
          />
          💰 Contado
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="radio"
            checked={tipoPago === 'credito'}
            onChange={() => setTipoPago('credito')}
          />
          📦 Crédito
        </label>
      </div>

      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#e8f5e9',
        borderRadius: '12px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <label style={{ fontWeight: 'bold', color: '#1b5e20' }}>🚚 Tipo de Entrega:</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="radio"
            checked={tipoEntrega === 'retiro'}
            onChange={() => setTipoEntrega('retiro')}
          />
          🏪 Retiro en tienda
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="radio"
            checked={tipoEntrega === 'domicilio'}
            onChange={() => setTipoEntrega('domicilio')}
          />
          🚚 Entrega a domicilio
        </label>
      </div>

      {/* Sección de Costo de Envío y Descuento */}
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px',
        backgroundColor: '#f9f9f9'
      }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#003b6f' }}>💰 Costos y Descuentos</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Costo de Envío (RD$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costoEnvio}
              onChange={(e) => setCostoEnvio(e.target.value)}
              placeholder="0.00"
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Descuento (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={descuento}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                setDescuento(e.target.value)
                if (val > 0) {
                  setMostrarAutorizacion(true)
                } else {
                  setMostrarAutorizacion(false)
                  setCodigoAutorizacion('')
                }
              }}
              placeholder="0"
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
            />
          </div>
        </div>

        {mostrarAutorizacion && (
          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#fff8e1', borderRadius: '8px', border: '1px solid #ff9800' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>
              🔑 Código de Autorización
            </label>
            <input
              type="text"
              value={codigoAutorizacion}
              onChange={(e) => setCodigoAutorizacion(e.target.value)}
              placeholder="Ej: AUT-2026"
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
            />
            <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
              Solo el dueño o subgerente puede autorizar descuentos
            </p>
          </div>
        )}

        {carrito.length > 0 && (
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
            <p style={{ margin: '5px 0' }}>
              <strong>Subtotal:</strong> RD$ {subtotal.toFixed(2)}
            </p>
            {parseFloat(costoEnvio) > 0 && (
              <p style={{ margin: '5px 0' }}>
                <strong>Envío:</strong> RD$ {parseFloat(costoEnvio).toFixed(2)}
              </p>
            )}
            {parseFloat(descuento) > 0 && (
              <p style={{ margin: '5px 0', color: '#d32f2f' }}>
                <strong>Descuento ({descuento}%):</strong> -RD$ {((subtotal + parseFloat(costoEnvio || 0)) * (parseFloat(descuento) / 100)).toFixed(2)}
              </p>
            )}
            <p style={{ margin: '5px 0', fontSize: '1.1rem', fontWeight: 'bold', color: '#003b6f' }}>
              <strong>Total a pagar:</strong> RD$ {total.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* Datos del Cliente */}
      <div style={{
        border: '2px solid #003b6f',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        backgroundColor: '#f8faff'
      }}>
        <h3 style={{ marginTop: 0, color: '#003b6f' }}>👤 Datos del Cliente</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Nombre *</label>
            <input
              type="text"
              value={cliente.nombre}
              onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
              placeholder="Nombre del cliente"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Teléfono</label>
            <input
              type="text"
              value={cliente.telefono}
              onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
              placeholder="809-555-0000"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Dirección</label>
            <input
              type="text"
              value={cliente.direccion}
              onChange={(e) => setCliente({ ...cliente, direccion: e.target.value })}
              placeholder="Calle, número, sector"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Referencia</label>
            <input
              type="text"
              value={cliente.referencia}
              onChange={(e) => setCliente({ ...cliente, referencia: e.target.value })}
              placeholder="Punto de referencia"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
            />
          </div>
        </div>
      </div>

      <input
        type="text"
        placeholder="🔍 Buscar producto..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ddd' }}
      />

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
            {productos
              .filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
              .map((producto) => (
                <div key={producto.id} style={{
                  border: '1px solid #ddd',
                  padding: '15px',
                  borderRadius: '10px',
                  backgroundColor: '#f9f9f9'
                }}>
                  <h4 style={{ margin: '0 0 8px 0' }}>{producto.nombre}</h4>
                  <p style={{ margin: '5px 0', fontSize: '1.1rem', fontWeight: 'bold', color: '#003b6f' }}>
                    RD$ {Number(producto.precio).toFixed(2)}
                  </p>
                  <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#666' }}>
                    Stock: {producto.stock || 0}
                  </p>
                  <button
                    onClick={() => agregar(producto)}
                    style={{
                      backgroundColor: '#003b6f',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      width: '100%',
                      marginTop: '8px'
                    }}
                  >
                    Agregar
                  </button>
                </div>
              ))}
          </div>
        </div>

        <div style={{ flex: 1, borderLeft: '2px solid #eee', paddingLeft: '20px' }}>
          <h3>🛒 Carrito {carrito.length > 0 && `(${carrito.length})`}</h3>
          {carrito.length === 0 ? (
            <p style={{ color: '#999' }}>Carrito vacío</p>
          ) : (
            <>
              {carrito.map((item) => (
                <div key={item.id} style={{
                  border: '1px solid #eee',
                  padding: '10px',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}>
                  <div style={{ fontWeight: 'bold' }}>{item.nombre}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <button onClick={() => actualizarCantidad(item.id, item.cantidad - 1)} style={{ cursor: 'pointer' }}>−</button>
                      <span style={{ margin: '0 8px' }}>{item.cantidad}</span>
                      <button onClick={() => actualizarCantidad(item.id, item.cantidad + 1)} style={{ cursor: 'pointer' }}>+</button>
                    </div>
                    <span>RD$ {(item.precio * item.cantidad).toFixed(2)}</span>
                    <button onClick={() => eliminar(item.id)} style={{ backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '2px solid #003b6f', paddingTop: '10px', marginTop: '10px' }}>
                <h3 style={{ color: '#003b6f' }}>Total: RD$ {total.toFixed(2)}</h3>
              </div>
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <button
                  onClick={limpiarCarrito}
                  style={{ backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '6px', padding: '10px', cursor: 'pointer' }}
                >
                  Limpiar Carrito
                </button>
                <button
                  onClick={cobrar}
                  disabled={cargando || carrito.length === 0}
                  style={{
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '12px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    cursor: cargando || carrito.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: cargando || carrito.length === 0 ? 0.6 : 1
                  }}
                >
                  {cargando ? 'Procesando...' : '💳 Cobrar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default POS