import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Historial() {
  const [ventas, setVentas] = useState([])
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null)
  const [detalles, setDetalles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarEdicion, setMostrarEdicion] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [tiemposRestantes, setTiemposRestantes] = useState({})

  const [editandoVenta, setEditandoVenta] = useState(null)
  const [ventaEdit, setVentaEdit] = useState({
    tipo_entrega: '',
    cliente_nombre: '',
    cliente_telefono: '',
    cliente_direccion: '',
    cliente_referencia: '',
    detalles: ''
  })

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const rol = usuario?.rol || ''
  
  const esSuperAdmin = ['dueno', 'dueño', 'admin'].includes(rol)
  const esSubgerente = ['dueno', 'dueño', 'subgerente', 'admin'].includes(rol)
  
  const sucursalId = usuario?.sucursal_id || null

  const [carritoEdit, setCarritoEdit] = useState([])
  const [clienteEdit, setClienteEdit] = useState({
    nombre: '',
    telefono: '',
    direccion: ''
  })
  const [tipoPagoEdit, setTipoPagoEdit] = useState('Efectivo')
  const [tipoVentaEdit, setTipoVentaEdit] = useState('contado')
  const [tipoEntregaEdit, setTipoEntregaEdit] = useState('retiro')
  const [detallesEdit, setDetallesEdit] = useState('')

  const TIEMPO_LIMITE_MS = 3600000

  useEffect(() => {
    cargarHistorial()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const nuevosTiempos = {}
      const ahora = Date.now()

      ventas.forEach(v => {
        if (v.estado !== 'cancelada' && !esEntregadoReal(v)) {
          const fechaVenta = new Date(v.fecha || v.created_at).getTime()
          const tiempoTranscurrido = ahora - fechaVenta
          const tiempoRestante = TIEMPO_LIMITE_MS - tiempoTranscurrido

          if (tiempoRestante > 0) {
            nuevosTiempos[v.id] = tiempoRestante
          } else {
            nuevosTiempos[v.id] = 0
          }
        }
      })

      setTiemposRestantes(nuevosTiempos)
    }, 1000)

    return () => clearInterval(interval)
  }, [ventas])

  const cargarHistorial = async () => {
    try {
      let url = `${API_URL}/ventas`
      
      if (!esSubgerente) {
        url = `${API_URL}/ventas?sucursal_id=${sucursalId}`
      }
      
      console.log('📜 Cargando historial desde:', url)
      
      const response = await fetch(url)
      const data = await response.json()
      setVentas(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando historial:', error)
      setMensaje('❌ Error cargando historial')
    } finally {
      setCargando(false)
    }
  }

  const formatearTiempoRestante = (ms) => {
    if (ms <= 0) return '⏰ Tiempo agotado'
    
    const minutos = Math.floor(ms / 60000)
    const segundos = Math.floor((ms % 60000) / 1000)
    
    if (minutos > 0) {
      return `${minutos}m ${segundos}s`
    }
    return `${segundos}s`
  }

  const estaDentroDelTiempo = (venta) => {
    if (esSubgerente) return true
    if (venta.estado === 'cancelada') return false
    if (esEntregadoReal(venta)) return false
    
    const fechaVenta = new Date(venta.fecha || venta.created_at).getTime()
    const ahora = Date.now()
    const tiempoTranscurrido = ahora - fechaVenta
    
    return tiempoTranscurrido <= TIEMPO_LIMITE_MS
  }

  const getTiempoRestante = (ventaId) => {
    return tiemposRestantes[ventaId] || 0
  }

  // ============================================
  // FUNCIÓN PARA DETERMINAR SI REALMENTE FUE ENTREGADO
  // ============================================
  const esEntregadoReal = (venta) => {
    // Si el tipo de entrega es 'domicilio' y estado_entrega es 'entregado' o 'entregada' -> REALMENTE entregado
    if (venta.tipo_entrega === 'domicilio' && 
        (venta.estado_entrega === 'entregado' || venta.estado_entrega === 'entregada')) {
      return true
    }
    // Si es 'retirado' pero tipo_entrega es 'retiro', es un error de la vendedora
    if (venta.estado_entrega === 'retirado' && venta.tipo_entrega === 'retiro') {
      return false // NO fue entregado realmente
    }
    return false
  }

  // ============================================
  // FUNCIÓN PARA VER SI SE PUEDE ELIMINAR
  // ============================================
  const puedeEliminarVenta = (venta) => {
    // Dueño/Admin pueden eliminar todo
    if (esSuperAdmin) return true
    
    // Subgerente puede eliminar:
    // 1. Ventas con error de entrega (retiro en tienda)
    // 2. Ventas NO entregadas realmente (domicilio pendiente)
    if (esSubgerente) {
      // Si es retiro en tienda, siempre se puede eliminar (error de vendedora)
      if (venta.tipo_entrega === 'retiro') return true
      // Si es domicilio y NO está entregado realmente
      if (venta.tipo_entrega === 'domicilio' && !esEntregadoReal(venta)) return true
      return false
    }
    
    return false
  }

  // ============================================
  // FUNCIÓN PARA SABER SI ES EDITABLE
  // ============================================
  const esEditable = (venta) => {
    if (venta.estado === 'cancelada') return false
    if (esEntregadoReal(venta)) return false
    if (!esSubgerente && !estaDentroDelTiempo(venta)) return false
    return true
  }

  // ============================================
  // FUNCIÓN PARA SABER SI ES CANCELABLE (SOLO DENTRO DEL TIEMPO)
  // ============================================
  const esCancelable = (venta) => {
    if (venta.estado === 'cancelada') return false
    if (esEntregadoReal(venta)) return false
    if (!esSubgerente && !estaDentroDelTiempo(venta)) return false
    return true
  }

  // ============================================
  // ABRIR EDITAR VENTA
  // ============================================
  const abrirEditarVenta = (venta) => {
    // Solo si no está realmente entregado o es SuperAdmin
    if (esEntregadoReal(venta) && !esSuperAdmin) {
      alert('⚠️ No puedes editar una venta que ya fue entregada a domicilio')
      return
    }
    
    setEditandoVenta(venta.id)
    setVentaEdit({
      tipo_entrega: venta.tipo_entrega || 'retiro',
      cliente_nombre: venta.cliente_nombre || '',
      cliente_telefono: venta.cliente_telefono || '',
      cliente_direccion: venta.cliente_direccion || '',
      cliente_referencia: venta.cliente_referencia || '',
      detalles: venta.detalles || ''
    })
  }

  // ============================================
  // GUARDAR EDICIÓN DE VENTA
  // ============================================
  const guardarEdicionVenta = async () => {
    if (!editandoVenta) return

    setCargando(true)
    try {
      const response = await fetch(`${API_URL}/ventas/${editandoVenta}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ventaEdit,
          usuario_id: usuario.id
        })
      })

      const data = await response.json()
      if (data.success) {
        setMensaje('✅ Venta actualizada correctamente')
        setEditandoVenta(null)
        cargarHistorial()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al actualizar venta')
    } finally {
      setCargando(false)
    }
  }

  // ============================================
  // ELIMINAR VENTA
  // ============================================
  const eliminarVenta = async (venta) => {
    if (!puedeEliminarVenta(venta)) {
      alert('⛔ No tienes permisos para eliminar esta venta')
      return
    }

    const esRetiro = venta.tipo_entrega === 'retiro'
    const mensajeConfirmacion = esRetiro
      ? '⚠️ Esta venta fue marcada como "Retiro en tienda" (error de entrega). ¿Estás seguro de eliminarla?\n\nEl stock se devolverá al inventario.'
      : '⚠️ ¿Estás seguro de eliminar esta venta?\n\nEl stock se devolverá al inventario.'

    if (!window.confirm(mensajeConfirmacion)) return

    setCargando(true)
    try {
      const response = await fetch(`${API_URL}/ventas/${venta.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuario.id
        })
      })

      const data = await response.json()
      if (data.success) {
        setMensaje('✅ Venta eliminada correctamente')
        cargarHistorial()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al eliminar venta')
    } finally {
      setCargando(false)
    }
  }

  // ============================================
  // CANCELAR VENTA (SOLO SI ESTÁ DENTRO DEL TIEMPO)
  // ============================================
  const cancelarVenta = async (ventaId) => {
    const venta = ventas.find(v => v.id === ventaId)
    
    if (!venta) return

    if (!esSubgerente && !estaDentroDelTiempo(venta)) {
      alert('⏰ El tiempo límite de 1 hora para cancelar esta venta ha expirado')
      return
    }

    if (esEntregadoReal(venta)) {
      alert('⚠️ No se puede cancelar una venta que ya fue entregada a domicilio')
      return
    }

    if (!esSubgerente && venta.sucursal_id !== sucursalId) {
      alert('⚠️ Solo puedes cancelar ventas de tu sucursal')
      return
    }

    if (!window.confirm('⚠️ ¿Estás seguro de cancelar esta venta?\n\nEl stock se devolverá al inventario automáticamente.\nEsta acción no se puede deshacer.')) return

    const motivo = prompt('📝 Motivo de la cancelación (opcional):') || 'Cancelado por el usuario'

    try {
      const response = await fetch(`${API_URL}/ventas/${ventaId}/cancelar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuario.id,
          motivo: motivo
        })
      })

      const data = await response.json()

      if (data.success) {
        setMensaje('✅ Venta cancelada correctamente. Stock devuelto al inventario.')
        cargarHistorial()
        localStorage.setItem('dashboard_updated', Date.now().toString())
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error: ' + (data.message || data.error))
      }
    } catch (error) {
      console.error('Error cancelando venta:', error)
      alert('❌ Error al cancelar la venta')
    }
  }

  const verDetalle = async (id) => {
    const venta = ventas.find(v => v.id === id)
    
    if (!esSubgerente && venta && !estaDentroDelTiempo(venta)) {
      alert('⏰ El tiempo límite de 1 hora para editar esta venta ha expirado')
      return
    }

    try {
      const response = await fetch(`${API_URL}/historial/${id}`)
      const data = await response.json()
      if (data.success) {
        setVentaSeleccionada(data.venta)
        setDetalles(data.detalles)
        setClienteEdit({
          nombre: data.venta.cliente_nombre || '',
          telefono: data.venta.cliente_telefono || '',
          direccion: data.venta.cliente_direccion || ''
        })
        setCarritoEdit(data.detalles.map(d => ({
          id: d.producto_id,
          nombre: d.producto_nombre,
          precio: d.precio,
          cantidad: d.cantidad
        })))
        setTipoPagoEdit(data.venta.tipo_pago || 'Efectivo')
        setTipoVentaEdit(data.venta.tipo_venta || 'contado')
        setTipoEntregaEdit(data.venta.tipo_entrega || 'retiro')
        setDetallesEdit(data.venta.detalles || '')
        setMostrarEdicion(true)
      }
    } catch (error) {
      console.error('Error cargando detalle:', error)
    }
  }

  const actualizarCantidadEdit = (id, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      setCarritoEdit(prev => prev.filter(item => item.id !== id))
    } else {
      setCarritoEdit(prev =>
        prev.map(item =>
          item.id === id ? { ...item, cantidad: nuevaCantidad } : item
        )
      )
    }
  }

  const eliminarProductoEdit = (id) => {
    setCarritoEdit(prev => prev.filter(item => item.id !== id))
  }

  const totalEdit = carritoEdit.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)

  const guardarCambios = async () => {
    if (!window.confirm('¿Estás seguro de guardar los cambios? La factura original se anulará.')) return

    if (carritoEdit.length === 0) {
      alert('⚠️ El carrito no puede estar vacío')
      return
    }

    setCargando(true)

    try {
      const response = await fetch(`${API_URL}/historial/editar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venta_id: ventaSeleccionada.id,
          usuario_id: usuario.id,
          cliente_nombre: clienteEdit.nombre,
          cliente_telefono: clienteEdit.telefono,
          cliente_direccion: clienteEdit.direccion,
          carrito: carritoEdit.map(item => ({
            id: item.id,
            precio: item.precio,
            cantidad: item.cantidad
          })),
          total: totalEdit,
          tipo_pago: tipoPagoEdit,
          tipo_venta: tipoVentaEdit,
          tipo_entrega: tipoEntregaEdit,
          detalles: detallesEdit
        })
      })

      const data = await response.json()

      if (data.success) {
        setMensaje('✅ Factura editada correctamente')
        setMostrarEdicion(false)
        setVentaSeleccionada(null)
        cargarHistorial()
        localStorage.setItem('dashboard_updated', Date.now().toString())
        setTimeout(() => setMensaje(''), 3000)
      } else {
        alert('❌ Error: ' + (data.error || 'No se pudo guardar'))
      }
    } catch (error) {
      console.error(error)
      alert('❌ Error guardando cambios')
    } finally {
      setCargando(false)
    }
  }

  const getSucursalNombre = () => {
    if (esSubgerente) return 'Todas las sucursales'
    if (sucursalId === 1) return 'Baní'
    if (sucursalId === 2) return 'Sabana'
    if (sucursalId === 3) return 'Principal'
    return 'Mi Sucursal'
  }

  const getEstadoEntrega = (venta) => {
    if (venta.estado_entrega === 'entregado' || venta.estado_entrega === 'entregada') {
      return { texto: '✅ Entregado', color: '#4CAF50' }
    }
    if (venta.estado_entrega === 'retirado') {
      return { texto: '🏪 Retirado', color: '#2196F3' }
    }
    if (venta.estado_entrega === 'pendiente') {
      return { texto: '⏳ Pendiente', color: '#ff9800' }
    }
    if (venta.estado_entrega === 'fallido') {
      return { texto: '❌ Fallido', color: '#f44336' }
    }
    return { texto: 'N/A', color: '#757575' }
  }

  const handleReimprimir = async (ventaId) => {
    try {
      const loading = document.createElement('div')
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
      `
      loading.innerHTML = '🖨️ Generando factura...'
      document.body.appendChild(loading)

      const response = await fetch(`${API_URL}/ventas/${ventaId}/reimprimir`)
      const data = await response.json()

      if (!data.success) {
        alert('❌ Error al obtener los datos de la factura')
        document.body.removeChild(loading)
        return
      }

      const venta = data.venta
      const detalles = data.detalles
      const sucursal = data.sucursal || { nombre: 'Sucursal Principal', direccion: '', telefono: '' }

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
      `

      detalles.forEach(d => {
        ticketHTML += `
          <tr>
            <td style="padding: 4px 0; text-align: left;">${d.producto_nombre || 'Producto'}</td>
            <td style="padding: 4px 0; text-align: center;">${d.cantidad}</td>
            <td style="padding: 4px 0; text-align: right;">RD$ ${Number(d.precio).toFixed(2)}</td>
            <td style="padding: 4px 0; text-align: right;">RD$ ${(Number(d.precio) * d.cantidad).toFixed(2)}</td>
          </tr>
        `
      })

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
      `

      const ventana = window.open('', '_blank', 'width=400,height=600')
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
      `)
      ventana.document.close()

      document.body.removeChild(loading)
      setMensaje('✅ Factura reimpresa correctamente')
      setTimeout(() => setMensaje(''), 3000)

    } catch (error) {
      console.error('Error reimprimiendo factura:', error)
      alert('❌ Error al reimprimir la factura')
      const loading = document.querySelector('div[style*="position: fixed;"]')
      if (loading) document.body.removeChild(loading)
    }
  }

  if (cargando) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Cargando historial...</h2>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <h1>📜 Historial de Ventas - {getSucursalNombre()}</h1>

      <div style={{
        backgroundColor: '#e3f2fd',
        padding: '10px 15px',
        borderRadius: '8px',
        marginBottom: '20px',
        borderLeft: '4px solid #003b6f'
      }}>
        <p style={{ margin: 0, color: '#003b6f' }}>
          ⏰ <strong>Tiempo límite para editar/cancelar:</strong> 1 hora desde la creación de la factura
        </p>
        <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#666' }}>
          {esSubgerente ? '👑 Como subgerente/dueño, puedes editar sin límite de tiempo' : '🛒 Solo puedes editar/cancelar dentro de la primera hora'}
        </p>
        {esSuperAdmin && (
          <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#f44336' }}>
            🔑 <strong>Dueño/Admin:</strong> Puedes eliminar cualquier venta
          </p>
        )}
        {esSubgerente && !esSuperAdmin && (
          <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#ff9800' }}>
            ⚠️ <strong>Subgerente:</strong> Puedes eliminar ventas con error de entrega (Retiro en tienda) y ventas NO entregadas a domicilio
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

      <div style={{
        overflowX: 'auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          overflow: 'hidden'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#003b6f', color: 'white' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>#</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Cliente</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>👤 Vendedor</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Fecha</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Entrega</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>⏰ Tiempo</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ventas.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                  No hay ventas registradas en {getSucursalNombre()}
                </td>
              </tr>
            ) : (
              ventas.map((v) => {
                const esMismaSucursal = v.sucursal_id === sucursalId
                const puedeCancelar = (esSubgerente || esMismaSucursal) && esCancelable(v)
                const puedeEditar = esEditable(v)
                const entregaInfo = getEstadoEntrega(v)
                const yaEntregado = esEntregadoReal(v)
                const tiempoRestante = getTiempoRestante(v.id)
                const dentroDelTiempo = esSubgerente || (tiempoRestante > 0 && !yaEntregado && v.estado !== 'cancelada')
                const tiempoTexto = esSubgerente ? '∞ Ilimitado' : formatearTiempoRestante(tiempoRestante)

                // 👇 PERMISOS PARA ELIMINAR
                const puedeEliminar = puedeEliminarVenta(v)

                return (
                  <tr key={v.id} style={{ 
                    borderBottom: '1px solid #eee',
                    backgroundColor: yaEntregado || (!dentroDelTiempo && v.estado !== 'cancelada') ? '#f5f5f5' : 'white',
                    opacity: yaEntregado || (!dentroDelTiempo && v.estado !== 'cancelada') ? 0.7 : 1
                  }}>
                    <td style={{ padding: '12px' }}>{v.id}</td>
                    <td style={{ padding: '12px' }}>{v.cliente_nombre || v.cliente || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>{v.vendedor || v.usuario_id || 'N/A'}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      RD$ {Number(v.total).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {new Date(v.fecha || v.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: v.tipo_entrega === 'retiro' ? '#ff9800' : entregaInfo.color,
                        color: 'white',
                        padding: '2px 12px',
                        borderRadius: '12px',
                        fontSize: '0.75rem'
                      }}>
                        {v.tipo_entrega === 'retiro' ? '🏪 Retiro (Error)' : entregaInfo.texto}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {v.estado === 'cancelada' ? (
                        <span style={{ color: '#f44336', fontSize: '0.75rem' }}>❌ Cancelada</span>
                      ) : yaEntregado ? (
                        <span style={{ color: '#4CAF50', fontSize: '0.75rem' }}>✅ Entregado</span>
                      ) : (
                        <span style={{
                          color: tiempoRestante > 0 ? '#003b6f' : '#f44336',
                          fontWeight: tiempoRestante > 0 ? 'bold' : 'normal',
                          fontSize: '0.8rem'
                        }}>
                          {tiempoTexto}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {v.estado === 'cancelada' ? (
                        <span style={{
                          backgroundColor: '#f44336',
                          color: 'white',
                          padding: '2px 12px',
                          borderRadius: '12px',
                          fontSize: '0.8rem'
                        }}>
                          ❌ Cancelada
                        </span>
                      ) : v.estado === 'completada' ? (
                        <span style={{
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          padding: '2px 12px',
                          borderRadius: '12px',
                          fontSize: '0.8rem'
                        }}>
                          ✅ Completada
                        </span>
                      ) : v.estado === 'pendiente' ? (
                        <span style={{
                          backgroundColor: '#ff9800',
                          color: 'white',
                          padding: '2px 12px',
                          borderRadius: '12px',
                          fontSize: '0.8rem'
                        }}>
                          ⏳ Pendiente
                        </span>
                      ) : (
                        <span style={{
                          backgroundColor: '#757575',
                          color: 'white',
                          padding: '2px 12px',
                          borderRadius: '12px',
                          fontSize: '0.8rem'
                        }}>
                          {v.estado || 'Desconocido'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {v.estado === 'cancelada' ? (
                        <span style={{ color: '#999', fontSize: '0.75rem' }}>
                          Cancelada
                        </span>
                      ) : (
                        <>
                          {/* 👇 BOTÓN ELIMINAR - PARA SUBGERENTE Y DUEÑO */}
                          {puedeEliminar && (
                            <button
                              onClick={() => eliminarVenta(v)}
                              style={{
                                backgroundColor: v.tipo_entrega === 'retiro' ? '#ff9800' : '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 10px',
                                cursor: 'pointer',
                                marginRight: '5px',
                                fontSize: '0.75rem'
                              }}
                              title={v.tipo_entrega === 'retiro' ? 'Eliminar venta con error de entrega' : 'Eliminar venta'}
                            >
                              🗑️ Eliminar
                            </button>
                          )}

                          {puedeEditar && (
                            <button
                              onClick={() => verDetalle(v.id)}
                              style={{
                                backgroundColor: '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 10px',
                                cursor: 'pointer',
                                marginRight: '5px',
                                fontSize: '0.75rem'
                              }}
                            >
                              ✏️ Editar
                            </button>
                          )}
                          
                          {puedeCancelar && (
                            <button
                              onClick={() => cancelarVenta(v.id)}
                              style={{
                                backgroundColor: '#ff9800',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 10px',
                                cursor: 'pointer',
                                marginRight: '5px',
                                fontSize: '0.75rem'
                              }}
                            >
                              ❌ Cancelar
                            </button>
                          )}

                          {/* 👇 BOTÓN REIMPRIMIR */}
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

                          {v.estado === 'cancelada' && (
                            <span style={{ color: '#999', fontSize: '0.75rem' }}>
                              {v.motivo_cancelacion || 'Cancelada'}
                            </span>
                          )}
                          {!puedeEditar && !puedeCancelar && v.estado !== 'cancelada' && !yaEntregado && (
                            <span style={{ color: '#999', fontSize: '0.75rem' }}>
                              ⏰ Tiempo agotado
                            </span>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE EDICIÓN DE VENTA */}
      {editandoVenta && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ color: '#003b6f' }}>✏️ Editar Venta #{editandoVenta}</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
              <div>
                <label style={{ fontWeight: 'bold' }}>Tipo de Entrega</label>
                <select
                  value={ventaEdit.tipo_entrega}
                  onChange={(e) => setVentaEdit({ ...ventaEdit, tipo_entrega: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '5px' }}
                >
                  <option value="retiro">🏪 Retiro en tienda</option>
                  <option value="domicilio">🚚 Entrega a domicilio</option>
                </select>
              </div>
              <div>
                <label style={{ fontWeight: 'bold' }}>Cliente</label>
                <input
                  type="text"
                  value={ventaEdit.cliente_nombre}
                  onChange={(e) => setVentaEdit({ ...ventaEdit, cliente_nombre: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '5px' }}
                />
              </div>
              <div>
                <label style={{ fontWeight: 'bold' }}>Teléfono</label>
                <input
                  type="text"
                  value={ventaEdit.cliente_telefono}
                  onChange={(e) => setVentaEdit({ ...ventaEdit, cliente_telefono: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '5px' }}
                />
              </div>
              <div>
                <label style={{ fontWeight: 'bold' }}>Dirección</label>
                <input
                  type="text"
                  value={ventaEdit.cliente_direccion}
                  onChange={(e) => setVentaEdit({ ...ventaEdit, cliente_direccion: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '5px' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontWeight: 'bold' }}>Referencia</label>
                <input
                  type="text"
                  value={ventaEdit.cliente_referencia}
                  onChange={(e) => setVentaEdit({ ...ventaEdit, cliente_referencia: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '5px' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontWeight: 'bold' }}>Detalles adicionales</label>
                <textarea
                  value={ventaEdit.detalles}
                  onChange={(e) => setVentaEdit({ ...ventaEdit, detalles: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', minHeight: '50px', marginTop: '5px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
              <button
                onClick={guardarEdicionVenta}
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
                {cargando ? 'Guardando...' : '✅ Guardar Cambios'}
              </button>
              <button
                onClick={() => {
                  setEditandoVenta(null)
                  setVentaEdit({ tipo_entrega: '', cliente_nombre: '', cliente_telefono: '', cliente_direccion: '', cliente_referencia: '', detalles: '' })
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
          </div>
        </div>
      )}

      {/* Modal de edición de factura (existente) */}
      {mostrarEdicion && ventaSeleccionada && 
       ventaSeleccionada.estado !== 'cancelada' && 
       !esEntregadoReal(ventaSeleccionada) && 
       (esSubgerente || estaDentroDelTiempo(ventaSeleccionada)) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ color: '#003b6f' }}>✏️ Editar Factura #{ventaSeleccionada.id}</h2>
            <p style={{ color: '#666' }}>Cliente: {ventaSeleccionada.cliente_nombre}</p>
            <p style={{ color: '#666' }}>👤 Vendedor: {ventaSeleccionada.vendedor || 'N/A'}</p>
            {!esSubgerente && (
              <p style={{ color: '#ff9800', fontSize: '0.85rem' }}>
                ⏰ Tiempo restante: {formatearTiempoRestante(getTiempoRestante(ventaSeleccionada.id))}
              </p>
            )}

            <hr style={{ margin: '15px 0' }} />

            <h3>👤 Datos del Cliente</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label>Nombre *</label>
                <input
                  type="text"
                  value={clienteEdit.nombre}
                  onChange={(e) => setClienteEdit({ ...clienteEdit, nombre: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label>Teléfono</label>
                <input
                  type="text"
                  value={clienteEdit.telefono}
                  onChange={(e) => setClienteEdit({ ...clienteEdit, telefono: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Dirección</label>
                <input
                  type="text"
                  value={clienteEdit.direccion}
                  onChange={(e) => setClienteEdit({ ...clienteEdit, direccion: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
            </div>

            <h3 style={{ marginTop: '20px' }}>📋 Opciones</h3>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <label>
                <strong>Tipo de Pago:</strong>
                <select
                  value={tipoPagoEdit}
                  onChange={(e) => setTipoPagoEdit(e.target.value)}
                  style={{ marginLeft: '10px', padding: '6px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </label>
              <label>
                <strong>Tipo de Venta:</strong>
                <select
                  value={tipoVentaEdit}
                  onChange={(e) => setTipoVentaEdit(e.target.value)}
                  style={{ marginLeft: '10px', padding: '6px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="contado">Contado</option>
                  <option value="credito">Crédito</option>
                </select>
              </label>
              <label>
                <strong>Tipo de Entrega:</strong>
                <select
                  value={tipoEntregaEdit}
                  onChange={(e) => setTipoEntregaEdit(e.target.value)}
                  style={{ marginLeft: '10px', padding: '6px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="retiro">Retiro en tienda</option>
                  <option value="domicilio">Domicilio</option>
                </select>
              </label>
            </div>

            <h3 style={{ marginTop: '20px' }}>🛒 Productos</h3>
            {carritoEdit.map((item) => (
              <div key={item.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px',
                borderBottom: '1px solid #eee'
              }}>
                <span style={{ flex: 2 }}>{item.nombre}</span>
                <span style={{ flex: 1, textAlign: 'center' }}>
                  <button onClick={() => actualizarCantidadEdit(item.id, item.cantidad - 1)} style={{ cursor: 'pointer' }}>−</button>
                  <span style={{ margin: '0 8px' }}>{item.cantidad}</span>
                  <button onClick={() => actualizarCantidadEdit(item.id, item.cantidad + 1)} style={{ cursor: 'pointer' }}>+</button>
                </span>
                <span style={{ flex: 1, textAlign: 'right' }}>RD$ {(item.precio * item.cantidad).toFixed(2)}</span>
                <button onClick={() => eliminarProductoEdit(item.id)} style={{ backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
            ))}

            <div style={{ textAlign: 'right', marginTop: '15px', fontWeight: 'bold' }}>
              <span style={{ fontSize: '1.2rem' }}>Total: RD$ {totalEdit.toFixed(2)}</span>
            </div>

            <div style={{ marginTop: '15px' }}>
              <label>Detalles adicionales</label>
              <textarea
                value={detallesEdit}
                onChange={(e) => setDetallesEdit(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', minHeight: '50px' }}
                placeholder="Notas adicionales..."
              />
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
              <button
                onClick={guardarCambios}
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
                {cargando ? 'Guardando...' : '✅ Guardar Cambios'}
              </button>
              <button
                onClick={() => {
                  setMostrarEdicion(false)
                  setVentaSeleccionada(null)
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
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default Historial