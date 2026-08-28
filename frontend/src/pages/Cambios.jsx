import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Cambios() {
  const [cambios, setCambios] = useState([])
  const [facturaBusqueda, setFacturaBusqueda] = useState('')
  const [ventaEncontrada, setVentaEncontrada] = useState(null)
  const [detallesVenta, setDetallesVenta] = useState([])
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [cambiosFiltrados, setCambiosFiltrados] = useState([])
  
  const [productosDevueltos, setProductosDevueltos] = useState([])
  const [productoNuevoSeleccionado, setProductoNuevoSeleccionado] = useState(null)
  const [costoEnvioManual, setCostoEnvioManual] = useState(0)

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const rol = usuario?.rol || ''
  const tieneAcceso = ['dueno', 'dueño', 'subgerente', 'admin', 'vendedor', 'vendedora'].includes(rol)

  const [form, setForm] = useState({
    tipo: 'cambio',
    venta_id: '',
    factura_original: '',
    cliente_nombre: '',
    cliente_telefono: '',
    motivo: '',
    envio_opcional: false
  })

  useEffect(() => {
    if (tieneAcceso) {
      cargarCambios()
      cargarProductos()
    }
  }, [tieneAcceso])

  useEffect(() => {
    filtrarCambios()
  }, [cambios, filtroEstado])

  const cargarCambios = async () => {
    try {
      const response = await fetch(`${API_URL}/cambios`)
      const data = await response.json()
      setCambios(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando cambios:', error)
      setCambios([])
    }
  }

  const cargarProductos = async () => {
    try {
      const response = await fetch(`${API_URL}/productos`)
      const data = await response.json()
      setProductos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando productos:', error)
      setProductos([])
    }
  }

  const filtrarCambios = () => {
    if (!filtroEstado) {
      setCambiosFiltrados(cambios)
    } else {
      setCambiosFiltrados(cambios.filter(c => c.estado === filtroEstado))
    }
  }

  const buscarFactura = async () => {
    if (!facturaBusqueda.trim()) {
      alert('⚠️ Ingresa un número de factura')
      return
    }

    setCargando(true)
    try {
      const url = `${API_URL}/cambios/venta/${facturaBusqueda.trim()}`
      const response = await fetch(url)
      
      if (response.status === 500) {
        alert('❌ Error en el servidor. Intenta con otro código o contacta al administrador.')
        setVentaEncontrada(null)
        setDetallesVenta([])
        setCargando(false)
        return
      }
      
      const data = await response.json()

      if (data.success) {
        setVentaEncontrada(data.venta)
        setDetallesVenta(data.detalles || [])
        setProductosDevueltos([])
        setProductoNuevoSeleccionado(null)
        setCostoEnvioManual(0)
        setMostrarFormulario(true)
        
        const numeroFactura = data.venta.codigo_entrega || data.venta.id
        setMensaje(`✅ Factura ${numeroFactura} encontrada - ${data.detalles?.length || 0} productos`)
        
        setForm(prev => ({
          ...prev,
          cliente_nombre: data.venta.cliente_nombre || '',
          cliente_telefono: data.venta.cliente_telefono || '',
          venta_id: data.venta.id,
          factura_original: data.venta.codigo_entrega || data.venta.id
        }))
      } else {
        alert('❌ Factura no encontrada: ' + (data.message || 'Código inválido'))
        setVentaEncontrada(null)
        setDetallesVenta([])
      }
    } catch (error) {
      console.error('❌ Error buscando factura:', error)
      alert('❌ Error buscando factura: ' + error.message)
    } finally {
      setCargando(false)
    }
  }

  const toggleSeleccionProductoDevuelto = (producto) => {
    if (!producto || !producto.producto_id) {
      console.error('❌ Producto inválido:', producto)
      return
    }

    const existe = productosDevueltos.find(p => p.producto_id === producto.producto_id)
    
    if (existe) {
      setProductosDevueltos(productosDevueltos.filter(p => p.producto_id !== producto.producto_id))
    } else {
      const nuevoProducto = {
        producto_id: producto.producto_id,
        producto_nombre: producto.producto_nombre || producto.nombre || 'Producto sin nombre',
        cantidad: 1,
        precio: parseFloat(producto.producto_precio || producto.precio || 0)
      }
      setProductosDevueltos([...productosDevueltos, nuevoProducto])
    }
  }

  const actualizarCantidadDevuelto = (productoId, nuevaCantidad) => {
    if (nuevaCantidad < 1) return
    setProductosDevueltos(productosDevueltos.map(p => {
      if (p.producto_id === productoId) {
        return { ...p, cantidad: nuevaCantidad }
      }
      return p
    }))
  }

  const eliminarProductoDevuelto = (productoId) => {
    setProductosDevueltos(productosDevueltos.filter(p => p.producto_id !== productoId))
  }

  const seleccionarProductoNuevo = (productoId) => {
    const producto = productos.find(p => p.id === parseInt(productoId))
    if (producto) {
      setProductoNuevoSeleccionado({
        id: producto.id,
        nombre: producto.nombre,
        precio: parseFloat(producto.precio || 0),
        cantidad: 1
      })
    }
  }

  const actualizarCantidadNuevo = (nuevaCantidad) => {
    if (nuevaCantidad < 1) return
    setProductoNuevoSeleccionado({
      ...productoNuevoSeleccionado,
      cantidad: nuevaCantidad
    })
  }

  const calcularTotalDevuelto = () => {
    return productosDevueltos.reduce((total, p) => total + (p.precio * p.cantidad), 0)
  }

  const calcularTotalNuevo = () => {
    if (!productoNuevoSeleccionado) return 0
    return productoNuevoSeleccionado.precio * productoNuevoSeleccionado.cantidad
  }

  const calcularDiferencia = () => {
    const totalDevuelto = calcularTotalDevuelto()
    const totalNuevo = calcularTotalNuevo()
    const envio = parseFloat(costoEnvioManual) || 0
    return (totalNuevo + envio) - totalDevuelto
  }

  const handleReimprimir = async (ventaId) => {
    if (!ventaId) {
      alert('⚠️ No hay factura asociada a este cambio');
      return;
    }

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
            <p style="margin: 2px 0; font-size: 12px;">#${venta.codigo_entrega || venta.id}</p>
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
            <title>Reimpresión Factura #${venta.codigo_entrega || venta.id}</title>
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
      setMensaje('✅ Factura reimpresa correctamente');
      setTimeout(() => setMensaje(''), 3000);

    } catch (error) {
      console.error('Error reimprimiendo factura:', error);
      alert('❌ Error al reimprimir la factura');
      const loading = document.querySelector('div[style*="position: fixed;"]');
      if (loading) document.body.removeChild(loading);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (productosDevueltos.length === 0) {
      alert('⚠️ Selecciona al menos un producto devuelto')
      return
    }

    if (form.tipo === 'cambio' && !productoNuevoSeleccionado) {
      alert('⚠️ Selecciona el producto nuevo para el cambio')
      return
    }

    const diferencia = calcularDiferencia()
    
    if (diferencia > 0) {
      const confirmar = confirm(`⚠️ El cliente debe pagar RD$ ${diferencia.toFixed(2)} por la diferencia. ¿Confirmar?`)
      if (!confirmar) return
    }

    setCargando(true)
    try {
      const totalDevuelto = calcularTotalDevuelto()
      const totalNuevo = calcularTotalNuevo()
      const envio = parseFloat(costoEnvioManual) || 0

      const dataEnvio = {
        venta_id: form.venta_id,
        factura_original: form.factura_original,
        cliente_nombre: form.cliente_nombre,
        cliente_telefono: form.cliente_telefono,
        productos_devueltos: productosDevueltos,
        producto_nuevo_id: productoNuevoSeleccionado?.id || null,
        producto_nuevo_nombre: productoNuevoSeleccionado?.nombre || '',
        cantidad_nueva: productoNuevoSeleccionado?.cantidad || 1,
        precio_nuevo: productoNuevoSeleccionado?.precio || 0,
        total_devuelto: totalDevuelto,
        total_nuevo: totalNuevo,
        envio: envio,
        diferencia: diferencia,
        tipo: form.tipo,
        motivo: form.motivo,
        usuario_id: usuario.id,
        envio_opcional: form.envio_opcional
      }

      const response = await fetch(`${API_URL}/cambios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataEnvio)
      })

      const data = await response.json()

      if (data.success) {
        setMensaje('✅ Cambio registrado correctamente')
        setMostrarFormulario(false)
        setVentaEncontrada(null)
        setDetallesVenta([])
        setProductosDevueltos([])
        setProductoNuevoSeleccionado(null)
        setCostoEnvioManual(0)
        setFacturaBusqueda('')
        cargarCambios()
        setForm({
          tipo: 'cambio',
          venta_id: '',
          factura_original: '',
          cliente_nombre: '',
          cliente_telefono: '',
          motivo: '',
          envio_opcional: false
        })
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error: ' + (data.error || 'No se pudo registrar el cambio'))
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error registrando cambio: ' + error.message)
    } finally {
      setCargando(false)
    }
  }

  const getTipoLabel = (tipo) => {
    const tipos = {
      'cambio': '🔄 Cambio',
      'devolucion': '💰 Devolución',
      'ajuste': '⚙️ Ajuste'
    }
    return tipos[tipo] || tipo
  }

  const getEstadoColor = (estado) => {
    const colores = {
      'pendiente': '#ff9800',
      'completado': '#4CAF50',
      'cancelado': '#f44336'
    }
    return colores[estado] || '#757575'
  }

  const getEstadoLabel = (estado) => {
    const estados = {
      'pendiente': '⏳ Pendiente',
      'completado': '✅ Completado',
      'cancelado': '❌ Cancelado'
    }
    return estados[estado] || estado
  }

  if (!tieneAcceso) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>⛔ Acceso Denegado</h2>
          <p>No tienes permisos para ver esta página.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <h1>🔄 Cambios y Devoluciones</h1>

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

      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '25px'
      }}>
        <h3 style={{ color: '#003b6f' }}>🔍 Buscar Factura</h3>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={facturaBusqueda}
            onChange={(e) => setFacturaBusqueda(e.target.value)}
            placeholder="Número de factura o ID"
            style={{
              padding: '10px 16px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              flex: 1,
              minWidth: '200px',
              fontSize: '1rem'
            }}
            onKeyPress={(e) => e.key === 'Enter' && buscarFactura()}
          />
          <button
            onClick={buscarFactura}
            disabled={cargando}
            style={{
              padding: '10px 25px',
              backgroundColor: '#003b6f',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            {cargando ? 'Buscando...' : '🔍 Buscar'}
          </button>
        </div>

        {ventaEncontrada && (
          <div style={{
            marginTop: '15px',
            padding: '15px',
            backgroundColor: '#f0f4f8',
            borderRadius: '8px',
            border: '1px solid #ddd'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><strong>Factura:</strong> {ventaEncontrada.codigo_entrega || ventaEncontrada.id}</div>
              <div><strong>Cliente:</strong> {ventaEncontrada.cliente_nombre}</div>
              <div><strong>Teléfono:</strong> {ventaEncontrada.cliente_telefono || 'N/A'}</div>
              <div><strong>Total:</strong> RD$ {Number(ventaEncontrada.total).toFixed(2)}</div>
              <div><strong>Fecha:</strong> {new Date(ventaEncontrada.fecha).toLocaleDateString()}</div>
              <div><strong>Vendedor:</strong> {ventaEncontrada.vendedor_nombre || 'N/A'}</div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <h4>📋 Productos de la venta <span style={{ fontSize: '0.8rem', color: '#666' }}>(Haz clic para seleccionar)</span></h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {detallesVenta.map((d, idx) => {
                  const seleccionado = productosDevueltos.find(p => p.producto_id === d.producto_id)
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleSeleccionProductoDevuelto(d)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderBottom: '1px solid #eee',
                        cursor: 'pointer',
                        backgroundColor: seleccionado ? '#e3f2fd' : 'transparent',
                        borderLeft: seleccionado ? '4px solid #2196F3' : '4px solid transparent',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span>{d.producto_nombre}</span>
                      <span>Cantidad: {d.cantidad} | RD$ {Number(d.producto_precio || d.precio || 0).toFixed(2)}</span>
                      <span style={{ 
                        color: seleccionado ? '#2196F3' : '#999', 
                        fontSize: '0.8rem',
                        fontWeight: seleccionado ? 'bold' : 'normal'
                      }}>
                        {seleccionado ? '✅ Seleccionado' : 'Seleccionar'}
                      </span>
                    </div>
                  )
                })}
              </div>

              {productosDevueltos.length > 0 && (
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                  <strong>📦 Productos devueltos seleccionados: {productosDevueltos.length}</strong>
                  {productosDevueltos.map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 'bold' }}>{p.producto_nombre}</span>
                      <span>Cantidad:</span>
                      <input
                        type="number"
                        min="1"
                        value={p.cantidad}
                        onChange={(e) => actualizarCantidadDevuelto(p.producto_id, parseInt(e.target.value) || 1)}
                        style={{ width: '60px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                      <span>RD$ {Number(p.precio).toFixed(2)} c/u</span>
                      <span style={{ fontWeight: 'bold' }}>Total: RD$ {Number(p.precio * p.cantidad).toFixed(2)}</span>
                      <button
                        onClick={() => eliminarProductoDevuelto(p.producto_id)}
                        style={{ backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div style={{ marginTop: '5px', fontWeight: 'bold', color: '#003b6f', fontSize: '1.1rem' }}>
                    Total devuelto: RD$ {calcularTotalDevuelto().toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setMostrarFormulario(!mostrarFormulario)}
              style={{
                marginTop: '10px',
                padding: '8px 20px',
                backgroundColor: mostrarFormulario ? '#f44336' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {mostrarFormulario ? '✕ Cerrar' : '📝 Registrar Cambio'}
            </button>
          </div>
        )}
      </div>

      {mostrarFormulario && ventaEncontrada && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '25px',
          border: '2px solid #003b6f'
        }}>
          <h3 style={{ color: '#003b6f' }}>📝 Registrar Cambio</h3>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ fontWeight: 'bold' }}>Tipo de Cambio *</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    marginTop: '5px'
                  }}
                >
                  <option value="cambio">🔄 Cambio por otro producto</option>
                  <option value="devolucion">💰 Devolución (reembolso)</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 'bold' }}>Motivo *</label>
                <input
                  type="text"
                  value={form.motivo}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                  placeholder="Ej: Producto defectuoso, falla de fábrica..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    marginTop: '5px'
                  }}
                  required
                />
              </div>
            </div>

            <hr style={{ margin: '20px 0' }} />

            <h4 style={{ color: '#4CAF50' }}>🆕 Producto Nuevo (Cambio)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontWeight: 'bold' }}>Producto Nuevo *</label>
                <select
                  value={productoNuevoSeleccionado?.id || ''}
                  onChange={(e) => seleccionarProductoNuevo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    marginTop: '5px'
                  }}
                  required={form.tipo === 'cambio'}
                >
                  <option value="">Seleccionar producto</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} - RD$ {Number(p.precio).toFixed(2)}</option>
                  ))}
                </select>
              </div>
              {productoNuevoSeleccionado && (
                <>
                  <div>
                    <label style={{ fontWeight: 'bold' }}>Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={productoNuevoSeleccionado.cantidad}
                      onChange={(e) => actualizarCantidadNuevo(parseInt(e.target.value) || 1)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        marginTop: '5px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: 'bold' }}>Precio Nuevo</label>
                    <input
                      type="number"
                      value={productoNuevoSeleccionado.precio}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        marginTop: '5px',
                        backgroundColor: '#f5f5f5'
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            <hr style={{ margin: '20px 0' }} />

            <h4 style={{ color: '#003b6f' }}>🚚 Costo de Envío</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}>
              <div>
                <label style={{ fontWeight: 'bold' }}>Costo Envío (RD$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costoEnvioManual}
                  onChange={(e) => setCostoEnvioManual(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    marginTop: '5px'
                  }}
                  placeholder="0.00"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', paddingTop: '5px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.envio_opcional}
                    onChange={(e) => setForm({ ...form, envio_opcional: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>🚚 El cliente pagó envío</span>
                </label>
              </div>
            </div>

            <hr style={{ margin: '20px 0' }} />

            <div style={{
              padding: '15px',
              backgroundColor: '#f0f4f8',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4>💰 Resumen del Cambio</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '10px' }}>
                <div>
                  <p style={{ margin: '5px 0', color: '#f44336' }}>
                    <strong>Total Devuelto:</strong>
                    <br />RD$ {calcularTotalDevuelto().toFixed(2)}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '5px 0', color: '#4CAF50' }}>
                    <strong>Total Nuevo:</strong>
                    <br />RD$ {calcularTotalNuevo().toFixed(2)}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '5px 0', color: '#003b6f' }}>
                    <strong>Envío:</strong>
                    <br />RD$ {Number(costoEnvioManual).toFixed(2)}
                  </p>
                </div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: calcularDiferencia() > 0 ? '#f44336' : '#4CAF50', marginTop: '15px' }}>
                Diferencia a Pagar: RD$ {calcularDiferencia().toFixed(2)}
                {calcularDiferencia() > 0 && ' (Cliente paga)'}
                {calcularDiferencia() < 0 && ' (Crédito a favor)'}
                {calcularDiferencia() === 0 && ' (Mismo valor)'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
              <button
                type="submit"
                disabled={cargando}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                {cargando ? 'Guardando...' : '✅ Registrar Cambio'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarFormulario(false)
                  setVentaEncontrada(null)
                  setDetallesVenta([])
                  setProductosDevueltos([])
                  setProductoNuevoSeleccionado(null)
                  setCostoEnvioManual(0)
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, color: '#003b6f' }}>📋 Historial de Cambios</h3>
          <div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              style={{
                padding: '8px 16px',
                border: '1px solid #ddd',
                borderRadius: '8px'
              }}
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">⏳ Pendiente</option>
              <option value="completado">✅ Completado</option>
              <option value="cancelado">❌ Cancelado</option>
            </select>
          </div>
        </div>

        {cambiosFiltrados.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>No hay cambios registrados</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f4f8' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Factura</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Cliente</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Tipo</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Producto Devuelto</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Producto Nuevo</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Diferencia</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Fecha</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cambiosFiltrados.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>#{c.id}</td>
                    <td style={{ padding: '10px' }}>{c.factura_original}</td>
                    <td style={{ padding: '10px' }}>{c.cliente_nombre}</td>
                    <td style={{ padding: '10px' }}>{getTipoLabel(c.tipo)}</td>
                    <td style={{ padding: '10px' }}>{c.producto_devuelto_nombre} (x{c.cantidad_devuelta})</td>
                    <td style={{ padding: '10px' }}>
                      {c.producto_nuevo_nombre ? `${c.producto_nuevo_nombre} (x${c.cantidad_nueva})` : '-'}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: Number(c.diferencia) > 0 ? '#f44336' : '#4CAF50' }}>
                      RD$ {Number(c.diferencia).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
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
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      {new Date(c.fecha).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleReimprimir(c.venta_id)}
                        style={{
                          backgroundColor: '#9C27B0',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 10px',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                        title="Reimprimir factura original"
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
    </AdminLayout>
  )
}

export default Cambios