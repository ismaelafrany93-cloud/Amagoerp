import { useState, useEffect, useMemo, useRef } from 'react'
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
    detalles: '',
    es_mayorista: false
  })

  // 👇 NUEVO: Estado para mostrar el historial de ventas
  const [ventasRecientes, setVentasRecientes] = useState([])
  const [mostrarHistorial, setMostrarHistorial] = useState(false)

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esSucursalPrincipal = usuario.sucursal_id === 3
  const esSucursal = usuario.sucursal_id && usuario.sucursal_id > 0

  // Ref para la factura
  const facturaRef = useRef()

  useEffect(() => {
    cargarProductos()
    cargarVentasRecientes()
  }, [])

  const cargarProductos = async () => {
    try {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      let url = `${API_URL}/productos`;
      
      if (usuario.sucursal_id && usuario.sucursal_id > 0) {
        url = `${API_URL}/productos?sucursal_id=${usuario.sucursal_id}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando productos:', error);
      alert('❌ Error cargando productos. Verifica tu conexión.');
      setProductos([]);
    }
  }

  // 👇 NUEVO: Cargar ventas recientes
  const cargarVentasRecientes = async () => {
    try {
      const response = await fetch(`${API_URL}/ventas?limite=10`)
      const data = await response.json()
      setVentasRecientes(Array.isArray(data) ? data.slice(0, 10) : [])
    } catch (error) {
      console.error('Error cargando ventas recientes:', error)
      setVentasRecientes([])
    }
  }

  // ============================================
  // FUNCIÓN PARA REIMPRIMIR FACTURA
  // ============================================
  const handleReimprimir = async (ventaId) => {
    try {
      const loading = document.createElement('div');
      loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: white;
        font-size: 1.5rem;
      `;
      loading.innerHTML = '🖨️ Generando factura...';
      document.body.appendChild(loading);

      const response = await fetch(`${API_URL}/ventas/${ventaId}/reimprimir`);
      const data = await response.json();

      if (!data.success) {
        alert('❌ Error al obtener los datos de la factura');
        document.body.removeChild(loading);
        return;
      }

      const venta = data.venta;
      const detalles = data.detalles;
      const sucursal = data.sucursal || { nombre: 'Sucursal Principal', direccion: '', telefono: '' };

      let ticketHTML = `
        <div style="font-family: monospace; width: 300px; margin: 0 auto; padding: 20px; background: white;">
          <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px;">
            <h2 style="margin: 0; font-size: 18px;">🏭 AMAGO ERP</h2>
            <p style="margin: 2px 0; font-size: 12px;">${sucursal.nombre || 'Sucursal Principal'}</p>
            ${sucursal.direccion ? `<p style="margin: 2px 0; font-size: 11px;">${sucursal.direccion}</p>` : ''}
            ${sucursal.telefono ? `<p style="margin: 2px 0; font-size: 11px;">Tel: ${sucursal.telefono}</p>` : ''}
            <p style="margin: 5px 0; font-size: 14px; font-weight: bold;">FACTURA</p>
            <p style="margin: 2px 0; font-size: 12px;">#${venta.factura || venta.id}</p>
          </div>

          <div style="padding: 10px 0; border-bottom: 1px dashed #000;">
            <p style="margin: 2px 0; font-size: 12px;"><strong>Cliente:</strong> ${venta.cliente_nombre || 'N/A'}</p>
            ${venta.cliente_telefono ? `<p style="margin: 2px 0; font-size: 12px;"><strong>Teléfono:</strong> ${venta.cliente_telefono}</p>` : ''}
            ${venta.cliente_direccion ? `<p style="margin: 2px 0; font-size: 12px;"><strong>Dirección:</strong> ${venta.cliente_direccion}</p>` : ''}
            <p style="margin: 2px 0; font-size: 12px;"><strong>Vendedor:</strong> ${venta.vendedor_nombre || 'N/A'}</p>
            <p style="margin: 2px 0; font-size: 12px;"><strong>Fecha:</strong> ${new Date(venta.fecha).toLocaleString()}</p>
            <p style="margin: 2px 0; font-size: 12px;"><strong>Tipo:</strong> ${venta.tipo_venta || 'Contado'}</p>
            <p style="margin: 2px 0; font-size: 12px;"><strong>Pago:</strong> ${venta.tipo_pago || 'Efectivo'}</p>
            ${venta.estado_entrega ? `<p style="margin: 2px 0; font-size: 12px;"><strong>Entrega:</strong> ${venta.estado_entrega}</p>` : ''}
          </div>

          <div style="padding: 10px 0; border-bottom: 1px dashed #000;">
            <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid #000;">
                  <th style="text-align: left; padding: 4px 0;">Producto</th>
                  <th style="text-align: center; padding: 4px 0;">Cant</th>
                  <th style="text-align: right; padding: 4px 0;">Precio</th>
                  <th style="text-align: right; padding: 4px 0;">Total</th>
                </tr>
              </thead>
              <tbody>
      `;

      detalles.forEach(d => {
        ticketHTML += `
          <tr>
            <td style="padding: 4px 0; text-align: left;">${d.producto_nombre || 'Producto'}</td>
            <td style="padding: 4px 0; text-align: center;">${d.cantidad}</td>
            <td style="padding: 4px 0; text-align: right;">RD$ ${Number(d.precio).toFixed(2)}</td>
            <td style="padding: 4px 0; text-align: right;">RD$ ${(Number(d.precio) * d.cantidad).toFixed(2)}</td>
          </tr>
        `;
      });

      ticketHTML += `
              </tbody>
              <tfoot>
                <tr style="border-top: 2px solid #000;">
                  <td colspan="3" style="text-align: right; padding: 8px 0; font-weight: bold;">TOTAL:</td>
                  <td style="text-align: right; padding: 8px 0; font-weight: bold; font-size: 16px;">RD$ ${Number(venta.total).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style="padding: 10px 0; text-align: center; border-bottom: 1px dashed #000;">
            <p style="margin: 2px 0; font-size: 12px;">${venta.estado === 'cancelada' ? '❌ FACTURA CANCELADA' : '✅ FACTURA VÁLIDA'}</p>
            ${venta.motivo_cancelacion ? `<p style="margin: 2px 0; font-size: 11px; color: #f44336;">Motivo: ${venta.motivo_cancelacion}</p>` : ''}
            ${venta.observacion ? `<p style="margin: 2px 0; font-size: 11px;">${venta.observacion}</p>` : ''}
          </div>

          <div style="padding: 10px 0; text-align: center; font-size: 11px; color: #666;">
            <p style="margin: 2px 0;">¡Gracias por su compra!</p>
            <p style="margin: 2px 0;">Este documento es una reimpresión</p>
            <p style="margin: 2px 0;">${new Date().toLocaleString()}</p>
          </div>
        </div>
      `;

      const ventana = window.open('', '_blank', 'width=400,height=600');
      ventana.document.write(`
        <html>
          <head>
            <title>Reimpresión Factura #${venta.factura || venta.id}</title>
            <style>
              body { margin: 0; padding: 20px; background: #f5f5f5; }
              @media print {
                body { background: white; padding: 0; }
                .no-print { display: none; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            ${ticketHTML}
            <div style="text-align: center; margin-top: 20px;" class="no-print">
              <button onclick="window.print()" style="padding: 10px 30px; background: #003b6f; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
                🖨️ Imprimir
              </button>
              <button onclick="window.close()" style="padding: 10px 30px; background: #f44336; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin-left: 10px;">
                ✕ Cerrar
              </button>
            </div>
          </body>
        </html>
      `);
      ventana.document.close();

      document.body.removeChild(loading);
      alert('✅ Factura reimpresa correctamente');

    } catch (error) {
      console.error('Error reimprimiendo factura:', error);
      alert('❌ Error al reimprimir la factura');
      const loading = document.querySelector('div[style*="position: fixed;"]');
      if (loading) document.body.removeChild(loading);
    }
  };

  // ============================================
  // FUNCIÓN PARA IMPRIMIR FACTURA
  // ============================================
  const imprimirFactura = (formato = 'A4') => {
    const contenido = facturaRef.current;
    if (!contenido) {
      alert('⚠️ No hay factura para imprimir');
      return;
    }

    const ventana = window.open('', '_blank', 'width=800,height=600');
    if (!ventana) {
      alert('⚠️ Por favor, permite las ventanas emergentes para imprimir');
      return;
    }

    const html = contenido.outerHTML;

    const estilos = formato === 'A4' 
      ? `
          @page {
            size: A4;
            margin: 10mm;
          }
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            background: white;
          }
          @media print {
            body { margin: 0; padding: 0; }
          }
        `
      : `
          @page {
            size: 80mm 297mm;
            margin: 3mm;
          }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 10px;
            padding: 5px;
            background: white;
          }
          table { font-size: 9px; }
          @media print {
            body { margin: 0; padding: 0; }
          }
        `;

    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Factura ${ventaId || ''}</title>
          <style>${estilos}</style>
        </head>
        <body>
          ${html}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 1000);
            }
          <\/script>
        </body>
      </html>
    `);
    ventana.document.close();
  }

  const calcularPrecio = (producto, cantidad) => {
    if (esSucursalPrincipal) {
      if (cliente.es_mayorista && producto.precio_mayor) {
        return parseFloat(producto.precio_mayor)
      }
      if (producto.precio_mayor && producto.cantidad_mayor && cantidad >= producto.cantidad_mayor) {
        return parseFloat(producto.precio_mayor)
      }
    }
    return parseFloat(producto.precio)
  }

  const agregar = (producto) => {
    if (producto.stock <= 0) {
      alert('⚠️ No hay stock disponible de este producto')
      return
    }
    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id)
      if (existe) {
        if (existe.cantidad >= producto.stock) {
          alert(`⚠️ Solo hay ${producto.stock} unidades disponibles`)
          return prev
        }
        const nuevaCantidad = existe.cantidad + 1
        const precioUnitario = calcularPrecio(producto, nuevaCantidad)
        return prev.map(item =>
          item.id === producto.id
            ? { 
                ...item, 
                cantidad: nuevaCantidad,
                precio_unitario: precioUnitario,
                precio_mostrar: precioUnitario
              }
            : item
        )
      }
      const precioUnitario = calcularPrecio(producto, 1)
      return [...prev, { 
        ...producto, 
        cantidad: 1,
        precio_unitario: precioUnitario,
        precio_mostrar: precioUnitario
      }]
    })
  }

  const actualizarCantidad = (id, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      setCarrito(prev => prev.filter(item => item.id !== id))
    } else {
      const producto = productos.find(p => p.id === id)
      if (producto && nuevaCantidad > producto.stock) {
        alert(`⚠️ Solo hay ${producto.stock} unidades disponibles`)
        return
      }
      setCarrito(prev =>
        prev.map(item => {
          if (item.id === id) {
            const precioUnitario = calcularPrecio(producto, nuevaCantidad)
            return { 
              ...item, 
              cantidad: nuevaCantidad,
              precio_unitario: precioUnitario,
              precio_mostrar: precioUnitario
            }
          }
          return item
        })
      )
    }
  }

  const eliminar = (id) => {
    setCarrito(prev => prev.filter(item => item.id !== id))
  }

  const subtotal = useMemo(() => {
    return carrito.reduce((acc, item) => {
      return acc + (Number(item.precio_unitario || item.precio) * item.cantidad)
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
      const esCredito = tipoPago === 'credito'
      const esDomicilio = tipoEntrega === 'domicilio'

      const datosVenta = {
        usuario_id: usuario.id,
        sucursal_id: usuario.sucursal_id || null,
        carrito: carrito.map(item => ({
          id: item.id,
          precio: item.precio_unitario || item.precio,
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
        codigo_autorizacion: codigoAutorizacion || null,
        cliente_es_mayorista: cliente.es_mayorista || false
      }

      const response = await fetch(`${API_URL}/ventas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosVenta)
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
        if (cliente.es_mayorista) {
          mensaje += `\n👑 Cliente Mayorista - Precio especial aplicado`
        }
        alert(mensaje)
        
        // Recargar ventas recientes
        cargarVentasRecientes()
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
    setCliente({ nombre: '', telefono: '', direccion: '', referencia: '', detalles: '', es_mayorista: false })
    setTipoPago('contado')
    setTipoEntrega('retiro')
    setVentaId(null)
    setCostoEnvio('')
    setDescuento('')
    setCodigoAutorizacion('')
    setMostrarAutorizacion(false)
    cargarVentasRecientes()
  }

  const getTipoFactura = () => {
    if (tipoPago === 'credito' && tipoEntrega === 'domicilio') return '📦 Crédito con Entrega a Domicilio'
    if (tipoPago === 'credito' && tipoEntrega === 'retiro') return '📦 Crédito - Retiro en Tienda'
    if (tipoPago === 'contado' && tipoEntrega === 'domicilio') return '🚚 Contado con Entrega a Domicilio'
    return '💰 Contado - Retiro en Tienda'
  }

  const esSucursalNoPrincipal = esSucursal && !esSucursalPrincipal

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
                onClick={() => imprimirFactura('A4')}
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
                🖨️ Factura A4
              </button>
              <button 
                onClick={() => imprimirFactura('POS80')}
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
                🧾 Ticket POS80
              </button>
              <button 
                onClick={nuevaVenta} 
                style={{
                  padding: '12px 30px',
                  backgroundColor: '#ff9800',
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
          {/* FACTURA OCULTA PARA IMPRIMIR */}
          <div style={{ 
            position: 'fixed', 
            left: '-9999px', 
            top: 0,
            width: '210mm',
            backgroundColor: 'white',
            padding: '20px',
            zIndex: 9999
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
              vendedor={usuario.nombre}
              formato="A4"
            />
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <h1>🛒 Punto de Venta</h1>

      {/* 👇 BOTÓN PARA MOSTRAR/OCULTAR HISTORIAL DE VENTAS RECIENTES */}
      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={() => setMostrarHistorial(!mostrarHistorial)}
          style={{
            padding: '8px 20px',
            backgroundColor: mostrarHistorial ? '#f44336' : '#003b6f',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          {mostrarHistorial ? '✕ Ocultar Ventas Recientes' : '📋 Ver Ventas Recientes'}
        </button>
      </div>

      {/* 👇 HISTORIAL DE VENTAS RECIENTES PARA REIMPRIMIR */}
      {mostrarHistorial && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '15px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '2px solid #003b6f'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#003b6f' }}>📋 Ventas Recientes</h4>
          {ventasRecientes.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', padding: '10px' }}>No hay ventas recientes</p>
          ) : (
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f4f8' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>#</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Cliente</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Fecha</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasRecientes.map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '6px' }}>{v.id}</td>
                      <td style={{ padding: '6px' }}>{v.cliente_nombre || 'N/A'}</td>
                      <td style={{ padding: '6px', textAlign: 'right' }}>
                        RD$ {Number(v.total).toFixed(2)}
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        {new Date(v.fecha).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleReimprimir(v.id)}
                          style={{
                            backgroundColor: '#9C27B0',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 10px',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                          title="Reimprimir factura"
                        >
                          🖨️ Reimprimir
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

      {esSucursalNoPrincipal && (
        <div style={{
          backgroundColor: '#fff3e0',
          padding: '12px 20px',
          borderRadius: '8px',
          marginBottom: '15px',
          borderLeft: '4px solid #ff9800'
        }}>
          <p style={{ margin: 0, color: '#e65100' }}>
            🏢 <strong>{usuario.sucursal_nombre || 'Mi Sucursal'}</strong> - 
            Mostrando productos de tu sucursal
          </p>
        </div>
      )}

      {esSucursalPrincipal && (
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '10px 15px',
          borderRadius: '8px',
          marginBottom: '15px',
          borderLeft: '4px solid #003b6f'
        }}>
          <p style={{ margin: 0, color: '#003b6f' }}>
            👑 <strong>Sucursal Principal</strong> - Precios al por mayor disponibles
          </p>
        </div>
      )}

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
          <input type="radio" checked={tipoPago === 'contado'} onChange={() => setTipoPago('contado')} />
          💰 Contado
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="radio" checked={tipoPago === 'credito'} onChange={() => setTipoPago('credito')} />
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
          <input type="radio" checked={tipoEntrega === 'retiro'} onChange={() => setTipoEntrega('retiro')} />
          🏪 Retiro en tienda
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="radio" checked={tipoEntrega === 'domicilio'} onChange={() => setTipoEntrega('domicilio')} />
          🚚 Entrega a domicilio
        </label>
      </div>

      <div style={{
        border: '2px solid #003b6f',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px',
        backgroundColor: '#e8f0fe',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#003b6f' }}>💰 Costos y Descuentos</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px', color: '#003b6f' }}>Costo de Envío (RD$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costoEnvio}
              onChange={(e) => setCostoEnvio(e.target.value)}
              placeholder="0.00"
              style={{ width: '100%', padding: '10px', border: '1px solid #003b6f', borderRadius: '8px', backgroundColor: 'white' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px', color: '#003b6f' }}>Descuento (%)</label>
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
              style={{ width: '100%', padding: '10px', border: '1px solid #003b6f', borderRadius: '8px', backgroundColor: 'white' }}
            />
          </div>
        </div>
        {mostrarAutorizacion && (
          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#fff8e1', borderRadius: '8px', border: '1px solid #ff9800' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>🔑 Código de Autorización</label>
            <input
              type="text"
              value={codigoAutorizacion}
              onChange={(e) => setCodigoAutorizacion(e.target.value)}
              placeholder="Ej: AUT-2026"
              style={{ width: '100%', padding: '10px', border: '1px solid #ff9800', borderRadius: '8px', backgroundColor: 'white' }}
            />
            <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
              ⚠️ Solo el dueño o subgerente puede autorizar descuentos
            </p>
          </div>
        )}
      </div>

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
          {esSucursalPrincipal && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                backgroundColor: cliente.es_mayorista ? '#e8f5e9' : 'transparent',
                padding: '10px',
                borderRadius: '8px',
                border: cliente.es_mayorista ? '2px solid #4CAF50' : '2px solid transparent',
                transition: 'all 0.3s'
              }}>
                <input
                  type="checkbox"
                  checked={cliente.es_mayorista || false}
                  onChange={(e) => setCliente({ ...cliente, es_mayorista: e.target.checked })}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#4CAF50' }}
                />
                <div>
                  <span style={{ fontWeight: 'bold' }}>👑 Cliente Mayorista</span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#666' }}>
                    {cliente.es_mayorista 
                      ? '✅ Precio al por mayor aplicado automáticamente' 
                      : 'Marcar si este cliente es mayorista (solo disponible en Principal)'}
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>
      </div>

      {carrito.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #003b6f' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#003b6f' }}>📊 Resumen de la Venta</h4>
          <p style={{ margin: '5px 0' }}><strong>Subtotal:</strong> RD$ {subtotal.toFixed(2)}</p>
          {parseFloat(costoEnvio) > 0 && (
            <p style={{ margin: '5px 0' }}><strong>Envío:</strong> RD$ {parseFloat(costoEnvio).toFixed(2)}</p>
          )}
          {parseFloat(descuento) > 0 && (
            <p style={{ margin: '5px 0', color: '#d32f2f' }}>
              <strong>Descuento ({descuento}%):</strong> -RD$ {((subtotal + parseFloat(costoEnvio || 0)) * (parseFloat(descuento) / 100)).toFixed(2)}
            </p>
          )}
          {cliente.es_mayorista && (
            <p style={{ margin: '5px 0', color: '#4CAF50', fontWeight: 'bold' }}>
              👑 Cliente Mayorista - Precio especial aplicado
            </p>
          )}
          <p style={{ margin: '5px 0', fontSize: '1.3rem', fontWeight: 'bold', color: '#003b6f' }}>
            <strong>Total a pagar:</strong> RD$ {total.toFixed(2)}
          </p>
        </div>
      )}

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
            {Array.isArray(productos) && productos
              .filter(p => p.nombre && p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
              .map((producto) => (
                <div key={producto.id} style={{
                  border: '1px solid #ddd',
                  padding: '15px',
                  borderRadius: '10px',
                  backgroundColor: '#f9f9f9',
                  opacity: (producto.stock || 0) <= 0 ? 0.5 : 1
                }}>
                  <h4 style={{ margin: '0 0 8px 0' }}>{producto.nombre || 'Sin nombre'}</h4>
                  <p style={{ margin: '5px 0', fontSize: '1.1rem', fontWeight: 'bold', color: '#003b6f' }}>
                    RD$ {Number(producto.precio || 0).toFixed(2)}
                  </p>
                  {esSucursalPrincipal && producto.precio_mayor && (
                    <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#4CAF50' }}>
                      Mayor: RD$ {Number(producto.precio_mayor).toFixed(2)} (mín. {producto.cantidad_mayor || 10}u)
                    </p>
                  )}
                  <p style={{ 
                    margin: '2px 0', 
                    fontSize: '0.8rem', 
                    color: (producto.stock || 0) <= 0 ? '#f44336' : (producto.stock || 0) <= 5 ? '#ff9800' : '#666'
                  }}>
                    Stock: {producto.stock || 0}
                    {(producto.stock || 0) <= 0 && ' ❌ Agotado'}
                  </p>
                  <button
                    onClick={() => agregar(producto)}
                    disabled={(producto.stock || 0) <= 0}
                    style={{
                      backgroundColor: (producto.stock || 0) <= 0 ? '#999' : '#003b6f',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      cursor: (producto.stock || 0) <= 0 ? 'not-allowed' : 'pointer',
                      width: '100%',
                      marginTop: '8px'
                    }}
                  >
                    {(producto.stock || 0) <= 0 ? 'Agotado' : 'Agregar'}
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
                  <div style={{ fontWeight: 'bold' }}>{item.nombre || 'Sin nombre'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <button onClick={() => actualizarCantidad(item.id, item.cantidad - 1)} style={{ cursor: 'pointer', padding: '2px 8px' }}>−</button>
                      <span style={{ margin: '0 8px' }}>{item.cantidad}</span>
                      <button onClick={() => actualizarCantidad(item.id, item.cantidad + 1)} style={{ cursor: 'pointer', padding: '2px 8px' }}>+</button>
                    </div>
                    <span>
                      {esSucursalPrincipal && (cliente.es_mayorista || (item.cantidad >= item.cantidad_mayor)) ? '💰 Mayor' : '🛒 Detal'}
                      {' '}
                      RD$ {(Number(item.precio_unitario || item.precio) * item.cantidad).toFixed(2)}
                    </span>
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