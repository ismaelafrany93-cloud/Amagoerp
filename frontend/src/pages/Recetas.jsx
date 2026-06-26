import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'  // 👈 Importar la URL centralizada

function Recetas() {
    const [recetas, setRecetas] = useState([])
    const [productos, setProductos] = useState([])
    const [materiales, setMateriales] = useState([])
    const [cargando, setCargando] = useState(true)
    const [mostrarForm, setMostrarForm] = useState(false)
    const [mensaje, setMensaje] = useState('')
    const [form, setForm] = useState({
        producto_id: '',
        material_id: '',
        cantidad_necesaria: '',
        descripcion: ''
    })

    useEffect(() => {
        cargarDatos()
    }, [])

    const cargarDatos = async () => {
        try {
            const [recetasRes, productosRes, materialesRes] = await Promise.all([
                fetch(`${API_URL}/recetas`),  // 👈 Cambiado
                fetch(`${API_URL}/productos`),  // 👈 Cambiado
                fetch(`${API_URL}/recetas/materiales`)  // 👈 Cambiado
            ])

            const recetasData = await recetasRes.json()
            const productosData = await productosRes.json()
            const materialesData = await materialesRes.json()

            setRecetas(recetasData)
            setProductos(productosData)
            setMateriales(materialesData)
        } catch (error) {
            console.error('Error cargando datos:', error)
            setMensaje('❌ Error cargando datos')
        } finally {
            setCargando(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setCargando(true)

        try {
            const response = await fetch(`${API_URL}/recetas`, {  // 👈 Cambiado
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })

            const data = await response.json()

            if (data.success) {
                setMensaje('✅ Material agregado correctamente')
                setForm({ producto_id: '', material_id: '', cantidad_necesaria: '', descripcion: '' })
                setMostrarForm(false)
                cargarDatos()
                setTimeout(() => setMensaje(''), 3000)
            } else {
                setMensaje('❌ ' + (data.message || data.error))
            }
        } catch (error) {
            console.error(error)
            setMensaje('❌ Error al guardar')
        } finally {
            setCargando(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este material de la receta?')) return

        try {
            const response = await fetch(`${API_URL}/recetas/${id}`, {  // 👈 Cambiado
                method: 'DELETE'
            })
            const data = await response.json()

            if (data.success) {
                setMensaje('✅ Material eliminado')
                cargarDatos()
                setTimeout(() => setMensaje(''), 3000)
            }
        } catch (error) {
            console.error(error)
            setMensaje('❌ Error al eliminar')
        }
    }

    if (cargando && recetas.length === 0) {
        return (
            <AdminLayout>
                <div style={{ textAlign: 'center', padding: '60px' }}>
                    <h2>Cargando recetas...</h2>
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout>
            <h1>📋 Recetas de Producción</h1>

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
                {mostrarForm ? '✕ Cancelar' : '➕ Agregar Material a Producto'}
            </button>

            {mostrarForm && (
                <form onSubmit={handleSubmit} style={{
                    backgroundColor: '#f5f7fb',
                    padding: '25px',
                    borderRadius: '12px',
                    marginBottom: '25px',
                    border: '2px solid #003b6f'
                }}>
                    <h3 style={{ marginTop: 0, color: '#003b6f' }}>Agregar Material a Producto</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Producto *</label>
                            <select
                                value={form.producto_id}
                                onChange={(e) => setForm({ ...form, producto_id: e.target.value })}
                                required
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                            >
                                <option value="">Seleccionar producto</option>
                                {productos.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Material *</label>
                            <select
                                value={form.material_id}
                                onChange={(e) => setForm({ ...form, material_id: e.target.value })}
                                required
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                            >
                                <option value="">Seleccionar material</option>
                                {materiales.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.nombre} ({m.unidad || 'unidades'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>
                                Cantidad necesaria *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={form.cantidad_necesaria}
                                onChange={(e) => setForm({ ...form, cantidad_necesaria: e.target.value })}
                                required
                                placeholder="Ej: 4"
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Descripción</label>
                            <input
                                type="text"
                                value={form.descripcion}
                                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                                placeholder="Ej: Patas de 15 pulgadas"
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
                        {cargando ? 'Guardando...' : '✅ Guardar'}
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
                        <th style={{ padding: '12px', textAlign: 'left' }}>Producto</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Material</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Cantidad</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Descripción</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {recetas.length === 0 ? (
                        <tr>
                            <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                                No hay recetas registradas
                            </td>
                        </tr>
                    ) : (
                        recetas.map((r) => (
                            <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px' }}>{r.producto_nombre}</td>
                                <td style={{ padding: '12px' }}>{r.material_nombre}</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    {r.cantidad_necesaria} {r.unidad || 'unidades'}
                                </td>
                                <td style={{ padding: '12px' }}>{r.descripcion || '-'}</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <button
                                        onClick={() => handleDelete(r.id)}
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

export default Recetas