import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Cambios() {
  const [cambios, setCambios] = useState([])
  const [productos, setProductos] = useState([])
  const [facturaBusqueda, setFacturaBusqueda] = useState('')
  const [ventaEncontrada, setVentaEncontrada] = useState(null)
  const [detallesVenta, setDetallesVenta] = useState([])
  const [productosDevueltos, setProductosDevueltos] = useState([])
  const [productoNuevoSeleccionado, setProductoNuevoSeleccionado] = useState(null)

  const [cargando, setCargando] = useState(false)
  const [cargandoFactura, setCargandoFactura] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroSucursal, setFiltroSucursal] = useState('')
  const [busquedaHistorial, setBusquedaHistorial] = useState('')
  const [costoEnvioManual, setCostoEnvioManual] = useState(0)

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  const rol = String(usuario?.rol || '').toLowerCase()

  const tieneAcceso = [
    'dueno',
    'dueño',
    'subgerente',
    'admin',
    'vendedor',
    'vendedora'
  ].includes(rol)

  const [form, setForm] = useState({
    tipo: 'cambio',
    venta_id: '',
    factura_original: '',
    cliente_nombre: '',
    cliente_telefono: '',
    motivo: '',
    envio_opcional: false
  })

  const sucursales = [
    { id: 1, nombre: 'Sucursal 1' },
    { id: 2, nombre: 'Sucursal 2' },
    { id: 3, nombre: 'Sucursal 3' }
  ]

  useEffect(() => {
    if (!tieneAcceso) return

    cargarCambios()
    cargarProductos()
  }, [tieneAcceso])

  const cargarCambios = async () => {
    try {
      const response = await fetch(`${API_URL}/cambios`)

      if (!response.ok) {
        throw new Error('No se pudo cargar el historial')
      }

      const data = await response.json()

      setCambios(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando cambios:', error)
      setCambios([])
      setError('No se pudo cargar el historial de cambios')
    }
  }

  const cargarProductos = async () => {
    try {
      const response = await fetch(`${API_URL}/productos`)

      if (!response.ok) {
        throw new Error('No se pudieron cargar los productos')
      }

      const data = await response.json()

      setProductos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando productos:', error)
      setProductos([])
    }
  }

  const limpiarMensajes = () => {
    setMensaje('')
    setError('')
  }

  const mostrarMensaje = (texto) => {
    setMensaje(texto)
    setError('')

    setTimeout(() => {
      setMensaje('')
    }, 4000)
  }

  const mostrarError = (texto) => {
    setError(texto)
    setMensaje('')

    setTimeout(() => {
      setError('')
    }, 5000)
  }

  const buscarFactura = async () => {
    const codigo = facturaBusqueda.trim()

    if (!codigo) {
      mostrarError('Ingresa un número de factura o ID de venta')
      return
    }

    limpiarMensajes()
    setCargandoFactura(true)

    try {
      const response = await fetch(
        `${API_URL}/cambios/venta/${encodeURIComponent(codigo)}`
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Factura no encontrada')
      }

      setVentaEncontrada(data.venta || null)
      setDetallesVenta(Array.isArray(data.detalles) ? data.detalles : [])
      setProductosDevueltos([])
      setProductoNuevoSeleccionado(null)
      setCostoEnvioManual(0)
      setMostrarFormulario(false)

      setForm({
        tipo: 'cambio',
        venta_id: data.venta.id,
        factura_original:
          data.venta.codigo_entrega || data.venta.id,
        cliente_nombre:
          data.venta.cliente_nombre || '',
        cliente_telefono:
          data.venta.cliente_telefono || '',
        motivo: '',
        envio_opcional: false
      })

      mostrarMensaje(
        `Factura ${
          data.venta.codigo_entrega || data.venta.id
        } encontrada`
      )
    } catch (error) {
      console.error('Error buscando factura:', error)

      setVentaEncontrada(null)
      setDetallesVenta([])
      setProductosDevueltos([])
      setProductoNuevoSeleccionado(null)

      mostrarError(error.message || 'Error buscando la factura')
    } finally {
      setCargandoFactura(false)
    }
  }

  const seleccionarProductoDevuelto = (detalle) => {
    if (!detalle) return

    // ============================================
// CAMBIO DE MERCANCÍA - FUNCIÓN PRINCIPAL
// ============================================
const realizarCambioMercancia = async () => {
  if (!ventaEncontrada) {
    mostrarError('No hay una venta seleccionada')
    return
  }

  if (productosDevueltos.length === 0) {
    mostrarError('Selecciona los productos que el cliente va a devolver')
    return
  }

  if (!productoNuevoSeleccionado) {
    mostrarError('Selecciona el producto nuevo para el cambio')
    return
  }

  if (!form.motivo.trim()) {
    mostrarError('Ingresa el motivo del cambio')
    return
  }

  // Validar que la cantidad devuelta no supere la vendida
  for (const producto of productosDevueltos) {
    const vendido = detallesVenta.find(
      d => Number(d.producto_id || d.id) === Number(producto.producto_id)
    )
    if (vendido && Number(producto.cantidad) > Number(vendido.cantidad)) {
      mostrarError(
        `No puedes devolver ${producto.cantidad} unidades de ${producto.producto_nombre}. Solo se vendieron ${vendido.cantidad}.`
      )
      return
    }
  }

  // Validar stock del producto nuevo
  if (productoNuevoSeleccionado.stock < productoNuevoSeleccionado.cantidad) {
    mostrarError(
      `Stock insuficiente de ${productoNuevoSeleccionado.nombre}. Disponible: ${productoNuevoSeleccionado.stock}, Requerido: ${productoNuevoSeleccionado.cantidad}`
    )
    return
  }

  const confirmar = confirm(
    `🔄 CAMBIO DE MERCANCÍA\n\n` +
    `📦 Producto(s) devuelto(s):\n${productosDevueltos.map(p => 
      `  - ${p.producto_nombre} (x${p.cantidad}) = RD$ ${(p.precio * p.cantidad).toFixed(2)}`
    ).join('\n')}\n\n` +
    `🆕 Producto nuevo:\n  - ${productoNuevoSeleccionado.nombre} (x${productoNuevoSeleccionado.cantidad}) = RD$ ${(productoNuevoSeleccionado.precio * productoNuevoSeleccionado.cantidad).toFixed(2)}\n\n` +
    `💰 Diferencia a pagar: RD$ ${Math.abs(diferencia).toFixed(2)}\n` +
    `${diferencia > 0 ? '⚠️ El cliente debe pagar esta diferencia' : '✅ El cliente tiene crédito a favor'}\n\n` +
    `¿Confirmar el cambio de mercancía?`
  )

  if (!confirmar) return

  setCargando(true)
  limpiarMensajes()

  try {
    const payload = {
      venta_id: Number(form.venta_id),
      factura_original: form.factura_original,
      cliente_nombre: form.cliente_nombre,
      cliente_telefono: form.cliente_telefono,
      productos_devueltos: productosDevueltos.map(p => ({
        producto_id: Number(p.producto_id),
        producto_nombre: p.producto_nombre,
        cantidad: Number(p.cantidad),
        precio: Number(p.precio)
      })),
      producto_nuevo_id: Number(productoNuevoSeleccionado.id),
      producto_nuevo_nombre: productoNuevoSeleccionado.nombre,
      cantidad_nueva: Number(productoNuevoSeleccionado.cantidad),
      precio_nuevo: Number(productoNuevoSeleccionado.precio),
      total_devuelto: Number(totalDevuelto.toFixed(2)),
      total_nuevo: Number(totalNuevo.toFixed(2)),
      envio: Number(envio.toFixed(2)),
      diferencia: Number(diferencia.toFixed(2)),
      tipo: 'cambio',
      motivo: form.motivo.trim(),
      usuario_id: usuario.id ? Number(usuario.id) : null,
      envio_opcional: Boolean(form.envio_opcional)
    }

    const response = await fetch(`${API_URL}/cambios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || 'No se pudo registrar el cambio')
    }

    mostrarMensaje('✅ Cambio de mercancía registrado correctamente')
    limpiarOperacion()
    await cargarCambios()
    await cargarProductos()
  } catch (error) {
    console.error('Error registrando cambio:', error)
    mostrarError(error.message || 'Error registrando el cambio')
  } finally {
    setCargando(false)
  }
}

    const productoId = Number(
      detalle.producto_id || detalle.id
    )

    if (!productoId) return

    const cantidadVendida = Number(detalle.cantidad || 0)

    if (cantidadVendida <= 0) {
      mostrarError('La cantidad vendida de este producto no es válida')
      return
    }

    const existente = productosDevueltos.find(
      p => Number(p.producto_id) === productoId
    )

    if (existente) {
      setProductosDevueltos(prev =>
        prev.filter(
          p => Number(p.producto_id) !== productoId
        )
      )

      return
    }

    const nombre =
      detalle.producto_nombre ||
      detalle.nombre ||
      'Producto'

    const precio = Number(
      detalle.producto_precio ||
      detalle.precio ||
      0
    )

    setProductosDevueltos(prev => [
      ...prev,
      {
        producto_id: productoId,
        producto_nombre: nombre,
        cantidad: 1,
        cantidad_maxima: cantidadVendida,
        precio
      }
    ])
  }

  const actualizarCantidadDevuelto = (
    productoId,
    nuevaCantidad
  ) => {
    const producto = productosDevueltos.find(
      p => Number(p.producto_id) === Number(productoId)
    )

    if (!producto) return

    let cantidad = Number(nuevaCantidad)

    if (!Number.isFinite(cantidad)) {
      cantidad = 1
    }

    cantidad = Math.floor(cantidad)

    if (cantidad < 1) cantidad = 1

    if (cantidad > producto.cantidad_maxima) {
      cantidad = producto.cantidad_maxima
    }

    setProductosDevueltos(prev =>
      prev.map(p =>
        Number(p.producto_id) === Number(productoId)
          ? {
              ...p,
              cantidad
            }
          : p
      )
    )
  }

  const eliminarProductoDevuelto = (productoId) => {
    setProductosDevueltos(prev =>
      prev.filter(
        p => Number(p.producto_id) !== Number(productoId)
      )
    )
  }

  const seleccionarProductoNuevo = (productoId) => {
    if (!productoId) {
      setProductoNuevoSeleccionado(null)
      return
    }

    const producto = productos.find(
      p => Number(p.id) === Number(productoId)
    )

    if (!producto) {
      setProductoNuevoSeleccionado(null)
      return
    }

    setProductoNuevoSeleccionado({
      id: Number(producto.id),
      nombre: producto.nombre || 'Producto',
      precio: Number(producto.precio || 0),
      cantidad: 1
    })
  }

  const actualizarCantidadNuevo = (cantidad) => {
    if (!productoNuevoSeleccionado) return

    let nuevaCantidad = Number(cantidad)

    if (!Number.isFinite(nuevaCantidad)) {
      nuevaCantidad = 1
    }

    nuevaCantidad = Math.floor(nuevaCantidad)

    if (nuevaCantidad < 1) {
      nuevaCantidad = 1
    }

    setProductoNuevoSeleccionado(prev => ({
      ...prev,
      cantidad: nuevaCantidad
    }))
  }

  const totalDevuelto = useMemo(() => {
    return productosDevueltos.reduce(
      (total, producto) =>
        total +
        Number(producto.precio || 0) *
        Number(producto.cantidad || 0),
      0
    )
  }, [productosDevueltos])

  const totalNuevo = useMemo(() => {
    if (!productoNuevoSeleccionado) return 0

    return (
      Number(productoNuevoSeleccionado.precio || 0) *
      Number(productoNuevoSeleccionado.cantidad || 0)
    )
  }, [productoNuevoSeleccionado])

  const envio = Number(costoEnvioManual || 0)

  const diferencia = useMemo(() => {
    if (form.tipo === 'devolucion') {
      return -totalDevuelto
    }

    return totalNuevo + envio - totalDevuelto
  }, [
    form.tipo,
    totalDevuelto,
    totalNuevo,
    envio
  ])

  const cambiosFiltrados = useMemo(() => {
    return cambios.filter(cambio => {
      const estadoCoincide =
        !filtroEstado ||
        String(cambio.estado || '') === filtroEstado

      const sucursalCoincide =
        !filtroSucursal ||
        String(
          cambio.sucursal_id ||
          cambio.venta_sucursal_id ||
          ''
        ) === filtroSucursal

      const texto = busquedaHistorial
        .trim()
        .toLowerCase()

      const textoCoincide =
        !texto ||
        String(cambio.factura_original || '')
          .toLowerCase()
          .includes(texto) ||
        String(cambio.cliente_nombre || '')
          .toLowerCase()
          .includes(texto) ||
        String(cambio.producto_devuelto_nombre || '')
          .toLowerCase()
          .includes(texto) ||
        String(cambio.producto_nuevo_nombre || '')
          .toLowerCase()
          .includes(texto)

      return (
        estadoCoincide &&
        sucursalCoincide &&
        textoCoincide
      )
    })
  }, [
    cambios,
    filtroEstado,
    filtroSucursal,
    busquedaHistorial
  ])

  const abrirFormulario = () => {
    if (!ventaEncontrada) {
      mostrarError('Primero debes buscar una factura')
      return
    }

    if (productosDevueltos.length === 0) {
      mostrarError(
        'Selecciona al menos un producto que el cliente va a devolver'
      )
      return
    }

    setMostrarFormulario(true)

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const cerrarFormulario = () => {
    setMostrarFormulario(false)
  }

  const limpiarOperacion = () => {
    setVentaEncontrada(null)
    setDetallesVenta([])
    setProductosDevueltos([])
    setProductoNuevoSeleccionado(null)
    setCostoEnvioManual(0)
    setFacturaBusqueda('')
    setMostrarFormulario(false)

    setForm({
      tipo: 'cambio',
      venta_id: '',
      factura_original: '',
      cliente_nombre: '',
      cliente_telefono: '',
      motivo: '',
      envio_opcional: false
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!ventaEncontrada) {
      mostrarError('No existe una venta seleccionada')
      return
    }

    if (productosDevueltos.length === 0) {
      mostrarError(
        'Debes seleccionar al menos un producto devuelto'
      )
      return
    }

    if (!form.motivo.trim()) {
      mostrarError('Debes indicar el motivo')
      return
    }

    if (
      form.tipo === 'cambio' &&
      !productoNuevoSeleccionado
    ) {
      mostrarError(
        'Selecciona el producto nuevo para realizar el cambio'
      )
      return
    }

    if (
      form.tipo === 'devolucion' &&
      productoNuevoSeleccionado
    ) {
      setProductoNuevoSeleccionado(null)
    }

    const confirmar = window.confirm(
      form.tipo === 'devolucion'
        ? `¿Confirmar devolución por RD$ ${totalDevuelto.toFixed(
            2
          )}?\n\nEl inventario será actualizado en la sucursal de la venta.`
        : `¿Confirmar cambio?\n\nProducto devuelto: RD$ ${totalDevuelto.toFixed(
            2
          )}\nProducto nuevo: RD$ ${totalNuevo.toFixed(
            2
          )}\nDiferencia: RD$ ${Math.abs(
            diferencia
          ).toFixed(2)}`
    )

    if (!confirmar) return

    setCargando(true)
    limpiarMensajes()

    try {
      const payload = {
        venta_id: Number(form.venta_id),
        factura_original: form.factura_original,
        cliente_nombre: form.cliente_nombre,
        cliente_telefono: form.cliente_telefono,
        productos_devueltos: productosDevueltos.map(p => ({
          producto_id: Number(p.producto_id),
          producto_nombre: p.producto_nombre,
          cantidad: Number(p.cantidad),
          precio: Number(p.precio)
        })),
        producto_nuevo_id:
          form.tipo === 'cambio'
            ? Number(
                productoNuevoSeleccionado?.id || 0
              )
            : null,
        producto_nuevo_nombre:
          form.tipo === 'cambio'
            ? productoNuevoSeleccionado?.nombre || ''
            : '',
        cantidad_nueva:
          form.tipo === 'cambio'
            ? Number(
                productoNuevoSeleccionado?.cantidad || 0
              )
            : 0,
        precio_nuevo:
          form.tipo === 'cambio'
            ? Number(
                productoNuevoSeleccionado?.precio || 0
              )
            : 0,
        total_devuelto: Number(
          totalDevuelto.toFixed(2)
        ),
        total_nuevo: Number(
          totalNuevo.toFixed(2)
        ),
        envio: Number(envio.toFixed(2)),
        diferencia: Number(
          diferencia.toFixed(2)
        ),
        tipo: form.tipo,
        motivo: form.motivo.trim(),
        usuario_id: usuario.id
          ? Number(usuario.id)
          : null,
        envio_opcional: Boolean(
          form.envio_opcional
        )
      }

      const response = await fetch(
        `${API_URL}/cambios`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            'No se pudo registrar la operación'
        )
      }

      mostrarMensaje(
        form.tipo === 'devolucion'
          ? 'Devolución registrada correctamente'
          : 'Cambio registrado correctamente'
      )

      limpiarOperacion()
      await cargarCambios()
      await cargarProductos()
    } catch (error) {
      console.error(
        'Error registrando cambio/devolución:',
        error
      )

      mostrarError(
        error.message ||
          'Error registrando la operación'
      )
    } finally {
      setCargando(false)
    }
  }

  const getTipoLabel = tipo => {
    const tipos = {
      cambio: '🔄 Cambio',
      devolucion: '↩️ Devolución',
      ajuste: '⚙️ Ajuste'
    }

    return tipos[tipo] || tipo || 'N/A'
  }

  const getEstadoColor = estado => {
    const colores = {
      pendiente: '#f59e0b',
      completado: '#16a34a',
      cancelado: '#dc2626'
    }

    return colores[estado] || '#64748b'
  }

  const getEstadoLabel = estado => {
    const estados = {
      pendiente: 'Pendiente',
      completado: 'Completado',
      cancelado: 'Cancelado'
    }

    return estados[estado] || estado || 'N/A'
  }

  const getSucursalNombre = cambio => {
    const id =
      cambio.sucursal_id ||
      cambio.venta_sucursal_id

    const sucursal = sucursales.find(
      s => Number(s.id) === Number(id)
    )

    return (
      cambio.sucursal_nombre ||
      sucursal?.nombre ||
      (id ? `Sucursal ${id}` : 'No definida')
    )
  }

  const handleReimprimir = async ventaId => {
    if (!ventaId) {
      mostrarError(
        'No existe una factura asociada'
      )
      return
    }

    try {
      setCargando(true)

      const response = await fetch(
        `${API_URL}/ventas/${ventaId}/reimprimir`
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            'No se pudieron obtener los datos de la factura'
        )
      }

      const venta = data.venta
      const detalles = data.detalles || []

      const sucursal =
        data.sucursal || {
          nombre:
            venta.sucursal_nombre ||
            'Sucursal',
          direccion: '',
          telefono: ''
        }

      const escapeHTML = value =>
        String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')

      let ticketHTML = `
        <div class="ticket">
          <div class="header">
            <h2>AMAGO ERP</h2>
            <p>${escapeHTML(
              sucursal.nombre
            )}</p>
            ${
              sucursal.direccion
                ? `<p>${escapeHTML(
                    sucursal.direccion
                  )}</p>`
                : ''
            }
            ${
              sucursal.telefono
                ? `<p>${escapeHTML(
                    sucursal.telefono
                  )}</p>`
                : ''
            }
            <strong>FACTURA</strong>
            <p>#${escapeHTML(
              venta.codigo_entrega ||
                venta.id
            )}</p>
          </div>

          <div class="info">
            <p>
              <strong>Cliente:</strong>
              ${escapeHTML(
                venta.cliente_nombre ||
                  'N/A'
              )}
            </p>

            <p>
              <strong>Fecha:</strong>
              ${new Date(
                venta.fecha
              ).toLocaleString()}
            </p>

            <p>
              <strong>Sucursal:</strong>
              ${escapeHTML(
                venta.sucursal_nombre ||
                  sucursal.nombre
              )}
            </p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
      `

      detalles.forEach(d => {
        const cantidad = Number(
          d.cantidad || 0
        )

        const precio = Number(
          d.precio || 0
        )

        ticketHTML += `
          <tr>
            <td>${escapeHTML(
              d.producto_nombre ||
                'Producto'
            )}</td>

            <td>${cantidad}</td>

            <td>
              RD$ ${(precio * cantidad).toFixed(
                2
              )}
            </td>
          </tr>
        `
      })

      ticketHTML += `
            </tbody>

            <tfoot>
              <tr>
                <td colspan="2">
                  <strong>TOTAL</strong>
                </td>
                <td>
                  <strong>
                    RD$ ${Number(
                      venta.total || 0
                    ).toFixed(2)}
                  </strong>
                </td>
              </tr>
            </tfoot>
          </table>

          <div class="footer">
            <p>Gracias por su compra</p>
          </div>
        </div>
      `

      const ventana = window.open(
        '',
        '_blank',
        'width=420,height=700'
      )

      if (!ventana) {
        throw new Error(
          'El navegador bloqueó la ventana de impresión'
        )
      }

      ventana.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Factura #${escapeHTML(
            venta.codigo_entrega ||
              venta.id
          )}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 20px;
              background: #f1f5f9;
              font-family: Arial, sans-serif;
            }

            .ticket {
              width: 360px;
              max-width: 100%;
              margin: auto;
              background: white;
              padding: 20px;
              color: #111827;
            }

            .header {
              text-align: center;
              border-bottom: 2px dashed #111827;
              padding-bottom: 12px;
            }

            .header h2 {
              margin: 0 0 5px;
            }

            .header p {
              margin: 3px 0;
              font-size: 12px;
            }

            .info {
              border-bottom: 1px dashed #64748b;
              padding: 12px 0;
              font-size: 12px;
            }

            .info p {
              margin: 4px 0;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
              font-size: 11px;
            }

            th,
            td {
              padding: 6px 3px;
              text-align: left;
            }

            th:last-child,
            td:last-child {
              text-align: right;
            }

            tfoot {
              border-top: 2px solid #111827;
            }

            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 11px;
              color: #64748b;
            }

            .acciones {
              text-align: center;
              margin-top: 20px;
            }

            button {
              border: 0;
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              margin: 5px;
            }

            .imprimir {
              background: #003b6f;
              color: white;
            }

            .cerrar {
              background: #dc2626;
              color: white;
            }

            @media print {
              body {
                background: white;
                padding: 0;
              }

              .acciones {
                display: none;
              }

              .ticket {
                width: 100%;
              }
            }
          </style>
        </head>

        <body>

          ${ticketHTML}

          <button
  type="submit"
  disabled={cargando}
  style={{
    flex: 1,
    padding: '14px',
    border: 0,
    borderRadius: '9px',
    background: '#16a34a',
    color: '#fff',
    fontWeight: 700,
    cursor: cargando ? 'not-allowed' : 'pointer',
    opacity: cargando ? 0.6 : 1
  }}
>
  {cargando
    ? '⏳ Procesando...'
    : form.tipo === 'devolucion'
    ? '↩️ Confirmar devolución'
    : '🔄 Confirmar cambio de mercancía'}
</button>

          <div class="acciones">
            <button
              class="imprimir"
              onclick="window.print()"
            >
              🖨️ Imprimir
            </button>

            <button
              class="cerrar"
              onclick="window.close()"
            >
              Cerrar
            </button>
          </div>

        </body>
        </html>
      `)

      ventana.document.close()
      ventana.focus()

      mostrarMensaje(
        'Factura preparada para impresión'
      )
    } catch (error) {
      console.error(
        'Error reimprimiendo:',
        error
      )

      mostrarError(
        error.message ||
          'Error al reimprimir'
      )
    } finally {
      setCargando(false)
    }
  }

  if (!tieneAcceso) {
    return (
      <AdminLayout>
        <div
          style={{
            padding: 60,
            textAlign: 'center'
          }}
        >
          <h2>⛔ Acceso Denegado</h2>
          <p>
            No tienes permisos para utilizar
            este módulo.
          </p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div
        style={{
          maxWidth: '1500px',
          margin: '0 auto',
          paddingBottom: '40px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '15px',
            flexWrap: 'wrap',
            marginBottom: '25px'
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                color: '#003b6f'
              }}
            >
              🔄 Cambios y Devoluciones
            </h1>

            <p
              style={{
                margin: '6px 0 0',
                color: '#64748b'
              }}
            >
              Gestión de cambios, devoluciones
              e inventario por sucursal
            </p>
          </div>

          <div
            style={{
              background: '#e0f2fe',
              color: '#075985',
              padding: '10px 15px',
              borderRadius: '10px',
              fontWeight: 600
            }}
          >
            🏢 3 sucursales
          </div>
        </div>

        {mensaje && (
          <div
            style={{
              background: '#dcfce7',
              color: '#166534',
              border: '1px solid #86efac',
              padding: '14px 18px',
              borderRadius: '10px',
              marginBottom: '20px'
            }}
          >
            ✅ {mensaje}
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              padding: '14px 18px',
              borderRadius: '10px',
              marginBottom: '20px'
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <section
          style={{
            background: '#fff',
            borderRadius: '14px',
            padding: '24px',
            boxShadow:
              '0 4px 15px rgba(15,23,42,.08)',
            marginBottom: '25px'
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: '#003b6f'
            }}
          >
            🔎 Buscar venta
          </h3>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            <input
              value={facturaBusqueda}
              onChange={e =>
                setFacturaBusqueda(
                  e.target.value
                )
              }
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  buscarFactura()
                }
              }}
              placeholder="Número de factura o ID"
              style={{
                flex: 1,
                minWidth: '250px',
                padding: '13px 15px',
                border:
                  '1px solid #cbd5e1',
                borderRadius: '9px',
                fontSize: '15px'
              }}
            />

            <button
              onClick={buscarFactura}
              disabled={cargandoFactura}
              style={{
                padding: '13px 25px',
                border: 0,
                borderRadius: '9px',
                background: '#003b6f',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {cargandoFactura
                ? 'Buscando...'
                : '🔎 Buscar factura'}
            </button>
          </div>
        </section>

        {ventaEncontrada && (
          <section
            style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '24px',
              boxShadow:
                '0 4px 15px rgba(15,23,42,.08)',
              marginBottom: '25px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                gap: '15px',
                flexWrap: 'wrap',
                marginBottom: '20px'
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    color: '#003b6f'
                  }}
                >
                  🧾 Información de la venta
                </h3>
              </div>

              <div
                style={{
                  background: '#dcfce7',
                  color: '#166534',
                  padding: '9px 14px',
                  borderRadius: '9px',
                  fontWeight: 700
                }}
              >
                🏢{' '}
                {ventaEncontrada.sucursal_nombre ||
                  `Sucursal ${
                    ventaEncontrada.sucursal_id ||
                    ''
                  }`}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(200px,1fr))',
                gap: '15px',
                marginBottom: '20px'
              }}
            >
              <div>
                <small>Factura</small>
                <strong
                  style={{
                    display: 'block',
                    marginTop: 4
                  }}
                >
                  #
                  {ventaEncontrada.codigo_entrega ||
                    ventaEncontrada.id}
                </strong>
              </div>

              <div>
                <small>Cliente</small>
                <strong
                  style={{
                    display: 'block',
                    marginTop: 4
                  }}
                >
                  {ventaEncontrada.cliente_nombre ||
                    'Consumidor final'}
                </strong>
              </div>

              <div>
                <small>Teléfono</small>
                <strong
                  style={{
                    display: 'block',
                    marginTop: 4
                  }}
                >
                  {ventaEncontrada.cliente_telefono ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <small>Total venta</small>
                <strong
                  style={{
                    display: 'block',
                    marginTop: 4,
                    color: '#003b6f'
                  }}
                >
                  RD${' '}
                  {Number(
                    ventaEncontrada.total || 0
                  ).toFixed(2)}
                </strong>
              </div>
            </div>

            <h4
              style={{
                color: '#003b6f',
                marginBottom: '10px'
              }}
            >
              📦 Productos vendidos
            </h4>

            <div
              style={{
                overflowX: 'auto',
                border:
                  '1px solid #e2e8f0',
                borderRadius: '10px'
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse:
                    'collapse'
                }}
              >
                <thead>
                  <tr
                    style={{
                      background:
                        '#f8fafc'
                    }}
                  >
                    <th style={th}>
                      Producto
                    </th>
                    <th style={th}>
                      Vendido
                    </th>
                    <th style={th}>
                      Precio
                    </th>
                    <th style={th}>
                      Total
                    </th>
                    <th style={th}>
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {detallesVenta.map(
                    (detalle, index) => {
                      const productoId =
                        Number(
                          detalle.producto_id ||
                            detalle.id
                        )

                      const seleccionado =
                        productosDevueltos.some(
                          p =>
                            Number(
                              p.producto_id
                            ) ===
                            productoId
                        )

                      const cantidad =
                        Number(
                          detalle.cantidad ||
                            0
                        )

                      const precio =
                        Number(
                          detalle.producto_precio ||
                            detalle.precio ||
                            0
                        )

                      return (
                        <tr
                          key={`${productoId}-${index}`}
                          style={{
                            borderTop:
                              '1px solid #e2e8f0'
                          }}
                        >
                          <td style={td}>
                            <strong>
                              {detalle.producto_nombre ||
                                detalle.nombre ||
                                'Producto'}
                            </strong>
                          </td>

                          <td style={td}>
                            {cantidad}
                          </td>

                          <td style={td}>
                            RD${' '}
                            {precio.toFixed(
                              2
                            )}
                          </td>

                          <td style={td}>
                            RD${' '}
                            {(
                              precio *
                              cantidad
                            ).toFixed(2)}
                          </td>

                          <td style={td}>
                            <button
                              type="button"
                              onClick={() =>
                                seleccionarProductoDevuelto(
                                  detalle
                                )
                              }
                              style={{
                                padding:
                                  '8px 12px',
                                border: 0,
                                borderRadius:
                                  '7px',
                                background:
                                  seleccionado
                                    ? '#dc2626'
                                    : '#003b6f',
                                color: '#fff',
                                cursor:
                                  'pointer'
                              }}
                            >
                              {seleccionado
                                ? '✕ Quitar'
                                : '↩️ Devolver'}
                            </button>
                          </td>
                        </tr>
                      )
                    }
                  )}
                </tbody>
              </table>
            </div>

            

            {productosDevueltos.length >
              0 && (
              <div
                style={{
                  marginTop: '20px',
                  background: '#eff6ff',
                  border:
                    '1px solid #bfdbfe',
                  borderRadius: '12px',
                  padding: '18px'
                }}
              >
                <h4
                  style={{
                    marginTop: 0,
                    color: '#1e40af'
                  }}
                >
                  ↩️ Productos seleccionados
                </h4>

                {productosDevueltos.map(
                  producto => (
                    <div
                      key={producto.producto_id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          '2fr 1fr 1fr 1fr auto',
                        gap: '12px',
                        alignItems:
                          'center',
                        padding:
                          '12px 0',
                        borderBottom:
                          '1px solid #dbeafe'
                      }}
                    >
                      <strong>
                        {
                          producto.producto_nombre
                        }
                      </strong>

                      <span>
                        Máx:{' '}
                        {
                          producto.cantidad_maxima
                        }
                      </span>

                      <input
                        type="number"
                        min="1"
                        max={
                          producto.cantidad_maxima
                        }
                        value={
                          producto.cantidad
                        }
                        onChange={e =>
                          actualizarCantidadDevuelto(
                            producto.producto_id,
                            e.target.value
                          )
                        }
                        style={{
                          width: '80px',
                          padding: '8px',
                          border:
                            '1px solid #cbd5e1',
                          borderRadius:
                            '7px'
                        }}
                      />

                      <strong>
                        RD${' '}
                        {(
                          producto.precio *
                          producto.cantidad
                        ).toFixed(2)}
                      </strong>

                      <button
                        type="button"
                        onClick={() =>
                          eliminarProductoDevuelto(
                            producto.producto_id
                          )
                        }
                        style={{
                          border: 0,
                          background:
                            '#dc2626',
                          color: '#fff',
                          padding:
                            '7px 10px',
                          borderRadius:
                            '6px',
                          cursor:
                            'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )
                )}

                <div
                  style={{
                    textAlign: 'right',
                    marginTop: '15px',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#1e3a8a'
                  }}
                >
                  Total seleccionado:
                  {' '}RD${' '}
                  {totalDevuelto.toFixed(2)}
                </div>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginTop: '20px',
                flexWrap: 'wrap'
              }}
            >
              <button
                type="button"
                onClick={abrirFormulario}
                disabled={
                  productosDevueltos.length ===
                  0
                }
                style={{
                  padding:
                    '12px 20px',
                  border: 0,
                  borderRadius: '8px',
                  background:
                    productosDevueltos.length
                      ? '#16a34a'
                      : '#94a3b8',
                  color: '#fff',
                  fontWeight: 700,
                  cursor:
                    productosDevueltos.length
                      ? 'pointer'
                      : 'not-allowed'
                }}
              >
                📝 Continuar operación
              </button>

              <button
                type="button"
                onClick={
                  limpiarOperacion
                }
                style={{
                  padding:
                    '12px 20px',
                  border: 0,
                  borderRadius: '8px',
                  background:
                    '#64748b',
                  color: '#fff',
                  fontWeight: 700,
                  cursor:
                    'pointer'
                }}
              >
                Limpiar
              </button>
            </div>
          </section>
        )}

        {mostrarFormulario &&
          ventaEncontrada && (
            <section
              style={{
                background: '#fff',
                borderRadius: '14px',
                padding: '24px',
                boxShadow:
                  '0 4px 15px rgba(15,23,42,.08)',
                marginBottom: '25px',
                border:
                  '2px solid #003b6f'
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  color: '#003b6f'
                }}
              >
                📝 Registrar operación
              </h3>

              <form
                onSubmit={handleSubmit}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit,minmax(250px,1fr))',
                    gap: '18px'
                  }}
                >
                  <div>
                    <label>
                      <strong>
                        Tipo de operación
                      </strong>
                    </label>

                    <select
                      value={form.tipo}
                      onChange={e =>
                        setForm({
                          ...form,
                          tipo:
                            e.target.value
                        })
                      }
                      style={inputStyle}
                    >
                      <option value="cambio">
                        🔄 Cambio por otro
                        producto
                      </option>

                      <option value="devolucion">
                        ↩️ Devolución de
                        dinero
                      </option>
                    </select>
                  </div>

                  <div>
                    <label>
                      <strong>
                        Motivo *
                      </strong>
                    </label>

                    <input
                      value={
                        form.motivo
                      }
                      onChange={e =>
                        setForm({
                          ...form,
                          motivo:
                            e.target.value
                        })
                      }
                      placeholder="Ej. Producto defectuoso"
                      required
                      style={inputStyle}
                    />
                  </div>
                </div>

                {form.tipo ===
                  'cambio' && (
                  <>
                    <hr
                      style={{
                        margin:
                          '25px 0',
                        border:
                          '0',
                        borderTop:
                          '1px solid #e2e8f0'
                      }}
                    />

                    <h4
                      style={{
                        color: '#16a34a'
                      }}
                    >
                      🆕 Producto nuevo
                    </h4>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          '2fr 1fr 1fr',
                        gap: '15px'
                      }}
                    >
                      <div>
                        <label>
                          <strong>
                            Producto
                          </strong>
                        </label>

                        <select
                          value={
                            productoNuevoSeleccionado?.id ||
                            ''
                          }
                          onChange={e =>
                            seleccionarProductoNuevo(
                              e.target.value
                            )
                          }
                          style={
                            inputStyle
                          }
                        >
                          <option value="">
                            Seleccionar
                            producto
                          </option>

                          {productos.map(
                            producto => (
                              <option
                                key={
                                  producto.id
                                }
                                value={
                                  producto.id
                                }
                              >
                                {
                                  producto.nombre
                                }{' '}
                                — RD${' '}
                                {Number(
                                  producto.precio ||
                                    0
                                ).toFixed(
                                  2
                                )}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div>
                        <label>
                          <strong>
                            Cantidad
                          </strong>
                        </label>

                        <input
                          type="number"
                          min="1"
                          value={
                            productoNuevoSeleccionado?.cantidad ||
                            1
                          }
                          disabled={
                            !productoNuevoSeleccionado
                          }
                          onChange={e =>
                            actualizarCantidadNuevo(
                              e.target
                                .value
                            )
                          }
                          style={
                            inputStyle
                          }
                        />
                      </div>

                      <div>
                        <label>
                          <strong>
                            Precio
                          </strong>
                        </label>

                        <input
                          value={
                            productoNuevoSeleccionado
                              ? `RD$ ${productoNuevoSeleccionado.precio.toFixed(
                                  2
                                )}`
                              : ''
                          }
                          readOnly
                          style={{
                            ...inputStyle,
                            background:
                              '#f8fafc'
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {form.tipo ===
                  'cambio' && (
                  <>
                    <hr
                      style={{
                        margin:
                          '25px 0',
                        border:
                          '0',
                        borderTop:
                          '1px solid #e2e8f0'
                      }}
                    />

                    <h4
                      style={{
                        color: '#003b6f'
                      }}
                    >
                      🚚 Envío
                    </h4>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          '1fr 2fr',
                        gap: '15px'
                      }}
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          costoEnvioManual
                        }
                        onChange={e =>
                          setCostoEnvioManual(
                            Number(
                              e.target
                                .value
                            ) || 0
                          )
                        }
                        style={
                          inputStyle
                        }
                      />

                      <label
                        style={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          gap: '10px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={
                            form.envio_opcional
                          }
                          onChange={e =>
                            setForm({
                              ...form,
                              envio_opcional:
                                e.target
                                  .checked
                            })
                          }
                        />

                        El cliente pagó
                        el envío
                      </label>
                    </div>
                  </>
                )}

                <hr
                  style={{
                    margin:
                      '25px 0',
                    border: 0,
                    borderTop:
                      '1px solid #e2e8f0'
                  }}
                />

                <div
                  style={{
                    background:
                      '#f8fafc',
                    borderRadius:
                      '12px',
                    padding:
                      '20px'
                  }}
                >
                  <h4
                    style={{
                      marginTop: 0,
                      color:
                        '#003b6f'
                    }}
                  >
                    💰 Resumen
                  </h4>

                  <div
                    style={{
                      display:
                        'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit,minmax(180px,1fr))',
                      gap: '15px'
                    }}
                  >
                    <SummaryCard
                      title="Devuelto"
                      value={
                        totalDevuelto
                      }
                      color="#dc2626"
                    />

                    {form.tipo ===
                      'cambio' && (
                      <SummaryCard
                        title="Nuevo"
                        value={
                          totalNuevo
                        }
                        color="#16a34a"
                      />
                    )}

                    {form.tipo ===
                      'cambio' && (
                      <SummaryCard
                        title="Envío"
                        value={
                          envio
                        }
                        color="#003b6f"
                      />
                    )}

                    <SummaryCard
                      title={
                        form.tipo ===
                        'devolucion'
                          ? 'A devolver'
                          : diferencia >
                            0
                          ? 'Cliente paga'
                          : diferencia <
                            0
                          ? 'A favor del cliente'
                          : 'Diferencia'
                      }
                      value={
                        form.tipo ===
                        'devolucion'
                          ? totalDevuelto
                          : Math.abs(
                              diferencia
                            )
                      }
                      color={
                        form.tipo ===
                        'devolucion'
                          ? '#dc2626'
                          : diferencia >
                            0
                          ? '#dc2626'
                          : '#16a34a'
                      }
                    />
                  </div>
                </div>

                <div
                  style={{
                    display:
                      'flex',
                    gap: '12px',
                    marginTop:
                      '25px'
                  }}
                >
                  <button
                    type="submit"
                    disabled={
                      cargando
                    }
                    style={{
                      flex: 1,
                      padding:
                        '14px',
                      border: 0,
                      borderRadius:
                        '9px',
                      background:
                        '#16a34a',
                      color: '#fff',
                      fontWeight: 700,
                      cursor:
                        'pointer'
                    }}
                  >
                    {cargando
                      ? 'Procesando...'
                      : form.tipo ===
                        'devolucion'
                      ? '↩️ Confirmar devolución'
                      : '🔄 Confirmar cambio'}
                  </button>

                  <button
                    type="button"
                    onClick={
                      cerrarFormulario
                    }
                    style={{
                      flex: 1,
                      padding:
                        '14px',
                      border: 0,
                      borderRadius:
                        '9px',
                      background:
                        '#dc2626',
                      color: '#fff',
                      fontWeight: 700,
                      cursor:
                        'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </section>
          )}

        <section
          style={{
            background: '#fff',
            borderRadius: '14px',
            padding: '24px',
            boxShadow:
              '0 4px 15px rgba(15,23,42,.08)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              gap: '15px',
              flexWrap: 'wrap',
              marginBottom: '20px'
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  color: '#003b6f'
                }}
              >
                📋 Historial
              </h3>

              <small
                style={{
                  color: '#64748b'
                }}
              >
                Cambios y devoluciones
                registrados
              </small>
            </div>

            <button
              type="button"
              onClick={cargarCambios}
              style={{
                padding:
                  '9px 15px',
                border: 0,
                borderRadius:
                  '8px',
                background:
                  '#003b6f',
                color: '#fff',
                cursor:
                  'pointer'
              }}
            >
              🔄 Actualizar
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                '2fr 1fr 1fr',
              gap: '12px',
              marginBottom: '20px'
            }}
          >
            <input
              value={
                busquedaHistorial
              }
              onChange={e =>
                setBusquedaHistorial(
                  e.target.value
                )
              }
              placeholder="Buscar factura, cliente o producto..."
              style={inputStyle}
            />

            <select
              value={
                filtroSucursal
              }
              onChange={e =>
                setFiltroSucursal(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                Todas las sucursales
              </option>

              {sucursales.map(
                sucursal => (
                  <option
                    key={
                      sucursal.id
                    }
                    value={
                      sucursal.id
                    }
                  >
                    {sucursal.nombre}
                  </option>
                )
              )}
            </select>

            <select
              value={filtroEstado}
              onChange={e =>
                setFiltroEstado(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                Todos los estados
              </option>
              <option value="completado">
                Completado
              </option>
              <option value="pendiente">
                Pendiente
              </option>
              <option value="cancelado">
                Cancelado
              </option>
            </select>
          </div>

          {cambiosFiltrados.length ===
          0 ? (
            <div
              style={{
                textAlign:
                  'center',
                padding: '50px',
                color: '#64748b'
              }}
            >
              <div
                style={{
                  fontSize:
                    '40px'
                }}
              >
                📭
              </div>

              <p>
                No hay operaciones
                registradas.
              </p>
            </div>
          ) : (
            <div
              style={{
                overflowX:
                  'auto'
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse:
                    'collapse'
                }}
              >
                <thead>
                  <tr
                    style={{
                      background:
                        '#f8fafc'
                    }}
                  >
                    <th style={th}>
                      ID
                    </th>
                    <th style={th}>
                      Sucursal
                    </th>
                    <th style={th}>
                      Factura
                    </th>
                    <th style={th}>
                      Cliente
                    </th>
                    <th style={th}>
                      Tipo
                    </th>
                    <th style={th}>
                      Devuelto
                    </th>
                    <th style={th}>
                      Nuevo
                    </th>
                    <th style={th}>
                      Diferencia
                    </th>
                    <th style={th}>
                      Estado
                    </th>
                    <th style={th}>
                      Fecha
                    </th>
                    <th style={th}>
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {cambiosFiltrados.map(
                    cambio => (
                      <tr
                        key={
                          cambio.id
                        }
                        style={{
                          borderTop:
                            '1px solid #e2e8f0'
                        }}
                      >
                        <td style={td}>
                          #
                          {
                            cambio.id
                          }
                        </td>

                        <td style={td}>
                          <span
                            style={{
                              background:
                                '#e0f2fe',
                              color:
                                '#075985',
                              padding:
                                '5px 9px',
                              borderRadius:
                                '6px',
                              fontSize:
                                '12px',
                              fontWeight:
                                700
                            }}
                          >
                            🏢{' '}
                            {getSucursalNombre(
                              cambio
                            )}
                          </span>
                        </td>

                        <td style={td}>
                          {
                            cambio.factura_original
                          }
                        </td>

                        <td style={td}>
                          {
                            cambio.cliente_nombre
                          }
                        </td>

                        <td style={td}>
                          {getTipoLabel(
                            cambio.tipo
                          )}
                        </td>

                        <td style={td}>
                          RD${' '}
                          {Number(
                            cambio.total_devuelto ||
                              0
                          ).toFixed(
                            2
                          )}
                        </td>

                        <td style={td}>
                          {cambio.producto_nuevo_nombre ||
                            '-'}
                        </td>

                        <td
                          style={{
                            ...td,
                            fontWeight:
                              700,
                            color:
                              Number(
                                cambio.diferencia ||
                                  0
                              ) >
                              0
                                ? '#dc2626'
                                : '#16a34a'
                          }}
                        >
                          RD${' '}
                          {Math.abs(
                            Number(
                              cambio.diferencia ||
                                0
                            )
                          ).toFixed(
                            2
                          )}
                        </td>

                        <td style={td}>
                          <span
                            style={{
                              background:
                                getEstadoColor(
                                  cambio.estado
                                ),
                              color:
                                '#fff',
                              padding:
                                '5px 10px',
                              borderRadius:
                                '20px',
                              fontSize:
                                '11px',
                              fontWeight:
                                700
                            }}
                          >
                            {getEstadoLabel(
                              cambio.estado
                            )}
                          </span>
                        </td>

                        <td style={td}>
                          {cambio.fecha
                            ? new Date(
                                cambio.fecha
                              ).toLocaleDateString()
                            : '-'}
                        </td>

                        <td style={td}>
                          <button
                            type="button"
                            onClick={() =>
                              handleReimprimir(
                                cambio.venta_id
                              )
                            }
                            style={{
                              padding:
                                '7px 10px',
                              border: 0,
                              borderRadius:
                                '6px',
                              background:
                                '#7c3aed',
                              color:
                                '#fff',
                              cursor:
                                'pointer'
                            }}
                          >
                            🖨️
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  )
}

function SummaryCard({
  title,
  value,
  color
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '10px',
        padding: '15px',
        borderLeft: `5px solid ${color}`
      }}
    >
      <small
        style={{
          color: '#64748b'
        }}
      >
        {title}
      </small>

      <strong
        style={{
          display: 'block',
          marginTop: '5px',
          color,
          fontSize: '20px'
        }}
      >
        RD$ {Number(value || 0).toFixed(2)}
      </strong>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '11px 13px',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  fontSize: '14px',
  marginTop: '6px',
  boxSizing: 'border-box'
}

const th = {
  padding: '12px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  color: '#334155',
  fontSize: '13px'
}

const td = {
  padding: '11px',
  whiteSpace: 'nowrap',
  fontSize: '13px'
}

export default Cambios