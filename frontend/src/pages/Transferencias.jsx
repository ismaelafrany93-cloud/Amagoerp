import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Transferencias() {
    const [transferencias, setTransferencias] = useState([])
    const [productos, setProductos] = useState([])
    const [sucursales, setSucursales] = useState([])
    const [cargando, setCargando] = useState(true)
    const [mostrarForm, setMostrarForm] = useState(false)
    const [mensaje, setMensaje] = useState('')
    const [form, setForm] = useState({
        sucursal_origen_id: '',
        sucursal_destino_id: '',
        observacion: '',
        productos: []
    })
    const [productoSeleccionado, setProductoSeleccionado] = useState('')
    const [cantidadSeleccionada, setCantidadSeleccionada] = useState(1)

    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
    const esSucursalPrincipal = usuario.sucursal_id === 1

    useEffect(() => {
        // Verificar acceso - Solo sucursal principal
        if (!esSucursalPrincipal) {
            alert('⚠️ Solo usuarios de la sucursal principal pueden acceder a Transferencias')
            window.location.href = '/dashboard'
        } else {
            cargarDatos()
        }
    }, [])

    // Si no es principal, mostrar mensaje
    if (!esSucursalPrincipal) {
        return (
            <AdminLayout>
                <div style={{ textAlign: 'center', padding: '60px' }}>
                    <h2>⛔ Acceso Denegado</h2>
                    <p style={{ color: '#666' }}>Solo usuarios de la sucursal principal pueden acceder a Transferencias</p>
                </div>
            </AdminLayout>
        )
    }

    const cargarDatos = async () => {
        try {
            const [transRes, prodRes, sucRes] = await Promise.all([
                fetch(`${API_URL}/transferencias`),
                fetch(`${API_URL}/productos`),
                fetch(`${API_URL}/sucursales`)
            ])

            const transferenciasData = await transRes.json()
            const productosData = await prodRes.json()
            const sucursalesData = await sucRes.json()

            // 🛡️ SIEMPRE asegurar que sean arrays
            setTransferencias(Array.isArray(transferenciasData) ? transferenciasData : [])
            setProductos(Array.isArray(productosData) ? productosData : [])
            setSucursales(Array.isArray(sucursalesData) ? sucursalesData : [])
        } catch (error) {
            console.error('Error cargando datos:', error)
            setMensaje('❌ Error cargando datos')
            setTransferencias([])
            setProductos([])
            setSucursales([])
        } finally {
            setCargando(false)
        }
    }

    const agregarProducto = () => {
        if (!productoSeleccionado || cantidadSeleccionada <= 0) {
            alert('⚠️ Selecciona un producto y una cantidad válida')
            return
        }

        const producto = productos.find(p => p.id === parseInt(productoSeleccionado))
        if (!producto) return

        const existe = form.productos.find(p => p.id === producto.id)
        if (existe) {
            setForm({
                ...form,
                productos: form.productos.map(p =>
                    p.id === producto.id
                        ? { ...p, cantidad: p.cantidad + cantidadSeleccionada }
                        : p
                )
            })
        } else {
            setForm({
                ...form,
                productos: [...form.productos, { ...producto, cantidad: cantidadSeleccionada }]
            })
        }

        setProductoSeleccionado('')
        setCantidadSeleccionada(1)
    }

    const eliminarProducto = (id) => {
        setForm({
            ...form,
            productos: form.productos.filter(p => p.id !== id)
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (form.productos.length === 0) {
            alert('⚠️ Agrega al menos un producto')
            return
        }

        if (form.sucursal_origen_id === form.sucursal_destino_id) {
            alert('⚠️ La sucursal de origen y destino deben ser diferentes')
            return
        }

        setCargando(true)

        try {
            const response = await fetch(`${API_URL}/transferencias`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario_id: usuario.id,
                    sucursal_origen_id: parseInt(form.sucursal_origen_id),
                    sucursal_destino_id: parseInt(form.sucursal_destino_id),
                    productos: form.productos.map(p => ({
                        id: p.id,
                        cantidad: p.cantidad,
                        precio: p.precio
                    })),
                    observacion: form.observacion
                })
            })

            const data = await response.json()

            if (data.success) {
                setMensaje('✅ Transferencia creada correctamente')
                setForm({
                    sucursal_origen_id: '',
                    sucursal_destino_id: '',
                    observacion: '',
                    productos: []
                })
                setMostrarForm(false)
                cargarDatos()
                setTimeout(() => setMensaje(''), 3000)
            } else {
                setMensaje('❌ Error: ' + (data.message || data.error))
            }
        } catch (error) {
            console.error('Error al guardar:', error)
            setMensaje('❌ Error al guardar')
        } finally {
            setCargando(false)
        }
    }

    const confirmarRecepcion = async (id) => {
        if (!window.confirm('¿Confirmar recepción de esta transferencia?')) return

        try {
            const response = await fetch(`${API_URL}/transferencias/${id}/recibir`, {
                method: 'PUT'
            })
            const data = await response.json()

            if (data.success) {
                setMensaje('✅ Transferencia recibida correctamente')
                cargarDatos()
                setTimeout(() => setMensaje(''), 3000)
            } else {
                setMensaje('❌ ' + (data.message || data.error))
            }
        } catch (error) {
            console.error('Error al confirmar recepción:', error)
            setMensaje('❌ Error al confirmar recepción')
        }
    }

    const cancelarTransferencia = async (id) => {
        if (!window.confirm('¿Cancelar esta transferencia?')) return

        try {
            const response = await fetch(`${API_URL}/transferencias/${id}/cancelar`, {
                method: 'PUT'
            })
            const data = await response.json()

            if (data.success) {
                setMensaje('✅ Transferencia cancelada')
                cargarDatos()
                setTimeout(() => setMensaje(''), 3000)
            } else {
                setMensaje('❌ ' + (data.message || data.error))
            }
        } catch (error) {
            console.error('Error al cancelar:', error)
            setMensaje('❌ Error al cancelar')
        }
    }

    if (cargando) {
        return (
            <AdminLayout>
                <div style={{ textAlign: 'center', padding: '60px' }}>
                    <h2>Cargando...</h2>
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout>
            <h1>📦 Transferencias</h1>

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

            <button
                onClick={() => setMostrarForm(!mostrarForm)}
                style={{
                    marginBottom: '20px',
                    padding: '10px 20px',
                    backgroundColor: '#003b6f',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem'
                }}
            >
                {mostrarForm ? '✕ Cancelar' : '➕ Nueva Transferencia'}
            </button>

            {mostrarForm && (
                <form onSubmit={handleSubmit} style={{
                    backgroundColor: '#f5f7fb',
                    padding: '25px',
                    borderRadius: '12px',
                    marginBottom: '25px',
                    border: '2px solid #003b6f'
                }}>
                    <h3 style={{ marginTop: 0, color: '#003b6f' }}>Nueva Transferencia</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Sucursal Origen *</label>
                            <select
                                value={form.sucursal_origen_id}
                                onChange={(e) => setForm({ ...form, sucursal_origen_id: e.target.value })}
                                required
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                            >
                                <option value="">Seleccionar</option>
                                {Array.isArray(sucursales) && sucursales.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Sucursal Destino *</label>
                            <select
                                value={form.sucursal_destino_id}
                                onChange={(e) => setForm({ ...form, sucursal_destino_id: e.target.value })}
                                required
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                            >
                                <option value="">Seleccionar</option>
                                {Array.isArray(sucursales) && sucursales.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Observación</label>
                            <textarea
                                value={form.observacion}
                                onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                                placeholder="Notas sobre la transferencia..."
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', minHeight: '50px' }}
                            />
                        </div>
                    </div>

                    <hr style={{ margin: '20px 0' }} />

                    <h4>Agregar Productos</h4>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select
                            value={productoSeleccionado}
                            onChange={(e) => setProductoSeleccionado(e.target.value)}
                            style={{ flex: 2, padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                        >
                            <option value="">Seleccionar producto</option>
                            {Array.isArray(productos) && productos.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock || 0})</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            min="1"
                            value={cantidadSeleccionada}
                            onChange={(e) => setCantidadSeleccionada(parseInt(e.target.value) || 1)}
                            style={{ width: '100px', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                        />
                        <button
                            type="button"
                            onClick={agregarProducto}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            ➕ Agregar
                        </button>
                    </div>
                    {form.productos.length > 0 && (
                        <div style={{ marginTop: '15px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f0f4f8' }}>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>Producto</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>Cantidad</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {form.productos.map((p) => (
                                        <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '8px' }}>{p.nombre}</td>
                                            <td style={{ padding: '8px', textAlign: 'center' }}>{p.cantidad}</td>
                                            <td style={{ padding: '8px', textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => eliminarProducto(p.id)}
                                                    style={{
                                                        backgroundColor: '#f44336',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '4px 12px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ❌
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={cargando || form.productos.length === 0}
                        style={{
                            marginTop: '20px',
                            padding: '12px 30px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            opacity: cargando || form.productos.length === 0 ? 0.6 : 1
                        }}
                    >
                        {cargando ? 'Guardando...' : '✅ Crear Transferencia'}
                    </button>
                </form>
            )}

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
                        <th style={{ padding: '12px', textAlign: 'left' }}>#</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Origen</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Destino</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Fecha</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {!Array.isArray(transferencias) || transferencias.length === 0 ? (
                        <tr>
                            <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                                No hay transferencias registradas
                            </td>
                        </tr>
                    ) : (
                        transferencias.map((t) => (
                            <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px' }}>{t.id}</td>
                                <td style={{ padding: '12px' }}>{t.sucursal_origen_nombre}</td>
                                <td style={{ padding: '12px' }}>{t.sucursal_destino_nombre}</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <span style={{
                                        backgroundColor: t.estado === 'completada' ? '#4CAF50' :
                                                       t.estado === 'pendiente' ? '#ff9800' :
                                                       t.estado === 'cancelada' ? '#f44336' : '#757575',
                                        color: 'white',
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        fontSize: '0.8rem'
                                    }}>
                                        {t.estado === 'completada' ? '✅ Completada' :
                                         t.estado === 'pendiente' ? '⏳ Pendiente' :
                                         t.estado === 'cancelada' ? '❌ Cancelada' : t.estado}
                                    </span>
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    {new Date(t.fecha_salida).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    {t.estado === 'pendiente' && (
                                        <>
                                            <button
                                                onClick={() => confirmarRecepcion(t.id)}
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
                                                ✅ Recibir
                                            </button>
                                            <button
                                                onClick={() => cancelarTransferencia(t.id)}
                                                style={{
                                                    backgroundColor: '#f44336',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '4px 12px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ❌ Cancelar
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </AdminLayout>
    )
}

export default Transferencias