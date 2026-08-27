import { useState, useEffect, useMemo, useRef } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import Factura from '../components/Factura'

// ============================================
// CONFIGURACIÓN DE LA API
// ============================================
const API_URL = 'https://amagoerp-backend.onrender.com/api';

console.log('🔗 API_URL:', API_URL);

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
    estado: 'ninguna',
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
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  // ============================================
  // REFERENCIAS
  // ============================================
  const facturaRef = useRef()

  // ============================================
  // USUARIO ACTUAL
  // ============================================
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esSucursalPrincipal = usuario?.sucursal_id === 3
  const esSucursal = usuario?.sucursal_id && usuario.sucursal_id > 0
  const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario?.rol || '')
  const esVendedor = ['vendedor', 'vendedora'].includes(usuario?.rol || '')

// ============================================
// EFECTOS
// ============================================
useEffect(() => {
    cargarProductos();
    cargarVentasRecientes();
    verificarSolicitudPendiente();
}, []);

// 👇 VERIFICAR SOLICITUD PERIÓDICAMENTE (CADA 5 SEGUNDOS)
useEffect(() => {
    let interval = null;
    
    if (solicitudActiva && solicitudDescuento.estado === 'pendiente') {
        // Verificar cada 5 segundos
        interval = setInterval(() => {
            console.log('⏳ Verificando estado de solicitud...');
            verificarEstadoSolicitud(solicitudDescuento.id, null);
        }, 5000);
    }

    return () => {
        if (interval) clearInterval(interval);
    };
}, [solicitudActiva, solicitudDescuento.id, solicitudDescuento.estado]);

// Extraer categorías automáticamente de los productos
useEffect(() => {
    if (productos && productos.length > 0) {
        // ... código existente ...
    }
}, [productos]);

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
  // FUNCIONES DE CARGA - CORREGIDAS SIN PARÁMETROS
  // ============================================
  const cargarProductos = async () => {
    try {
      console.log('📡 Cargando productos...')
      // ✅ SIN parámetro sucursal_id
      const url = `${API_URL}/productos`
      console.log('📡 URL:', url)
      
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Error ${response.status}`)
      
      const data = await response.json()
      console.log('📊 Productos cargados:', data?.length || 0)
      setProductos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('❌ Error cargando productos:', error)
      setProductos([])
    }
  }

  const cargarVentasRecientes = async () => {
    try {
      setCargandoHistorial(true)
      // ✅ SIN parámetro sucursal_id
      const url = `${API_URL}/ventas/recientes?limit=20`
      console.log('📡 URL ventas:', url)
      
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Error ${response.status}`)
      
      const data = await response.json()
      console.log('📊 Ventas cargadas:', data?.length || 0)
      setVentasRecientes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando ventas recientes:', error)
      setVentasRecientes([])
    } finally {
      setCargandoHistorial(false)
    }
  }

// ============================================
// FUNCIONES DE SOLICITUD DE DESCUENTO
// ============================================

const verificarSolicitudPendiente = async () => {
    const ventaPendiente = localStorage.getItem('venta_pendiente_aprobacion');
    if (ventaPendiente) {
        try {
            const data = JSON.parse(ventaPendiente);
            await verificarEstadoSolicitud(data.solicitudId, data.ventaId);
        } catch (error) {
            console.error('Error al verificar solicitud pendiente:', error);
            localStorage.removeItem('venta_pendiente_aprobacion');
        }
    }
};

const verificarEstadoSolicitud = async (solicitudId, ventaId) => {
    try {
        console.log(`📡 Verificando solicitud ${solicitudId}...`);
        const response = await fetch(`${API_URL}/solicitudes-descuento/${solicitudId}`);
        const data = await response.json();
        
        console.log('📊 Estado de solicitud:', data);
        
        if (data.success && data.solicitud) {
            const solicitud = data.solicitud;
            
            if (solicitud.estado === 'aprobado') {
                console.log('✅ Solicitud APROBADA!');
                setSolicitudDescuento({
                    monto: solicitud.monto_aprobado || solicitud.monto_solicitado,
                    motivo: solicitud.motivo,
                    estado: 'aprobado',
                    codigo: solicitud.codigo_autorizacion,
                    id: solicitud.id,
                    venta_id: solicitud.venta_id
                });
                setSolicitudActiva(true);
                setDescuentoMonto(solicitud.monto_aprobado || solicitud.monto_solicitado);
                setVentaId(ventaId);
                localStorage.removeItem('venta_pendiente_aprobacion');
                alert('✅ ¡Tu solicitud de descuento ha sido aprobada! Ahora puedes cobrar la venta.');
                
            } else if (solicitud.estado === 'rechazado') {
                console.log('❌ Solicitud RECHAZADA');
                setSolicitudDescuento({
                    ...solicitudDescuento,
                    estado: 'rechazado'
                });
                setSolicitudActiva(true);
                localStorage.removeItem('venta_pendiente_aprobacion');
                alert('❌ Su solicitud de descuento fue rechazada');
            }
        }
    } catch (error) {
        console.error('Error verificando solicitud:', error);
    }
};

const solicitarDescuento = async () => {
    if (!cliente.nombre || !cliente.nombre.trim()) {
        alert('⚠️ Primero ingresa el nombre del cliente');
        return;
    }
    if (descuentoMonto <= 0) {
        alert('⚠️ Ingresa un monto de descuento válido');
        return;
    }
    if (!carrito || carrito.length === 0) {
        alert('⚠️ El carrito está vacío');
        return;
    }
    
    try {
        setCargando(true);
        
        const solicitudResponse = await fetch(`${API_URL}/solicitudes-descuento`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                venta_id: null,
                usuario_solicitante: usuario?.id || 1,
                monto_solicitado: descuentoMonto,
                motivo: `Descuento de RD$ ${descuentoMonto.toFixed(2)} para cliente: ${cliente.nombre}`
            })
        });

        const solicitudData = await solicitudResponse.json();

        if (solicitudData.success) {
            setSolicitudDescuento({
                monto: descuentoMonto,
                motivo: `Descuento de RD$ ${descuentoMonto.toFixed(2)} para cliente: ${cliente.nombre}`,
                estado: 'pendiente',
                codigo: solicitudData.codigo || '',
                id: solicitudData.solicitud.id,
                venta_id: null
            });
            setSolicitudActiva(true);
            setMostrarSolicitud(false);
            
            localStorage.setItem('venta_pendiente_aprobacion', JSON.stringify({
                ventaId: null,
                solicitudId: solicitudData.solicitud.id
            }));
            
            alert(`✅ Solicitud de descuento enviada\n📋 ID: ${solicitudData.solicitud.id}\n⏳ Espera la aprobación del administrador`);
        } else {
            alert('❌ Error al solicitar descuento: ' + (solicitudData.error || 'Desconocido'));
        }
    } catch (error) {
        console.error('Error en solicitarDescuento:', error);
        alert('❌ Error al solicitar descuento: ' + error.message);
    } finally {
        setCargando(false);
    }
};

const cancelarSolicitud = async () => {
    if (!solicitudDescuento.id) {
        alert('⚠️ No hay solicitud activa para cancelar');
        return;
    }
    
    if (!window.confirm('¿Estás seguro de que quieres cancelar esta solicitud de descuento?')) {
        return;
    }
    
    try {
        setCargando(true);
        
        const response = await fetch(`${API_URL}/solicitudes-descuento/${solicitudDescuento.id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            setDescuentoMonto(0);
            setSolicitudDescuento({ 
                monto: 0, 
                motivo: '', 
                estado: 'ninguna', 
                codigo: '', 
                id: null, 
                venta_id: null 
            });
            setSolicitudActiva(false);
            setMostrarSolicitud(false);
            localStorage.removeItem('venta_pendiente_aprobacion');
            alert('✅ Solicitud de descuento cancelada exitosamente');
        } else {
            alert('❌ Error al cancelar: ' + (data.error || 'Desconocido'));
        }
    } catch (error) {
        console.error('Error al cancelar solicitud:', error);
        alert('❌ Error al cancelar la solicitud: ' + error.message);
    } finally {
        setCargando(false);
    }
};

const aplicarDescuentoDirecto = () => {
    if (descuentoMonto <= 0) {
        alert('⚠️ Ingresa un monto de descuento válido');
        return;
    }
    
    setSolicitudDescuento({
        monto: descuentoMonto,
        motivo: `Descuento directo de RD$ ${descuentoMonto.toFixed(2)}`,
        estado: 'aprobado',
        codigo: `DIRECTO-${Date.now().toString().slice(-6)}`,
        id: null,
        venta_id: null
    });
    setSolicitudActiva(true);
    setMostrarSolicitud(false);
    
    alert(`✅ Descuento de RD$ ${descuentoMonto.toFixed(2)} aplicado`);
};

// ============================================
// SOLICITAR DESCUENTO
// ============================================
const solicitarDescuento = async () => {
    if (!cliente.nombre || !cliente.nombre.trim()) {
        alert('⚠️ Primero ingresa el nombre del cliente');
        return;
    }
    if (descuentoMonto <= 0) {
        alert('⚠️ Ingresa un monto de descuento válido');
        return;
    }
    if (!carrito || carrito.length === 0) {
        alert('⚠️ El carrito está vacío');
        return;
    }
    
    try {
        setCargando(true);
        
        const solicitudResponse = await fetch(`${API_URL}/solicitudes-descuento`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                venta_id: null,
                usuario_solicitante: usuario?.id || 1,
                monto_solicitado: descuentoMonto,
                motivo: `Descuento de RD$ ${descuentoMonto.toFixed(2)} para cliente: ${cliente.nombre}`
            })
        });

        const solicitudData = await solicitudResponse.json();

        if (solicitudData.success) {
            setSolicitudDescuento({
                monto: descuentoMonto,
                motivo: `Descuento de RD$ ${descuentoMonto.toFixed(2)} para cliente: ${cliente.nombre}`,
                estado: 'pendiente',
                codigo: solicitudData.codigo || '',
                id: solicitudData.solicitud.id,
                venta_id: null
            });
            setSolicitudActiva(true);
            setMostrarSolicitud(false);
            
            localStorage.setItem('venta_pendiente_aprobacion', JSON.stringify({
                ventaId: null,
                solicitudId: solicitudData.solicitud.id
            }));
            
            alert(`✅ Solicitud de descuento enviada\n📋 ID: ${solicitudData.solicitud.id}\n⏳ Espera la aprobación del administrador`);
        } else {
            alert('❌ Error al solicitar descuento: ' + (solicitudData.error || 'Desconocido'));
        }
    } catch (error) {
        console.error('Error en solicitarDescuento:', error);
        alert('❌ Error al solicitar descuento: ' + error.message);
    } finally {
        setCargando(false);
    }
};

// ============================================
// CANCELAR SOLICITUD DE DESCUENTO
// ============================================
const cancelarSolicitud = async () => {
    if (!solicitudDescuento.id) {
        alert('⚠️ No hay solicitud activa para cancelar');
        return;
    }
    
    if (!window.confirm('¿Estás seguro de que quieres cancelar esta solicitud de descuento?')) {
        return;
    }
    
    try {
        setCargando(true);
        
        const response = await fetch(`${API_URL}/solicitudes-descuento/${solicitudDescuento.id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            setDescuentoMonto(0);
            setSolicitudDescuento({ 
                monto: 0, 
                motivo: '', 
                estado: 'ninguna', 
                codigo: '', 
                id: null, 
                venta_id: null 
            });
            setSolicitudActiva(false);
            setMostrarSolicitud(false);
            localStorage.removeItem('venta_pendiente_aprobacion');
            alert('✅ Solicitud de descuento cancelada exitosamente');
        } else {
            alert('❌ Error al cancelar: ' + (data.error || 'Desconocido'));
        }
    } catch (error) {
        console.error('Error al cancelar solicitud:', error);
        alert('❌ Error al cancelar la solicitud: ' + error.message);
    } finally {
        setCargando(false);
    }
};

// ============================================
// APLICAR DESCUENTO DIRECTO (SOLO ADMIN)
// ============================================
const aplicarDescuentoDirecto = () => {
    if (descuentoMonto <= 0) {
        alert('⚠️ Ingresa un monto de descuento válido');
        return;
    }
    
    setSolicitudDescuento({
        monto: descuentoMonto,
        motivo: `Descuento directo de RD$ ${descuentoMonto.toFixed(2)}`,
        estado: 'aprobado',
        codigo: `DIRECTO-${Date.now().toString().slice(-6)}`,
        id: null,
        venta_id: null
    });
    setSolicitudActiva(true);
    setMostrarSolicitud(false);
    
    alert(`✅ Descuento de RD$ ${descuentoMonto.toFixed(2)} aplicado`);
};

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
    if (!producto || producto.stock <= 0) {
      alert('⚠️ No hay stock disponible')
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
            ? { ...item, cantidad: nuevaCantidad, precio_unitario: precioUnitario }
            : item
        )
      }
      const precioUnitario = calcularPrecio(producto, 1)
      return [...prev, { ...producto, cantidad: 1, precio_unitario: precioUnitario }]
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
            return { ...item, cantidad: nuevaCantidad, precio_unitario: precioUnitario }
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
    if (!carrito || carrito.length === 0) return 0
    return carrito.reduce((acc, item) => {
      const precio = item.precio_unitario || item.precio || 0
      return acc + (Number(precio) * (item.cantidad || 1))
    }, 0)
  }, [carrito])

  const total = useMemo(() => {
    const envio = parseFloat(costoEnvio) || 0
    const instalacion = parseFloat(costoInstalacion) || 0
    const descMonto = solicitudDescuento.estado === 'aprobado' ? (solicitudDescuento.monto || 0) : 0
    return (subtotal + envio + instalacion) - descMonto
  }, [subtotal, costoEnvio, costoInstalacion, solicitudDescuento])

  // ============================================
  // FILTRO DE PRODUCTOS
  // ============================================
  const productosFiltrados = useMemo(() => {
    if (!productos || productos.length === 0) return []
    
    let filtrados = [...productos]
    
    if (categoriaSeleccionada) {
      filtrados = filtrados.filter(p => p.categoria === categoriaSeleccionada)
    }
    
    if (busqueda && busqueda.trim()) {
      const searchTerm = busqueda.toLowerCase().trim()
      filtrados = filtrados.filter(p => 
        p.nombre && p.nombre.toLowerCase().includes(searchTerm)
      )
    }
    
    return filtrados
  }, [productos, categoriaSeleccionada, busqueda])

  // ============================================
  // FUNCIÓN COBRAR
  // ============================================
  const cobrar = async () => {
    if (!cliente.nombre || !cliente.nombre.trim()) {
      alert('⚠️ Ingresa el nombre del cliente')
      return
    }
    if (!carrito || carrito.length === 0) {
      alert('⚠️ El carrito está vacío')
      return
    }
    
    if (solicitudActiva && solicitudDescuento.estado === 'pendiente') {
      alert('⏳ Esta venta tiene una solicitud de descuento pendiente de aprobación.')
      return
    }

    if (solicitudActiva && solicitudDescuento.estado !== 'aprobado' && descuentoMonto > 0) {
      alert('⏳ El descuento no ha sido aprobado.')
      return
    }

    const descMonto = solicitudDescuento.estado === 'aprobado' ? (solicitudDescuento.monto || 0) : 0
    const envio = parseFloat(costoEnvio) || 0
    const instalacion = parseFloat(costoInstalacion) || 0
    
    setCargando(true)
    try {
      const esCredito = tipoPago === 'credito'
      const esDomicilio = tipoEntrega === 'domicilio'

      const datosVenta = {
        usuario_id: usuario?.id || 1,
        sucursal_id: usuario?.sucursal_id || null,
        carrito: carrito.map(item => ({
          id: item.id,
          precio: item.precio_unitario || item.precio || 0,
          cantidad: item.cantidad || 1
        })),
        total: subtotal,
        tipo_pago: esCredito ? 'Crédito' : 'Efectivo',
        tipo_venta: esCredito ? 'credito' : 'contado',
        tipo_entrega: esDomicilio ? 'domicilio' : 'retiro',
        cliente_nombre: cliente.nombre,
        cliente_telefono: cliente.telefono || '',
        cliente_direccion: cliente.direccion || '',
        cliente_referencia: cliente.referencia || '',
        detalles: cliente.detalles || '',
        costo_envio: envio,
        costo_instalacion: instalacion,
        descuento_monto: descMonto,
        descuento_aprobado: solicitudDescuento.estado === 'aprobado',
        codigo_autorizacion: solicitudDescuento.codigo || null,
        cliente_es_mayorista: cliente.es_mayorista || false,
        solicitud_descuento_id: solicitudDescuento.id || null
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
        if (descMonto > 0) {
          mensaje += `\n💰 Descuento aplicado: RD$ ${descMonto.toFixed(2)}`
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

  // ============================================
  // FUNCIONES DE IMPRESIÓN
  // ============================================
  const imprimirFactura = (formato = 'A4') => {
    const contenido = facturaRef.current
    if (!contenido) {
      alert('⚠️ No hay factura para imprimir')
      return
    }

    const ventana = window.open('', '_blank', 'width=800,height=600')
    if (!ventana) {
      alert('⚠️ Por favor, permite las ventanas emergentes')
      return
    }

    const html = contenido.outerHTML
    const estilos = formato === 'A4' 
      ? `@page { size: A4; margin: 10mm; } body { font-family: Arial, sans-serif; padding: 20px; background: white; }`
      : `@page { size: 80mm 297mm; margin: 3mm; } body { font-family: 'Courier New', monospace; font-size: 10px; padding: 5px; background: white; }`

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
    `)
    ventana.document.close()
  }

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
            <h2>Venta #{ventaId}</h2>
            {codigoEntrega && (
              <div style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#003b6f',
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                border: '2px dashed #003b6f'
              }}>
                {codigoEntrega}
              </div>
            )}
            <p style={{ marginTop: '20px', color: '#666' }}>
              Total: RD$ {total.toFixed(2)}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px', flexWrap: 'wrap' }}>
              <button onClick={() => imprimirFactura('A4')} style={{ padding: '12px 30px', backgroundColor: '#003b6f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🖨️ Factura A4</button>
              <button onClick={nuevaVenta} style={{ padding: '12px 30px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Nueva Venta</button>
            </div>
          </div>

          <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
            <Factura
              ref={facturaRef}
              venta={{ id: ventaId }}
              cliente={cliente}
              carrito={carrito}
              total={total}
              tipoVenta={tipoPago === 'credito' ? 'credito' : 'contado'}
              tipoEntrega={tipoEntrega}
              codigoEntrega={codigoEntrega}
              vendedor={usuario?.nombre || 'Vendedor'}
              formato="A4"
              sucursalNombre={usuario?.sucursal || 'Sucursal Principal'}
              sucursalId={usuario?.sucursal_id || 3}
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
      <div style={{ padding: '20px' }}>
        <h1>🛒 Punto de Venta</h1>

        {/* BOTÓN HISTORIAL */}
        <button
          onClick={() => {
            setMostrarHistorial(!mostrarHistorial)
            if (!mostrarHistorial) cargarVentasRecientes()
          }}
          style={{
            padding: '8px 20px',
            backgroundColor: mostrarHistorial ? '#f44336' : '#003b6f',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginBottom: '15px'
          }}
        >
          {mostrarHistorial ? '✕ Ocultar Ventas' : '📋 Ver Ventas Recientes'}
        </button>

        {/* HISTORIAL */}
        {mostrarHistorial && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '15px',
            marginBottom: '20px',
            border: '1px solid #003b6f'
          }}>
            <h4>📋 Ventas Recientes ({ventasRecientes.length})</h4>
            {cargandoHistorial ? (
              <p>Cargando...</p>
            ) : ventasRecientes.length === 0 ? (
              <p>No hay ventas recientes</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f4f8' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>#</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Cliente</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasRecientes.slice(0, 10).map((v, i) => (
                    <tr key={v.id || i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>#{v.id}</td>
                      <td style={{ padding: '8px' }}>{v.cliente_nombre || 'N/A'}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        RD$ {Number(v.total || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', fontSize: '0.8rem' }}>
                        {v.fecha ? new Date(v.fecha).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* INDICADORES DE SUCURSAL */}
        {!esSucursalPrincipal && esSucursal && (
          <div style={{ backgroundColor: '#fff3e0', padding: '12px 20px', borderRadius: '8px', marginBottom: '15px', borderLeft: '4px solid #ff9800' }}>
            <p style={{ margin: 0, color: '#e65100' }}>🏢 <strong>{usuario?.sucursal_nombre || 'Mi Sucursal'}</strong></p>
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

        {/* SECCIÓN DE COSTOS Y DESCUENTOS */}
        <div style={{
          border: '2px solid #003b6f',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          backgroundColor: '#e8f0fe'
        }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#003b6f' }}>💰 Costos y Descuentos</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
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
                style={{ width: '100%', padding: '10px', border: '1px solid #003b6f', borderRadius: '8px' }}
              />
            </div>
            
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
                style={{ width: '100%', padding: '10px', border: '1px solid #003b6f', borderRadius: '8px' }}
              />
            </div>
            
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
                style={{ width: '100%', padding: '10px', border: '1px solid #003b6f', borderRadius: '8px' }}
              />
            </div>
          </div>
          
          {/* ESTADO DE LA SOLICITUD */}
          {solicitudActiva && (
            <div style={{ marginTop: '10px' }}>
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
                  border: cliente.es_mayorista ? '2px solid #4CAF50' : '2px solid transparent'
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
                      {cliente.es_mayorista ? '✅ Precio al por mayor aplicado' : 'Marcar si es mayorista'}
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* RESUMEN DE VENTA */}
        {carrito.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #003b6f' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#003b6f' }}>📊 Resumen</h4>
            <p style={{ margin: '5px 0' }}><strong>Subtotal:</strong> RD$ {subtotal.toFixed(2)}</p>
            {parseFloat(costoEnvio) > 0 && <p style={{ margin: '5px 0' }}><strong>Envío:</strong> RD$ {parseFloat(costoEnvio).toFixed(2)}</p>}
            {parseFloat(costoInstalacion) > 0 && <p style={{ margin: '5px 0' }}><strong>Instalación:</strong> RD$ {parseFloat(costoInstalacion).toFixed(2)}</p>}
            {solicitudDescuento.estado === 'aprobado' && solicitudDescuento.monto > 0 && (
              <p style={{ margin: '5px 0', color: '#d32f2f' }}><strong>Descuento:</strong> -RD$ {solicitudDescuento.monto.toFixed(2)}</p>
            )}
            <p style={{ margin: '5px 0', fontSize: '1.3rem', fontWeight: 'bold', color: '#003b6f' }}>
              <strong>Total:</strong> RD$ {total.toFixed(2)}
            </p>
          </div>
        )}

        {/* FILTRO POR CATEGORÍA */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <button
              onClick={() => setCategoriaSeleccionada('')}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: categoriaSeleccionada === '' ? '3px solid #003b6f' : '2px solid #ddd',
                backgroundColor: categoriaSeleccionada === '' ? '#003b6f' : 'white',
                color: categoriaSeleccionada === '' ? 'white' : '#333',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              📋 Todas ({productos.length})
            </button>
            {categorias.map((cat) => {
              const isSelected = categoriaSeleccionada === cat.nombre
              return (
                <button
                  key={cat.nombre}
                  onClick={() => setCategoriaSeleccionada(isSelected ? '' : cat.nombre)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    border: isSelected ? `3px solid ${cat.color}` : '2px solid #ddd',
                    backgroundColor: isSelected ? cat.color : 'white',
                    color: isSelected ? 'white' : '#333',
                    cursor: 'pointer',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{cat.icono || '📁'}</span>
                  {cat.nombre}
                  <span style={{
                    marginLeft: '6px',
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#f0f4f8',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    color: isSelected ? 'white' : '#666'
                  }}>
                    {cat.count}
                  </span>
                </button>
              )
            })}
          </div>

          <input
            type="text"
            placeholder="🔍 Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px',
              border: '2px solid #e0e0e0',
              borderRadius: '10px',
              fontSize: '0.95rem',
              outline: 'none'
            }}
          />
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          {/* LISTA DE PRODUCTOS */}
          <div style={{ flex: 2, maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
            {cargando ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>⏳ Cargando productos...</p>
              </div>
            ) : productosFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9f9f9', borderRadius: '12px', color: '#999' }}>
                <p style={{ fontSize: '2rem' }}>📭</p>
                <p style={{ fontSize: '1.1rem' }}>
                  {productos.length === 0 
                    ? 'No hay productos disponibles' 
                    : busqueda 
                      ? 'No se encontraron productos con esa búsqueda' 
                      : 'No hay productos en esta categoría'}
                </p>
                {productos.length === 0 && (
                  <button 
                    onClick={cargarProductos}
                    style={{
                      marginTop: '15px',
                      padding: '10px 20px',
                      backgroundColor: '#003b6f',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Recargar productos
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                {productosFiltrados.map((producto) => (
                  <div key={producto.id} style={{
                    border: '1px solid #ddd',
                    padding: '15px',
                    borderRadius: '10px',
                    backgroundColor: '#f9f9f9',
                    opacity: (producto.stock || 0) <= 0 ? 0.5 : 1
                  }}>
                    {producto.categoria && (
                      <span style={{
                        fontSize: '0.7rem',
                        backgroundColor: '#e3f2fd',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        color: '#003b6f',
                        display: 'inline-block',
                        marginBottom: '5px'
                      }}>
                        {producto.categoria}
                      </span>
                    )}
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem' }}>{producto.nombre || 'Sin nombre'}</h4>
                    <p style={{ margin: '5px 0', fontSize: '1.1rem', fontWeight: 'bold', color: '#003b6f' }}>
                      RD$ {Number(producto.precio || 0).toFixed(2)}
                    </p>
                    {esSucursalPrincipal && producto.precio_mayor && (
                      <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#4CAF50' }}>
                        Mayor: RD$ {Number(producto.precio_mayor).toFixed(2)}
                      </p>
                    )}
                    <p style={{
                      margin: '2px 0',
                      fontSize: '0.8rem',
                      color: (producto.stock || 0) <= 0 ? '#f44336' : (producto.stock || 0) <= 5 ? '#ff9800' : '#666'
                    }}>
                      Stock: {producto.stock || 0}{(producto.stock || 0) <= 0 && ' ❌ Agotado'}
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
            )}
          </div>

          {/* CARRITO */}
          <div style={{
            flex: 1,
            position: 'sticky',
            top: '20px',
            alignSelf: 'flex-start',
            maxHeight: '75vh',
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            minWidth: '280px',
            maxWidth: '350px',
            overflowY: 'auto',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ marginTop: 0, color: '#003b6f', borderBottom: '2px solid #003b6f', paddingBottom: '10px' }}>
              🛒 Carrito {carrito.length > 0 && `(${carrito.length})`}
            </h3>
            {carrito.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '30px 0' }}>Carrito vacío</p>
            ) : (
              <>
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {carrito.map((item) => (
                    <div key={item.id} style={{
                      border: '1px solid #eee',
                      padding: '10px',
                      borderRadius: '8px',
                      marginBottom: '10px',
                      backgroundColor: '#fafafa'
                    }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{item.nombre || 'Sin nombre'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <button
                            onClick={() => actualizarCantidad(item.id, (item.cantidad || 1) - 1)}
                            style={{ cursor: 'pointer', padding: '2px 10px', backgroundColor: '#e0e0e0', border: 'none', borderRadius: '4px' }}
                          >−</button>
                          <span style={{ fontWeight: 'bold', minWidth: '25px', textAlign: 'center' }}>{item.cantidad || 1}</span>
                          <button
                            onClick={() => actualizarCantidad(item.id, (item.cantidad || 1) + 1)}
                            style={{ cursor: 'pointer', padding: '2px 10px', backgroundColor: '#e0e0e0', border: 'none', borderRadius: '4px' }}
                          >+</button>
                        </div>
                        <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#003b6f' }}>
                          RD$ {((item.precio_unitario || item.precio || 0) * (item.cantidad || 1)).toFixed(2)}
                        </span>
                        <button
                          onClick={() => eliminar(item.id)}
                          style={{ backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '2px solid #003b6f', paddingTop: '12px', marginTop: '10px' }}>
                  <h3 style={{ color: '#003b6f', fontSize: '1.2rem', margin: '0' }}>
                    Total: RD$ {total.toFixed(2)}
                  </h3>
                </div>
                <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexDirection: 'column' }}>
                  <button
                    onClick={limpiarCarrito}
                    style={{ backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '6px', padding: '10px', cursor: 'pointer' }}
                  >
                    🗑️ Limpiar Carrito
                  </button>
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
      </div>
    </AdminLayout>
  )
}

export default POS