import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Sucursales() {
    const [sucursales, setSucursales] = useState([])
    const [cargando, setCargando] = useState(true)
    const [mostrarForm, setMostrarForm] = useState(false)
    const [mensaje, setMensaje] = useState('')
    const [form, setForm] = useState({
        nombre: '',
        direccion: '',
        telefono: '',
        encargado: ''
    })

    useEffect(() => {
        cargarSucursales()
    }, [])

    const cargarSucursales = async () => {
        try {
            const response = await fetch(`${API_URL}/sucursales`)
            const data = await response.json()
            setSucursales(data)
        } catch (error) {
            console.error('Error cargando sucursales:', error)
        } finally {
            setCargando(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setCargando(true)
        setMensaje('')

        try {
            const response = await fetch(`${API_URL}/sucursales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })

            const data = await response.json()

            if (data.success) {
                setMensaje('✅ Sucursal creada correctamente')
                setForm({ nombre: '', direccion: '', telefono: '', encargado: '' })
                setMostrarForm(false)
                cargarSucursales()
                setTimeout(() => setMensaje(''), 3000)
            } else {
                setMensaje('❌ Error: ' + (data.message || data.error))
            }
        } catch (error) {
            setMensaje('❌ Error al guardar')
        } finally {
            setCargando(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar esta sucursal?')) return

        try {
            const response = await fetch(`${API_URL}/sucursales/${id}`, {
                method: 'DELETE'
            })
            const data = await response.json()

            if (data.success) {
                setMensaje('✅ Sucursal eliminada')
                cargarSucursales()
                setTimeout(() => setMensaje(''), 3000)
            }
        } catch (error) {
            setMensaje('❌ Error al eliminar')
        }
    }

    if (cargando) {
        return (
            <AdminLayout>
                <div style={{ textAlign: 'center', padding: '60px' }}>
                    <h2>Cargando sucursales...</h2>
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout>
            <h1>🏢 Sucursales</h1>

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
                {mostrarForm ? '✕ Cancelar' : '➕ Nueva Sucursal'}
            </button>

            {mostrarForm && (
                <form onSubmit={handleSubmit} style={{
                    backgroundColor: '#f5f7fb',
                    padding: '25px',
                    borderRadius: '12px',
                    marginBottom: '25px',
                    border: '2px solid #003b6f'
                }}>
                    <h3 style={{ marginTop: 0, color: '#003b6f' }}>Agregar Sucursal</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Nombre *</label>
                            <input
                                type="text"
                                value={form.nombre}
                                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                required
                                placeholder="Ej: Sucursal Baní"
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Teléfono</label>
                            <input
                                type="text"
                                value={form.telefono}
                                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                                placeholder="809-555-0000"
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Dirección</label>
                            <input
                                type="text"
                                value={form.direccion}
                                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                                placeholder="Calle, número, sector"
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Encargado</label>
                            <input
                                type="text"
                                value={form.encargado}
                                onChange={(e) => setForm({ ...form, encargado: e.target.value })}
                                placeholder="Nombre del encargado"
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={cargando}
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
                        {cargando ? 'Guardando...' : '✅ Guardar Sucursal'}
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
                        <th style={{ padding: '12px', textAlign: 'left' }}>ID</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Nombre</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Teléfono</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Dirección</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Encargado</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {sucursales.length === 0 ? (
                        <tr>
                            <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                                No hay sucursales registradas
                            </td>
                        </tr>
                    ) : (
                        sucursales.map((s) => (
                            <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px' }}>{s.id}</td>
                                <td style={{ padding: '12px', fontWeight: 'bold', color: '#003b6f' }}>
                                    {s.nombre}
                                </td>
                                <td style={{ padding: '12px' }}>{s.telefono || 'N/A'}</td>
                                <td style={{ padding: '12px' }}>{s.direccion || 'N/A'}</td>
                                <td style={{ padding: '12px' }}>{s.encargado || 'N/A'}</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <button
                                        onClick={() => handleDelete(s.id)}
                                        style={{
                                            backgroundColor: '#f44336',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '4px 12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </AdminLayout>
    )
}

export default Sucursales