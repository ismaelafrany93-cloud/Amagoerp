import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Creditos() {
    const [cuentas, setCuentas] = useState([])
    const [clientes, setClientes] = useState([])
    const [resumen, setResumen] = useState({
        total_cuentas: 0,
        total_adeudado: 0,
        saldo_total: 0,
        total_abonado: 0
    })
    const [cargando, setCargando] = useState(true)
    const [mensaje, setMensaje] = useState('')
    const [selectedCliente, setSelectedCliente] = useState('')
    const [abonoMonto, setAbonoMonto] = useState('')
    const [observacionAbono, setObservacionAbono] = useState('')

    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

    useEffect(() => {
        cargarCreditos()
        cargarClientes()
        cargarResumen()
    }, [])

    const cargarCreditos = async () => {
        try {
            const response = await fetch(`${API_URL}/creditos`)
            if (!response.ok) {
                throw new Error(`Error ${response.status}`)
            }
            const data = await response.json()
            // Filtrar solo los que tienen saldo pendiente
            const conDeuda = Array.isArray(data) ? data.filter(c => (c.saldo_pendiente || 0) > 0.01) : []
            setCuentas(conDeuda)
        } catch (error) {
            console.error('Error cargando créditos:', error)
            setMensaje('❌ Error cargando créditos')
            setCuentas([])
        }
    }

    const cargarClientes = async () => {
        try {
            const response = await fetch(`${API_URL}/creditos/clientes`)
            if (!response.ok) {
                throw new Error(`Error ${response.status}`)
            }
            const data = await response.json()
            setClientes(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('Error cargando clientes:', error)
            setClientes([])
        }
    }

    const cargarResumen = async () => {
        try {
            const response = await fetch(`${API_URL}/creditos/resumen`)
            if (!response.ok) {
                throw new Error(`Error ${response.status}`)
            }
            const data = await response.json()
            setResumen(data)
        } catch (error) {
            console.error('Error cargando resumen:', error)
            setResumen({
                total_cuentas: 0,
                total_adeudado: 0,
                saldo_total: 0,
                total_abonado: 0
            })
        } finally {
            setCargando(false)
        }
    }

    const registrarAbono = async (e) => {
        e.preventDefault()
        if (!selectedCliente || !abonoMonto || parseFloat(abonoMonto) <= 0) {
            alert('⚠️ Selecciona un cliente y un monto válido')
            return
        }

        try {
            const response = await fetch(`${API_URL}/creditos/abonos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cliente_id: parseInt(selectedCliente),
                    monto: parseFloat(abonoMonto),
                    usuario_id: usuario.id,
                    observacion: observacionAbono
                })
            })

            const data = await response.json()

            if (data.success) {
                setMensaje(`✅ Abono de RD$ ${parseFloat(abonoMonto).toFixed(2)} registrado correctamente`)
                setAbonoMonto('')
                setSelectedCliente('')
                setObservacionAbono('')
                cargarCreditos()
                cargarClientes()
                cargarResumen()
                setTimeout(() => setMensaje(''), 3000)
            } else {
                alert('❌ Error: ' + (data.error || 'No se pudo registrar'))
            }
        } catch (error) {
            console.error(error)
            alert('❌ Error registrando abono')
        }
    }

    const formatearNumero = (valor) => {
        if (valor === undefined || valor === null) return '0.00'
        const num = parseFloat(valor)
        if (isNaN(num)) return '0.00'
        return num.toFixed(2)
    }

    const totalDeuda = cuentas.reduce((acc, c) => acc + (c.saldo_pendiente || 0), 0)

    if (cargando) {
        return (
            <AdminLayout>
                <div style={{ textAlign: 'center', padding: '60px' }}>
                    <h2>Cargando créditos...</h2>
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout>
            <h1>💰 Cuentas por Cobrar</h1>

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
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
            }}>
                <div style={{ backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ margin: 0, color: '#0d47a1' }}>💰 Total Deuda</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0 0 0', color: '#d32f2f' }}>
                        RD$ {formatearNumero(totalDeuda)}
                    </p>
                </div>
                <div style={{ backgroundColor: '#e8f5e9', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ margin: 0, color: '#1b5e20' }}>👥 Clientes con Deuda</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0 0 0' }}>
                        {clientes.length}
                    </p>
                </div>
                <div style={{ backgroundColor: '#fff3e0', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ margin: 0, color: '#e65100' }}>📊 Total Abonado</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0 0 0' }}>
                        RD$ {formatearNumero(resumen.total_abonado)}
                    </p>
                </div>
            </div>

            <div style={{
                border: '2px solid #003b6f',
                borderRadius: '12px',
                padding: '25px',
                marginBottom: '30px',
                backgroundColor: '#f8faff'
            }}>
                <h3 style={{ marginTop: 0, color: '#003b6f' }}>💵 Registrar Abono</h3>
                <form onSubmit={registrarAbono}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Cliente *</label>
                            <select
                                value={selectedCliente}
                                onChange={(e) => setSelectedCliente(e.target.value)}
                                required
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                            >
                                <option value="">Seleccionar cliente</option>
                                {clientes.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.nombre} - Debe: RD$ {formatearNumero(c.saldo_pendiente)}
                                    </option>
                                ))}
                            </select>
                            {clientes.length === 0 && (
                                <p style={{ fontSize: '0.8rem', color: '#4CAF50', marginTop: '5px' }}>
                                    ✅ No hay clientes con deuda
                                </p>
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Monto del Abono *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={abonoMonto}
                                onChange={(e) => setAbonoMonto(e.target.value)}
                                required
                                placeholder="0.00"
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Observación</label>
                            <input
                                type="text"
                                value={observacionAbono}
                                onChange={(e) => setObservacionAbono(e.target.value)}
                                placeholder="Nota opcional"
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={clientes.length === 0}
                        style={{
                            marginTop: '15px',
                            padding: '12px 30px',
                            backgroundColor: clientes.length === 0 ? '#999' : '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: clientes.length === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '1rem',
                            opacity: clientes.length === 0 ? 0.6 : 1
                        }}
                    >
                        {clientes.length === 0 ? '✅ Todos los clientes han pagado' : '✅ Registrar Abono'}
                    </button>
                </form>
            </div>

            <h2>📋 Clientes con Deuda</h2>
            {cuentas.length === 0 ? (
                <div style={{
                    backgroundColor: '#e8f5e9',
                    padding: '30px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '2px solid #4CAF50'
                }}>
                    <h3 style={{ margin: 0, color: '#1b5e20' }}>🎉 ¡Todos los clientes han pagado!</h3>
                    <p style={{ color: '#666' }}>No hay cuentas pendientes por cobrar</p>
                </div>
            ) : (
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
                            <th style={{ padding: '12px', textAlign: 'left' }}>Cliente</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Teléfono</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Total Ventas</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Abonado</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Saldo Pendiente</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cuentas.map((c, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px' }}>{c.cliente_nombre || c.cliente_venta || 'N/A'}</td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>{c.cliente_telefono || 'N/A'}</td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                    RD$ {formatearNumero(c.total_venta)}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                    RD$ {formatearNumero(c.abonado)}
                                </td>
                                <td style={{
                                    padding: '12px',
                                    textAlign: 'right',
                                    color: '#d32f2f',
                                    fontWeight: 'bold'
                                }}>
                                    RD$ {formatearNumero(c.saldo_pendiente)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </AdminLayout>
    )
}

export default Creditos