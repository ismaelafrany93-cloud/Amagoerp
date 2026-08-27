import { useState, useEffect, useMemo, useRef } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import Factura from '../components/Factura'
import API_URL from '../config'

function POS() {
  // ============================================
  // ESTADOS PRINCIPALES
  // ============================================
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('')
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(false)
  const [tipoPago, setTipoPago] = useState('contado')
  const [tipoEntrega, setTipoEntrega] = useState('retiro')
  const [codigoEntrega, setCodigoEntrega] = useState('')
  const [ventaCompletada, setVentaCompletada] = useState(false)
  const [ventaId, setVentaId] = useState(null)
  
  // ============================================
  // ESTADOS DE COSTOS
  // ============================================
  const [costoEnvio, setCostoEnvio] = useState('')
  const [costoInstalacion, setCostoInstalacion] = useState('')
  
  // ============================================
  // ESTADOS DE DESCUENTO
  // ============================================
  const [descuentoMonto, setDescuentoMonto] = useState(0)
  const [codigoAutorizacion, setCodigoAutorizacion] = useState('')
  const [mostrarAutorizacion, setMostrarAutorizacion] = useState(false)
  const [solicitudActiva, setSolicitudActiva] = useState(false)
  const [solicitudDescuento, setSolicitudDescuento] = useState({
    monto: 0,
    motivo: '',
    estado: 'ninguna', // 'ninguna', 'pendiente', 'aprobado', 'rechazado'
    codigo: '',
    id: null,
    venta_id: null
  })
  const [mostrarSolicitud, setMostrarSolicitud] = useState(false)

  // ============================================
  // ESTADOS DE CLIENTE
  // ============================================
  const [cliente, setCliente] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    referencia: '',
    detalles: '',
    es_mayorista: false
  })

  // ============================================
  // ESTADOS DE HISTORIAL
  // ============================================
  const [ventasRecientes, setVentasRecientes] = useState([])
  const [mostrarHistorial, setMostrarHistorial] = useState(false)

  // ============================================
  // REFERENCIAS
  // ============================================
  const facturaRef = useRef()

  // ============================================
  // USUARIO ACTUAL
  // ============================================
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esSucursalPrincipal = usuario.sucursal_id === 3
  const esSucursal = usuario.sucursal_id && usuario.sucursal_id > 0
  const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario?.rol)
  const esVendedor = ['vendedor', 'vendedora'].includes(usuario?.rol)

  // ============================================
  // EFECTOS
  // ============================================
  useEffect(() => {
    cargarProductos()
    cargarVentasRecientes()
    verificarSolicitudPendiente()
  }, [])

  // Extraer categorías automáticamente de los productos
  useEffect(() => {
    if (productos.length > 0) {
      const categoriasUnicas = {}
      productos.forEach(p => {
        if (p.categoria && p.categoria.trim()) {
          const nombreCat = p.categoria.trim()
          if (!categoriasUnicas[nombreCat]) {
            const productoConIcono = productos.find(prod => prod.categoria === nombreCat)
            categoriasUnicas[nombreCat] = {
              nombre: nombreCat,
              icono: productoConIcono?.categoria_icono || getIconoPorCategoria(nombreCat),
              color: productoConIcono?.categoria_color || getColorPorCategoria(nombreCat),
              count: 0
            }
          }
          categoriasUnicas[nombreCat].count++
        }
      })
      
      const listaCategorias = Object.values(categoriasUnicas)
      setCategorias(listaCategorias)
    }
  }, [productos])

  // ============================================
  // FUNCIONES DE CATEGORÍAS
  // ============================================
  const getIconoPorCategoria = (nombre) => {
    const iconos = {
      'credenza': '🪑', 'gabinete': '📦', 'credentas': '🪑',
      'vineras': '🍷', 'espejos': '🪞', 'cocinas': '🍳',
      'closets': '👗', 'muebles': '🛋️', 'sillones': '🛋️',
      'sofás': '🛋️', 'mesas': '🪑', 'armarios': '🚪',
      'sillas': '🪑', 'bancos': '🪑'
    }
    const nombreLower = nombre.toLowerCase()
    for (const [key, icono] of Object.entries(iconos)) {
      if (nombreLower.includes(key)) return icono
    }
    return '📁'
  }

  const getColorPorCategoria = (nombre) => {
    const colores = {
      'credenza': '#FF6B6B', 'gabinete': '#4ECDC4', 'credentas': '#FF6B6B',
      'vineras': '#A8E6CF', 'espejos': '#54A0FF', 'cocinas': '#FF9F43',
      'closets': '#5F27CD', 'muebles': '#FFE66D', 'sillones': '#FF9FF3',
      'sofás': '#FF9FF3', 'mesas': '#1DD1A1', 'armarios': '#00D2D3',
      'sillas': '#F368E0', 'bancos': '#2ED573'
    }
    const nombreLower = nombre.toLowerCase()
    for (const [key, color] of Object.entries(colores)) {
      if (nombreLower.includes(key)) return color
    }
    return '#757575'
  }

  // ============================================
  // FUNCIONES DE CARGA
  // ============================================
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

  const cargarVentasRecientes = async () => {
    try {
      const url = usuario.sucursal_id 
        ? `${API_URL}/ventas/recientes?sucursal_id=${usuario.sucursal_id}&limit=10`
        : `${API_URL}/ventas/recientes?limit=10`;
      const response = await fetch(url);
      const data = await response.json();
      setVentasRecientes(Array.isArray(data) ? data.slice(0, 10) : []);
    } catch (error) {
      console.error('Error cargando ventas recientes:', error);
      setVentasRecientes([]);
    }
  }

  // ============================================
  // FUNCIONES DE SOLICITUD DE DESCUENTO - CORREGIDAS
  // ============================================
  const verificarSolicitudPendiente = async () => {
    const ventaPendiente = localStorage.getItem('venta_pendiente_aprobacion')
    if (ventaPendiente) {
      try {
        const data = JSON.parse(ventaPendiente)
        await verificarEstadoSolicitud(data.solicitudId, data.ventaId)
      } catch (error) {
        console.error('Error al verificar solicitud pendiente:', error)
        localStorage.removeItem('venta_pendiente_aprobacion')
      }
    }
  }

  const verificarEstadoSolicitud = async (solicitudId, ventaId) => {
    try {
      const response = await fetch(`${API_URL}/solicitudes-descuento/${solicitudId}`)
      const data = await response.json()
      
      if (data.success && data.solicitud) {
        const solicitud = data.solicitud
        if (solicitud.estado === 'aprobado') {
          setSolicitudDescuento({
            monto: solicitud.monto_aprobado || solicitud.monto_solicitado,
            motivo: solicitud.motivo,
            estado: 'aprobado',
            codigo: solicitud.codigo_autorizacion,
            id: solicitud.id,
            venta_id: solicitud.venta_id
          })
          setSolicitudActiva(true)
          setDescuentoMonto(solicitud.monto_aprobado || solicitud.monto_solicitado)
          setVentaId(ventaId)
          localStorage.removeItem('venta_pendiente_aprobacion')
          cargarVentaPendiente(ventaId)
        } else if (solicitud.estado === 'rechazado') {
          setSolicitudDescuento({
            ...solicitudDescuento,
            estado: 'rechazado'
          })
          setSolicitudActiva(true)
          localStorage.removeItem('venta_pendiente_aprobacion')
          alert('❌ Su solicitud de descuento fue rechazada')
        }
      }
    } catch (error) {
      console.error('Error verificando solicitud:', error)
    }
  }

  const cargarVentaPendiente = async (ventaId) => {
    try {
      const response = await fetch(`${API_URL}/ventas/${ventaId}`)
      const data = await response.json()
      if (data.success) {
        setCarrito(data.venta.detalles || [])
        setCliente({
          nombre: data.venta.cliente_nombre || '',
          telefono: data.venta.cliente_telefono || '',
          direccion: data.venta.cliente_direccion || '',
          referencia: data.venta.cliente_referencia || '',
          detalles: data.venta.detalles || '',
          es_mayorista: data.venta.cliente_es_mayorista || false
        })
        setTipoPago(data.venta.tipo_pago === 'Crédito' ? 'credito' : 'contado')
        setTipoEntrega(data.venta.tipo_entrega === 'domicilio' ? 'domicilio' : 'retiro')
        setCostoEnvio(data.venta.costo_envio || '')
        setCostoInstalacion(data.venta.costo_instalacion || '')
        setVentaCompletada(true)
      }
    } catch (error) {
      console.error('Error cargando venta:', error)
    }
  }

  // CORREGIDO: solicitarDescuento - Guarda correctamente la solicitud
  const solicitarDescuento = async () => {
    if (!cliente.nombre.trim()) {
      alert('⚠️ Primero ingresa el nombre del cliente')
      return
    }
    if (descuentoMonto <= 0) {
      alert('⚠️ Ingresa un monto de descuento válido')
      return
    }
    if (carrito.length === 0) {
      alert('⚠️ El carrito está vacío')
      return
    }
    
    try {
      setCargando(true)
      
      // Crear la solicitud de descuento directamente
      const solicitudResponse = await fetch(`${API_URL}/solicitudes-descuento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venta_id: null, // Se actualizará después de crear la venta
          usuario_solicitante: usuario.id,
          monto_solicitado: descuentoMonto,
          motivo: `Descuento de RD$ ${descuentoMonto.toFixed(2)} para cliente: ${cliente.nombre}`,
          sucursal_id: usuario.sucursal_id || null
        })
      })

      const solicitudData = await solicitudResponse.json()

      if (solicitudData.success) {
        setSolicitudDescuento({
          monto: descuentoMonto,
          motivo: `Descuento de RD$ ${descuentoMonto.toFixed(2)} para cliente: ${cliente.nombre}`,
          estado: 'pendiente',
          codigo: solicitudData.solicitud.codigo || '',
          id: solicitudData.solicitud.id,
          venta_id: null
        })
        setSolicitudActiva(true)
        setMostrarSolicitud(false)
        
        // Guardar en localStorage para recuperar después
        localStorage.setItem('venta_pendiente_aprobacion', JSON.stringify({
          ventaId: null,
          solicitudId: solicitudData.solicitud.id
        }))
        
        alert(`✅ Solicitud de descuento enviada\n⏳ Espera la aprobación del administrador\n📋 ID: ${solicitudData.solicitud.id}`)
      } else {
        alert('❌ Error al solicitar descuento: ' + (solicitudData.error || 'Desconocido'))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al solicitar descuento')
    } finally {
      setCargando(false)
    }
  }

  // CORREGIDO: cancelarSolicitud - Elimina la solicitud correctamente
  const cancelarSolicitud = async () => {
    if (!solicitudDescuento.id) {
      alert('⚠️ No hay solicitud activa para cancelar')
      return
    }
    
    if (!window.confirm('¿Cancelar la solicitud de descuento?')) return
    
    try {
      setCargando(true)
      
      const response = await fetch(`${API_URL}/solicitudes-descuento/${solicitudDescuento.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setDescuentoMonto(0)
        setSolicitudDescuento({ 
          monto: 0, 
          motivo: '', 
          estado: 'ninguna', 
          codigo: '', 
          id: null, 
          venta_id: null 
        })
        setSolicitudActiva(false)
        setMostrarSolicitud(false)
        localStorage.removeItem('venta_pendiente_aprobacion')
        alert('✅ Solicitud cancelada exitosamente')
      } else {
        alert('❌ Error al cancelar: ' + (data.error || 'Desconocido'))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al cancelar la solicitud')
    } finally {
      setCargando(false)
    }
  }

  // CORREGIDO: aplicarDescuentoDirecto - Solo para admins
  const aplicarDescuentoDirecto = () => {
    if (descuentoMonto <= 0) {
      alert('⚠️ Ingresa un monto de descuento válido')
      return
    }
    
    if (descuentoMonto > subtotal) {
      alert('⚠️ El descuento no puede ser mayor al subtotal')
      return
    }
    
    setSolicitudDescuento({
      monto: descuentoMonto,
      motivo: `Descuento directo de RD$ ${descuentoMonto.toFixed(2)} para cliente: ${cliente.nombre}`,
      estado: 'aprobado',
      codigo: `DIRECTO-${Date.now().toString().slice(-6)}`,
      id: null,
      venta_id: null
    })
    setSolicitudActiva(true)
    setMostrarSolicitud(false)
    
    alert(`✅ Descuento de RD$ ${descuentoMonto.toFixed(2)} aplicado directamente`)
  }

  // ============================================
  // FUNCIONES DE IMPRESIÓN
  // ============================================
  const handleReimprimir = async (ventaId, formato = 'A4') => {
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

      const esSabana = sucursal.id === 2 || 
                       (sucursal.nombre && sucursal.nombre.toLowerCase().includes('sabana'));
      
      const nombreEmpresa = esSabana ? 'Lizhomedecore' : 'AMAGO ERP';

      let ticketHTML;
      
      if (formato === 'POS80') {
        ticketHTML = `
          <div style="font-family: monospace; width: 300px; margin: 0 auto; padding: 10px; background: white; font-size: 11px;">
            <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px;">
              <h2 style="margin: 0; font-size: 16px;">🏭 ${nombreEmpresa}</h2>
              <p style="margin: 2px 0; font-size: 11px;">${sucursal.nombre || 'Sucursal Principal'}</p>
              ${sucursal.direccion ? `<p style="margin: 2px 0; font-size: 10px;">${sucursal.direccion}</p>` : ''}
              <p style="margin: 5px 0; font-size: 12px; font-weight: bold;">FACTURA #${venta.factura || venta.id}</p>
            </div>
            <div style="padding: 8px 0; border-bottom: 1px dashed #000;">
              <p style="margin: 2px 0; font-size: 11px;"><strong>Cliente:</strong> ${venta.cliente_nombre || 'N/A'}</p>
              <p style="margin: 2px 0; font-size: 11px;"><strong>Vendedor:</strong> ${venta.vendedor_nombre || 'N/A'}</p>
              <p style="margin: 2px 0; font-size: 11px;"><strong>Fecha:</strong> ${new Date(venta.fecha).toLocaleString()}</p>
              <p style="margin: 2px 0; font-size: 11px;"><strong>Pago:</strong> ${venta.tipo_pago || 'Efectivo'}</p>
            </div>
            <div style="padding: 8px 0; border-bottom: 1px dashed #000;">
              <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 1px solid #000;">
                    <th style="text-align: left; padding: 2px 0;">Producto</th>
                    <th style="text-align: center; padding: 2px 0;">Cant</th>
                    <th style="text-align: right; padding: 2px 0;">Precio</th>
                    <th style="text-align: right; padding: 2px 0;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${detalles.map(d => `
                    <tr>
                      <td style="padding: 2px 0; text-align: left;">${d.producto_nombre || 'Producto'}</td>
                      <td style="padding: 2px 0; text-align: center;">${d.cantidad}</td>
                      <td style="padding: 2px 0; text-align: right;">RD$ ${Number(d.precio).toFixed(2)}</td>
                      <td style="padding: 2px 0; text-align: right;">RD$ ${(Number(d.precio) * d.cantidad).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr style="border-top: 2px solid #000;">
                    <td colspan="3" style="text-align: right; padding: 4px 0; font-weight: bold;">TOTAL:</td>
                    <td style="text-align: right; padding: 4px 0; font-weight: bold; font-size: 14px;">RD$ ${Number(venta.total).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div style="padding: 8px 0; text-align: center; font-size: 10px; color: #666;">
              <p style="margin: 2px 0;">¡Gracias por su compra!</p>
              <p style="margin: 2px 0;">${new Date().toLocaleString()}</p>
            </div>
          </div>
        `;
      } else {
        ticketHTML = `
          <div style="font-family: Arial, sans-serif; max-width: 210mm; margin: 0 auto; padding: 30px; background: white;">
            <div style="text-align: center; border-bottom: 2px solid #003b6f; padding-bottom: 15px;">
              <h1 style="margin: 0; color: #003b6f;">🏭 ${nombreEmpresa}</h1>
              <h2 style="margin: 5px 0; color: #003b6f;">${sucursal.nombre || 'Sucursal Principal'}</h2>
              ${sucursal.direccion ? `<p style="margin: 2px 0;">${sucursal.direccion}</p>` : ''}
              ${sucursal.telefono ? `<p style="margin: 2px 0;">Tel: ${sucursal.telefono}</p>` : ''}
              <h2 style="margin: 10px 0; color: #003b6f;">FACTURA #${venta.factura || venta.id}</h2>
            </div>
            <div style="padding: 15px 0; border-bottom: 1px solid #ddd;">
              <table style="width: 100%;">
                <tr><td style="padding: 4px;"><strong>Cliente:</strong></td><td>${venta.cliente_nombre || 'N/A'}</td></tr>
                <tr><td style="padding: 4px;"><strong>Teléfono:</strong></td><td>${venta.cliente_telefono || 'N/A'}</td></tr>
                <tr><td style="padding: 4px;"><strong>Dirección:</strong></td><td>${venta.cliente_direccion || 'N/A'}</td></tr>
                <tr><td style="padding: 4px;"><strong>Vendedor:</strong></td><td>${venta.vendedor_nombre || 'N/A'}</td></tr>
                <tr><td style="padding: 4px;"><strong>Fecha:</strong></td><td>${new Date(venta.fecha).toLocaleString()}</td></tr>
                <tr><td style="padding: 4px;"><strong>Tipo Pago:</strong></td><td>${venta.tipo_pago || 'Efectivo'}</td></tr>
                <tr><td style="padding: 4px;"><strong>Estado:</strong></td><td>${venta.estado || 'Completada'}</td></tr>
              </table>
            </div>
            <div style="padding: 15px 0;">
              <h3 style="color: #003b6f;">Detalle de Productos</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #003b6f; color: white;">
                    <th style="padding: 8px; text-align: left;">Producto</th>
                    <th style="padding: 8px; text-align: center;">Cantidad</th>
                    <th style="padding: 8px; text-align: right;">Precio</th>
                    <th style="padding: 8px; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${detalles.map(d => `
                    <tr style="border-bottom: 1px solid #eee;">
                      <td style="padding: 8px;">${d.producto_nombre || 'Producto'}</td>
                      <td style="padding: 8px; text-align: center;">${d.cantidad}</td>
                      <td style="padding: 8px; text-align: right;">RD$ ${Number(d.precio).toFixed(2)}</td>
                      <td style="padding: 8px; text-align: right;">RD$ ${(Number(d.precio) * d.cantidad).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr style="border-top: 2px solid #003b6f; font-weight: bold;">
                    <td colspan="3" style="padding: 10px; text-align: right;">TOTAL:</td>
                    <td style="padding: 10px; text-align: right; font-size: 1.2rem; color: #003b6f;">RD$ ${Number(venta.total).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div style="text-align: center; padding-top: 20px; border-top: 2px solid #003b6f; color: #666; font-size: 0.9rem;">
              <p>¡Gracias por su compra!</p>
              <p>Factura reimpresa el ${new Date().toLocaleString()}</p>
            </div>
          </div>
        `;
      }

      const ancho = formato === 'POS80' ? 400 : 800;
      const ventana = window.open('', '_blank', `width=${ancho},height=600`);
      ventana.document.write(`
        <html>
          <head>
            <title>${formato === 'POS80' ? 'Ticket' : 'Factura'} #${venta.factura || venta.id}</title>
            <style>
              body { margin: 0; padding: 20px; background: #f5f5f5; }
              @media print { body { background: white; padding: 0; } .no-print { display: none; } }
            </style>
          </head>
          <body>
            ${ticketHTML}
            <div style="text-align: center; margin-top: 20px;" class="no-print">
              <button onclick="window.print()" style="padding: 10px 30px; background: #003b6f; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">🖨️ Imprimir</button>
              <button onclick="window.close()" style="padding: 10px 30px; background: #f44336; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin-left: 10px;">✕ Cerrar</button>
            </div>
          </body>
        </html>
      `);
      ventana.document.close();
      document.body.removeChild(loading);
    } catch (error) {
      console.error('Error reimprimiendo factura:', error);
      alert('❌ Error al reimprimir la factura');
      const loading = document.querySelector('div[style*="position: fixed;"]');
      if (loading) document.body.removeChild(loading);
    }
  };

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
      ? `@page { size: A4; margin: 10mm; } body { font-family: Arial, sans-serif; padding: 20px; background: white; } @media print { body { margin: 0; padding: 0; } }`
      : `@page { size: 80mm 297mm; margin: 3mm; } body { font-family: 'Courier New', monospace; font-size: 10px; padding: 5px; background: white; } table { font-size: 9px; } @media print { body { margin: 0; padding: 0; } }`;

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
              setTimeout(function() { window.close(); }, 1000);
            }
          <\/script>
        </body>
      </html>
    `);
    ventana.document.close();
  }

  // ============================================
  // FUNCIONES DEL CARRITO
  // ============================================
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
            ? { ...item, cantidad: nuevaCantidad, precio_unitario: precioUnitario, precio_mostrar: precioUnitario }
            : item
        )
      }
      const precioUnitario = calcularPrecio(producto, 1)
      return [...prev, { ...producto, cantidad: 1, precio_unitario: precioUnitario, precio_mostrar: precioUnitario }]
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
            return { ...item, cantidad: nuevaCantidad, precio_unitario: precioUnitario, precio_mostrar: precioUnitario }
          }
          return item
        })
      )
    }
  }

  const eliminar = (id) => {
    setCarrito(prev => prev.filter(item => item.id !== id))
  }

  // ============================================
  // CÁLCULOS
  // ============================================
  const subtotal = useMemo(() => {
    return carrito.reduce((acc, item) => {
      return acc + (Number(item.precio_unitario || item.precio) * item.cantidad)
    }, 0)
  }, [carrito])

  const total = useMemo(() => {
    const envio = parseFloat(costoEnvio) || 0
    const instalacion = parseFloat(costoInstalacion) || 0
    const descMonto = solicitudDescuento.estado === 'aprobado' ? solicitudDescuento.monto : 0
    const base = subtotal + envio + instalacion
    return base - descMonto
  }, [subtotal, costoEnvio, costoInstalacion, solicitudDescuento])

  // ============================================
  // FUNCIONES DE ACCIÓN
  // ============================================
  const limpiarCarrito = () => {
    if (window.confirm('¿Vaciar todo el carrito?')) {
      setCarrito([])
      setCostoEnvio('')
      setCostoInstalacion('')
      setDescuentoMonto(0)
      setSolicitudDescuento({ monto: 0, motivo: '', estado: 'ninguna', codigo: '', id: null, venta_id: null })
      setSolicitudActiva(false)
      setCodigoAutorizacion('')
      setMostrarAutorizacion(false)
      localStorage.removeItem('venta_pendiente_aprobacion')
    }
  }

  // ============================================
  // FUNCIÓN COBRAR - CORREGIDA CON BLOQUEO
  // ============================================
  const cobrar = async () => {
    if (!cliente.nombre.trim()) {
      alert('⚠️ Por favor ingresa el nombre del cliente')
      return
    }
    if (carrito.length === 0) {
      alert('⚠️ El carrito está vacío')
      return
    }
    
    // 👇 BLOQUEAR COBRO SI HAY SOLICITUD PENDIENTE
    if (solicitudActiva && solicitudDescuento.estado === 'pendiente') {
      alert('⏳ Esta venta tiene una solicitud de descuento pendiente de aprobación.\n\nEspera a que el administrador la apruebe o cancela la solicitud.')
      return
    }

    // 👇 VERIFICAR QUE EL DESCUENTO ESTÉ APROBADO SI HAY SOLICITUD
    if (solicitudActiva && solicitudDescuento.estado !== 'aprobado' && descuentoMonto > 0) {
      alert('⏳ El descuento no ha sido aprobado. Espera la autorización del administrador.')
      return
    }

    const descMonto = solicitudDescuento.estado === 'aprobado' ? solicitudDescuento.monto : 0
    const envio = parseFloat(costoEnvio) || 0
    const instalacion = parseFloat(costoInstalacion) || 0
    
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
        costo_envio: envio,
        costo_instalacion: instalacion,
        descuento_monto: descMonto,
        descuento_aprobado: solicitudDescuento.estado === 'aprobado',
        codigo_autorizacion: solicitudDescuento.codigo || null,
        cliente_es_mayorista: cliente.es_mayorista || false,
        solicitud_descuento_id: solicitudDescuento.id || null
      }

      console.log('📝 Enviando venta:', datosVenta)

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
        if (descMonto > 0) {
          mensaje += `\n💰 Descuento aplicado: RD$ ${descMonto.toFixed(2)}`
          mensaje += `\n🔑 Autorizado: ${solicitudDescuento.codigo || 'DIRECTO'}`
        }
        if (instalacion > 0) {
          mensaje += `\n🔧 Instalación: RD$ ${instalacion.toFixed(2)}`
        }
        if (cliente.es_mayorista) {
          mensaje += `\n👑 Cliente Mayorista - Precio especial aplicado`
        }
        alert(mensaje)
        
        localStorage.removeItem('venta_pendiente_aprobacion')
        setSolicitudDescuento({ monto: 0, motivo: '', estado: 'ninguna', codigo: '', id: null, venta_id: null })
        setSolicitudActiva(false)
        
        cargarVentasRecientes()
      } else {
        alert('❌ Error: ' + (data.error || data.message || 'No se pudo guardar'))
      }
    } catch (error) {
      console.error('❌ Error en cobrar:', error)
      alert('❌ Error guardando venta: ' + error.message)
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
    setCostoInstalacion('')
    setDescuentoMonto(0)
    setSolicitudDescuento({ monto: 0, motivo: '', estado: 'ninguna', codigo: '', id: null, venta_id: null })
    setSolicitudActiva(false)
    setCodigoAutorizacion('')
    setMostrarAutorizacion(false)
    localStorage.removeItem('venta_pendiente_aprobacion')
    cargarVentasRecientes()
  }

  const getTipoFactura = () => {
    if (tipoPago === 'credito' && tipoEntrega === 'domicilio') return '📦 Crédito con Entrega a Domicilio'
    if (tipoPago === 'credito' && tipoEntrega === 'retiro') return '📦 Crédito - Retiro en Tienda'
    if (tipoPago === 'contado' && tipoEntrega === 'domicilio') return '🚚 Contado con Entrega a Domicilio'
    return '💰 Contado - Retiro en Tienda'
  }

  const esSucursalNoPrincipal = esSucursal && !esSucursalPrincipal

  const productosFiltrados = useMemo(() => {
    let filtrados = productos
    if (categoriaSeleccionada) {
      filtrados = filtrados.filter(p => p.categoria === categoriaSeleccionada)
    }
    if (busqueda.trim()) {
      filtrados = filtrados.filter(p => 
        p.nombre && p.nombre.toLowerCase().includes(busqueda.toLowerCase())
      )
    }
    return filtrados
  }, [productos, categoriaSeleccionada, busqueda])

  // ============================================
  // RENDER - VENTA COMPLETADA
  // ============================================
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
              <button onClick={() => imprimirFactura('A4')} style={{ padding: '12px 30px', backgroundColor: '#003b6f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}>🖨️ Factura A4</button>
              <button onClick={() => imprimirFactura('POS80')} style={{ padding: '12px 30px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}>🧾 Ticket POS80</button>
              <button onClick={nuevaVenta} style={{ padding: '12px 30px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}>Nueva Venta</button>
            </div>
          </div>

          <div style={{ position: 'fixed', left: '-9999px', top: 0, width: '210mm', backgroundColor: 'white', padding: '20px', zIndex: 9999 }}>
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
              sucursalNombre={usuario.sucursal || 'Sucursal Principal'}
              sucursalId={usuario.sucursal_id || 3}
            />
          </div>
        </div>
      </AdminLayout>
    )
  }

  // ============================================
  // RENDER - POS ACTIVO
  // ============================================
  return (
    <AdminLayout>
      <h1>🛒 Punto de Venta</h1>

      {/* BOTÓN HISTORIAL */}
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

      {/* HISTORIAL */}
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
                      <td style={{ padding: '6px', textAlign: 'right' }}>RD$ {Number(v.total).toFixed(2)}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>{new Date(v.fecha).toLocaleDateString()}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button onClick={() => handleReimprimir(v.id, 'A4')} style={{ backgroundColor: '#003b6f', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.7rem' }} title="Factura A4">📄 A4</button>
                          <button onClick={() => handleReimprimir(v.id, 'POS80')} style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.7rem' }} title="Ticket POS80">🧾 POS</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* INDICADORES DE SUCURSAL */}
      {esSucursalNoPrincipal && (
        <div style={{ backgroundColor: '#fff3e0', padding: '12px 20px', borderRadius: '8px', marginBottom: '15px', borderLeft: '4px solid #ff9800' }}>
          <p style={{ margin: 0, color: '#e65100' }}>🏢 <strong>{usuario.sucursal_nombre || 'Mi Sucursal'}</strong> - Mostrando productos de tu sucursal</p>
        </div>
      )}
      {esSucursalPrincipal && (
        <div style={{ backgroundColor: '#e3f2fd', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', borderLeft: '4px solid #003b6f' }}>
          <p style={{ margin: 0, color: '#003b6f' }}>👑 <strong>Sucursal Principal</strong> - Precios al por mayor disponibles</p>
        </div>
      )}

      {/* TIPO DE PAGO */}
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
          <input type="radio" checked={tipoPago === 'contado'} onChange={() => setTipoPago('contado')} /> 💰 Contado
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="radio" checked={tipoPago === 'credito'} onChange={() => setTipoPago('credito')} /> 📦 Crédito
        </label>
      </div>

      {/* TIPO DE ENTREGA */}
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
          <input type="radio" checked={tipoEntrega === 'retiro'} onChange={() => setTipoEntrega('retiro')} /> 🏪 Retiro en tienda
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="radio" checked={tipoEntrega === 'domicilio'} onChange={() => setTipoEntrega('domicilio')} /> 🚚 Entrega a domicilio
        </label>
      </div>

      {/* ========================================== */}
      {/* SECCIÓN DE COSTOS Y DESCUENTOS */}
      {/* ========================================== */}
      <div style={{
        border: '2px solid #003b6f',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px',
        backgroundColor: '#e8f0fe',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#003b6f' }}>💰 Costos y Descuentos</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          {/* COSTO DE ENVÍO */}
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px', color: '#003b6f' }}>
              🚚 Envío (RD$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costoEnvio}
              onChange={(e) => setCostoEnvio(e.target.value)}
              placeholder="0.00"
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #003b6f', 
                borderRadius: '8px', 
                backgroundColor: 'white' 
              }}
            />
          </div>
          
          {/* COSTO DE INSTALACIÓN */}
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px', color: '#003b6f' }}>
              🔧 Instalación (RD$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costoInstalacion}
              onChange={(e) => setCostoInstalacion(e.target.value)}
              placeholder="0.00"
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #003b6f', 
                borderRadius: '8px', 
                backgroundColor: 'white' 
              }}
            />
          </div>
          
          {/* DESCUENTO */}
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px', color: '#003b6f' }}>
              💰 Descuento (RD$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={descuentoMonto}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0
                setDescuentoMonto(val)
                if (val > 0 && esVendedor && !esAdmin) {
                  setMostrarSolicitud(true)
                } else {
                  setMostrarSolicitud(false)
                  if (val === 0) {
                    setSolicitudDescuento({ monto: 0, motivo: '', estado: 'ninguna', codigo: '', id: null, venta_id: null })
                    setSolicitudActiva(false)
                  }
                }
              }}
              placeholder="0.00"
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #003b6f', 
                borderRadius: '8px', 
                backgroundColor: 'white' 
              }}
            />
          </div>
        </div>
        
        {/* ESTADO DE LA SOLICITUD - SOLO SI HAY SOLICITUD ACTIVA */}
        {solicitudActiva && (
          <div style={{ marginTop: '10px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px', color: '#003b6f' }}>
              📋 Estado de Solicitud
            </label>
            <div style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: solicitudDescuento.estado === 'pendiente' ? '#fff3e0' :
                              solicitudDescuento.estado === 'aprobado' ? '#e8f5e9' : '#ffebee',
              border: `1px solid ${
                solicitudDescuento.estado === 'pendiente' ? '#ff9800' :
                solicitudDescuento.estado === 'aprobado' ? '#4CAF50' : '#f44336'
              }`
            }}>
              {solicitudDescuento.estado === 'pendiente' && (
                <span style={{ color: '#e65100' }}>⏳ Pendiente de aprobación</span>
              )}
              {solicitudDescuento.estado === 'aprobado' && (
                <span style={{ color: '#1b5e20' }}>✅ Aprobado - Código: {solicitudDescuento.codigo}</span>
              )}
              {solicitudDescuento.estado === 'rechazado' && (
                <span style={{ color: '#c62828' }}>❌ Rechazado</span>
              )}
              {solicitudDescuento.estado === 'pendiente' && !esAdmin && (
                <button
                  onClick={cancelarSolicitud}
                  style={{
                    marginLeft: '10px',
                    padding: '2px 10px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.7rem'
                  }}
                >
                  Cancelar
                </button>
              )}
              {solicitudDescuento.codigo && solicitudDescuento.estado === 'aprobado' && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(solicitudDescuento.codigo)
                    alert('📋 Código copiado: ' + solicitudDescuento.codigo)
                  }}
                  style={{
                    marginLeft: '10px',
                    padding: '2px 10px',
                    backgroundColor: '#003b6f',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.7rem'
                  }}
                >
                  📋 Copiar
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* BOTONES DE ACCIÓN */}
        {mostrarSolicitud && solicitudDescuento.estado !== 'pendiente' && !esAdmin && (
          <button
            onClick={solicitarDescuento}
            disabled={cargando}
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              backgroundColor: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: cargando ? 'not-allowed' : 'pointer',
              width: '100%',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              opacity: cargando ? 0.6 : 1
            }}
          >
            {cargando ? '⏳ Enviando...' : '📨 Solicitar Aprobación'}
          </button>
        )}
        
        {esAdmin && descuentoMonto > 0 && solicitudDescuento.estado !== 'aprobado' && (
          <button
            onClick={aplicarDescuentoDirecto}
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              width: '100%',
              fontSize: '0.95rem',
              fontWeight: 'bold'
            }}
          >
            ✅ Aplicar Descuento Directo (Admin)
          </button>
        )}
        
        {solicitudDescuento.estado === 'aprobado' && (
          <div style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#e8f5e9',
            borderRadius: '6px',
            border: '1px solid #4CAF50'
          }}>
            <p style={{ margin: 0, color: '#1b5e20', fontWeight: 'bold' }}>
              ✅ Descuento aprobado: RD$ {solicitudDescuento.monto.toFixed(2)}
            </p>
            <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#666' }}>
              Código: {solicitudDescuento.codigo}
            </p>
          </div>
        )}
      </div>

      {/* DATOS DEL CLIENTE */}
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
            <input type="text" value={cliente.nombre} onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })} placeholder="Nombre del cliente" style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Teléfono</label>
            <input type="text" value={cliente.telefono} onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })} placeholder="809-555-0000" style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Dirección</label>
            <input type="text" value={cliente.direccion} onChange={(e) => setCliente({ ...cliente, direccion: e.target.value })} placeholder="Calle, número, sector" style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Referencia</label>
            <input type="text" value={cliente.referencia} onChange={(e) => setCliente({ ...cliente, referencia: e.target.value })} placeholder="Punto de referencia" style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }} />
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
                <input type="checkbox" checked={cliente.es_mayorista || false} onChange={(e) => setCliente({ ...cliente, es_mayorista: e.target.checked })} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#4CAF50' }} />
                <div>
                  <span style={{ fontWeight: 'bold' }}>👑 Cliente Mayorista</span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#666' }}>{cliente.es_mayorista ? '✅ Precio al por mayor aplicado automáticamente' : 'Marcar si este cliente es mayorista (solo disponible en Principal)'}</p>
                </div>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* RESUMEN DE VENTA */}
      {carrito.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #003b6f' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#003b6f' }}>📊 Resumen de la Venta</h4>
          <p style={{ margin: '5px 0' }}><strong>Subtotal:</strong> RD$ {subtotal.toFixed(2)}</p>
          {parseFloat(costoEnvio) > 0 && <p style={{ margin: '5px 0' }}><strong>Envío:</strong> RD$ {parseFloat(costoEnvio).toFixed(2)}</p>}
          {parseFloat(costoInstalacion) > 0 && <p style={{ margin: '5px 0' }}><strong>Instalación:</strong> RD$ {parseFloat(costoInstalacion).toFixed(2)}</p>}
          {solicitudDescuento.estado === 'aprobado' && solicitudDescuento.monto > 0 && <p style={{ margin: '5px 0', color: '#d32f2f' }}><strong>Descuento:</strong> -RD$ {solicitudDescuento.monto.toFixed(2)}</p>}
          {cliente.es_mayorista && <p style={{ margin: '5px 0', color: '#4CAF50', fontWeight: 'bold' }}>👑 Cliente Mayorista - Precio especial aplicado</p>}
          <p style={{ margin: '5px 0', fontSize: '1.3rem', fontWeight: 'bold', color: '#003b6f' }}><strong>Total a pagar:</strong> RD$ {total.toFixed(2)}</p>
        </div>
      )}

      {/* FILTRO POR CATEGORÍA */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
          <button onClick={() => setCategoriaSeleccionada('')} style={{
            padding: '10px 20px',
            borderRadius: '12px',
            border: categoriaSeleccionada === '' ? '3px solid #003b6f' : '2px solid #ddd',
            backgroundColor: categoriaSeleccionada === '' ? '#003b6f' : 'white',
            color: categoriaSeleccionada === '' ? 'white' : '#333',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            transition: 'all 0.3s ease',
            boxShadow: categoriaSeleccionada === '' ? '0 4px 12px rgba(0,59,111,0.3)' : '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            📋 Todas <span style={{ marginLeft: '8px', backgroundColor: categoriaSeleccionada === '' ? 'rgba(255,255,255,0.2)' : '#f0f4f8', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', color: categoriaSeleccionada === '' ? 'white' : '#666' }}>{productos.length}</span>
          </button>
          {categorias.map((cat) => {
            const isSelected = categoriaSeleccionada === cat.nombre
            return (
              <button key={cat.nombre} onClick={() => setCategoriaSeleccionada(isSelected ? '' : cat.nombre)} style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: isSelected ? `3px solid ${cat.color}` : '2px solid #ddd',
                backgroundColor: isSelected ? cat.color : 'white',
                color: isSelected ? 'white' : '#333',
                cursor: 'pointer',
                fontWeight: isSelected ? 'bold' : 'normal',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                boxShadow: isSelected ? `0 4px 12px ${cat.color}40` : '0 2px 4px rgba(0,0,0,0.05)',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ fontSize: '1.2rem' }}>{cat.icono || '📁'}</span>
                {cat.nombre}
                <span style={{ marginLeft: '6px', backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#f0f4f8', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', color: isSelected ? 'white' : '#666' }}>{cat.count}</span>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="text" placeholder="🔍 Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{
            flex: 1,
            padding: '10px 16px',
            border: '2px solid #e0e0e0',
            borderRadius: '10px',
            minWidth: '200px',
            fontSize: '0.95rem',
            transition: 'border-color 0.3s ease',
            outline: 'none'
          }} onFocus={(e) => e.target.style.borderColor = '#003b6f'} onBlur={(e) => e.target.style.borderColor = '#e0e0e0'} />
          {categoriaSeleccionada && (
            <button onClick={() => setCategoriaSeleccionada('')} style={{ padding: '8px 16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>✕ Limpiar filtro</button>
          )}
          <span style={{ fontSize: '0.85rem', color: '#666', backgroundColor: '#f0f4f8', padding: '6px 14px', borderRadius: '12px' }}>{productosFiltrados.length} productos</span>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL CON CARRITO FIJO */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', position: 'relative' }}>
        <div style={{ flex: 2, maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
          {productosFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9f9f9', borderRadius: '12px', color: '#999' }}>
              <p style={{ fontSize: '1.5rem' }}>🔍</p>
              <p style={{ fontSize: '1.1rem' }}>{busqueda ? 'No se encontraron productos con esa búsqueda' : 'No hay productos en esta categoría'}</p>
              <p style={{ fontSize: '0.9rem', color: '#bbb' }}>{busqueda ? 'Intenta con otra palabra' : 'Selecciona otra categoría o prueba con la búsqueda'}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
              {productosFiltrados.map((producto) => (
                <div key={producto.id} style={{
                  border: '1px solid #ddd',
                  padding: '15px',
                  borderRadius: '10px',
                  backgroundColor: '#f9f9f9',
                  opacity: (producto.stock || 0) <= 0 ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}>
                  {producto.categoria && <span style={{ fontSize: '0.7rem', backgroundColor: '#e3f2fd', padding: '2px 8px', borderRadius: '10px', color: '#003b6f', display: 'inline-block', marginBottom: '5px' }}>{producto.categoria}</span>}
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem' }}>{producto.nombre || 'Sin nombre'}</h4>
                  <p style={{ margin: '5px 0', fontSize: '1.1rem', fontWeight: 'bold', color: '#003b6f' }}>RD$ {Number(producto.precio || 0).toFixed(2)}</p>
                  {esSucursalPrincipal && producto.precio_mayor && <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#4CAF50' }}>Mayor: RD$ {Number(producto.precio_mayor).toFixed(2)} (mín. {producto.cantidad_mayor || 10}u)</p>}
                  <p style={{ margin: '2px 0', fontSize: '0.8rem', color: (producto.stock || 0) <= 0 ? '#f44336' : (producto.stock || 0) <= 5 ? '#ff9800' : '#666' }}>Stock: {producto.stock || 0}{(producto.stock || 0) <= 0 && ' ❌ Agotado'}</p>
                  <button onClick={() => agregar(producto)} disabled={(producto.stock || 0) <= 0} style={{
                    backgroundColor: (producto.stock || 0) <= 0 ? '#999' : '#003b6f',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    cursor: (producto.stock || 0) <= 0 ? 'not-allowed' : 'pointer',
                    width: '100%',
                    marginTop: '8px',
                    transition: 'background-color 0.2s'
                  }}>{(producto.stock || 0) <= 0 ? 'Agotado' : 'Agregar'}</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CARRITO */}
        <div style={{ flex: 1, position: 'sticky', top: '20px', alignSelf: 'flex-start', maxHeight: '75vh', borderLeft: '2px solid #eee', paddingLeft: '20px', backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', minWidth: '280px', maxWidth: '350px', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0, color: '#003b6f', borderBottom: '2px solid #003b6f', paddingBottom: '10px' }}>🛒 Carrito {carrito.length > 0 && `(${carrito.length})`}</h3>
          {carrito.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', padding: '30px 0' }}>Carrito vacío</p>
          ) : (
            <>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {carrito.map((item) => (
                  <div key={item.id} style={{ border: '1px solid #eee', padding: '10px', borderRadius: '8px', marginBottom: '10px', backgroundColor: '#fafafa' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{item.nombre || 'Sin nombre'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <button onClick={() => actualizarCantidad(item.id, item.cantidad - 1)} style={{ cursor: 'pointer', padding: '2px 10px', backgroundColor: '#e0e0e0', border: 'none', borderRadius: '4px', fontSize: '1rem' }}>−</button>
                        <span style={{ fontWeight: 'bold', minWidth: '25px', textAlign: 'center' }}>{item.cantidad}</span>
                        <button onClick={() => actualizarCantidad(item.id, item.cantidad + 1)} style={{ cursor: 'pointer', padding: '2px 10px', backgroundColor: '#e0e0e0', border: 'none', borderRadius: '4px', fontSize: '1rem' }}>+</button>
                      </div>
                      <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#003b6f' }}>RD$ {(Number(item.precio_unitario || item.precio) * item.cantidad).toFixed(2)}</span>
                      <button onClick={() => eliminar(item.id)} style={{ backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '2px solid #003b6f', paddingTop: '12px', marginTop: '10px' }}>
                <h3 style={{ color: '#003b6f', fontSize: '1.2rem', margin: '0 0 5px 0' }}>Total: RD$ {total.toFixed(2)}</h3>
                <p style={{ fontSize: '0.8rem', color: '#666', margin: '0' }}>{carrito.length} producto{carrito.length > 1 ? 's' : ''} en carrito</p>
              </div>
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <button onClick={limpiarCarrito} style={{ backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '6px', padding: '10px', cursor: 'pointer', fontSize: '0.9rem' }}>🗑️ Limpiar Carrito</button>
                <button
                  onClick={cobrar}
                  disabled={cargando || carrito.length === 0 || (solicitudActiva && solicitudDescuento.estado === 'pendiente')}
                  style={{
                    backgroundColor: (solicitudActiva && solicitudDescuento.estado === 'pendiente') ? '#FF9800' : 
                                    (solicitudActiva && solicitudDescuento.estado === 'aprobado') ? '#4CAF50' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '12px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    cursor: cargando || carrito.length === 0 || (solicitudActiva && solicitudDescuento.estado === 'pendiente') ? 'not-allowed' : 'pointer',
                    opacity: cargando || carrito.length === 0 || (solicitudActiva && solicitudDescuento.estado === 'pendiente') ? 0.6 : 1
                  }}
                >
                  {(solicitudActiva && solicitudDescuento.estado === 'pendiente') 
                    ? '⏳ Esperando aprobación...' 
                    : (solicitudActiva && solicitudDescuento.estado === 'aprobado')
                      ? '✅ Descuento aprobado - Cobrar'
                      : cargando 
                        ? 'Procesando...' 
                        : '💳 Cobrar'}
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