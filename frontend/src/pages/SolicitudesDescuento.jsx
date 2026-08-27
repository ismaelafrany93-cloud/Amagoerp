import React, { useState, useEffect } from 'react';
import API_URL from '../config';

const SolicitudesDescuento = ({ usuario }) => {
    const [solicitudes, setSolicitudes] = useState([]);
    const [pendientes, setPendientes] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [filtro, setFiltro] = useState('pendientes'); // 'pendientes', 'todas', 'aprobadas', 'rechazadas'
    const [sucursalId, setSucursalId] = useState(usuario?.sucursal_id || null);

    useEffect(() => {
        cargarSolicitudes();
        // Recargar cada 30 segundos
        const interval = setInterval(cargarSolicitudes, 30000);
        return () => clearInterval(interval);
    }, [filtro, sucursalId]);

    const cargarSolicitudes = async () => {
        setCargando(true);
        setError('');
        try {
            let url;
            if (filtro === 'pendientes') {
                url = `${API_URL}/solicitudes-descuento/pendientes`;
                if (sucursalId) {
                    url += `?sucursal_id=${sucursalId}`;
                }
                console.log('📡 Cargando solicitudes pendientes desde:', url);
                const response = await fetch(url);
                const data = await response.json();
                console.log('📊 Datos recibidos:', data);
                setPendientes(Array.isArray(data) ? data : []);
            } else {
                url = `${API_URL}/solicitudes-descuento`;
                const params = new URLSearchParams();
                if (sucursalId) params.append('sucursal_id', sucursalId);
                if (filtro !== 'todas') params.append('estado', filtro);
                if (params.toString()) url += `?${params.toString()}`;
                console.log('📡 Cargando solicitudes desde:', url);
                const response = await fetch(url);
                const data = await response.json();
                console.log('📊 Datos recibidos:', data);
                setSolicitudes(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('❌ Error cargando solicitudes:', error);
            setError('Error al cargar las solicitudes: ' + error.message);
        } finally {
            setCargando(false);
        }
    };

    const aprobarSolicitud = async (id, montoAprobado) => {
        if (!window.confirm('¿Aprobar esta solicitud de descuento?')) return;
        
        try {
            setCargando(true);
            const response = await fetch(`${API_URL}/solicitudes-descuento/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estado: 'aprobado',
                    usuario_autorizador: usuario.id,
                    monto_aprobado: montoAprobado,
                    codigo_autorizacion: `AUT-${Date.now().toString().slice(-6)}`
                })
            });
            
            const data = await response.json();
            if (data.success) {
                alert('✅ Solicitud aprobada');
                cargarSolicitudes();
            } else {
                alert('❌ Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error al aprobar solicitud');
        } finally {
            setCargando(false);
        }
    };

    const rechazarSolicitud = async (id) => {
        if (!window.confirm('¿Rechazar esta solicitud de descuento?')) return;
        
        try {
            setCargando(true);
            const response = await fetch(`${API_URL}/solicitudes-descuento/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estado: 'rechazado',
                    usuario_autorizador: usuario.id
                })
            });
            
            const data = await response.json();
            if (data.success) {
                alert('❌ Solicitud rechazada');
                cargarSolicitudes();
            } else {
                alert('❌ Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error al rechazar solicitud');
        } finally {
            setCargando(false);
        }
    };

    const formatearFecha = (fecha) => {
        if (!fecha) return 'N/A';
        const d = new Date(fecha);
        return d.toLocaleString('es-DO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getEstadoBadge = (estado) => {
        const configs = {
            'pendiente': { color: '#ff9800', bg: '#fff3e0', icon: '⏳', text: 'Pendiente' },
            'aprobado': { color: '#4CAF50', bg: '#e8f5e9', icon: '✅', text: 'Aprobado' },
            'rechazado': { color: '#f44336', bg: '#ffebee', icon: '❌', text: 'Rechazado' }
        };
        const config = configs[estado] || configs['pendiente'];
        return (
            <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                backgroundColor: config.bg,
                color: config.color,
                fontWeight: 'bold',
                fontSize: '0.8rem'
            }}>
                {config.icon} {config.text}
            </span>
        );
    };

    const solicitudesMostrar = filtro === 'pendientes' ? pendientes : solicitudes;

    return (
        <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
            <h1 style={{ color: '#003b6f', marginBottom: '20px' }}>📋 Solicitudes de Descuento</h1>

            {/* Filtros */}
            <div style={{
                display: 'flex',
                gap: '15px',
                marginBottom: '20px',
                flexWrap: 'wrap',
                alignItems: 'center',
                backgroundColor: '#f5f7fb',
                padding: '15px',
                borderRadius: '12px'
            }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setFiltro('pendientes')}
                        style={{
                            padding: '8px 20px',
                            backgroundColor: filtro === 'pendientes' ? '#FF9800' : 'white',
                            color: filtro === 'pendientes' ? 'white' : '#333',
                            border: filtro === 'pendientes' ? '2px solid #FF9800' : '2px solid #ddd',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: filtro === 'pendientes' ? 'bold' : 'normal'
                        }}
                    >
                        ⏳ Pendientes ({pendientes.length})
                    </button>
                    <button
                        onClick={() => setFiltro('aprobado')}
                        style={{
                            padding: '8px 20px',
                            backgroundColor: filtro === 'aprobado' ? '#4CAF50' : 'white',
                            color: filtro === 'aprobado' ? 'white' : '#333',
                            border: filtro === 'aprobado' ? '2px solid #4CAF50' : '2px solid #ddd',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        ✅ Aprobadas
                    </button>
                    <button
                        onClick={() => setFiltro('rechazado')}
                        style={{
                            padding: '8px 20px',
                            backgroundColor: filtro === 'rechazado' ? '#f44336' : 'white',
                            color: filtro === 'rechazado' ? 'white' : '#333',
                            border: filtro === 'rechazado' ? '2px solid #f44336' : '2px solid #ddd',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        ❌ Rechazadas
                    </button>
                    <button
                        onClick={() => setFiltro('todas')}
                        style={{
                            padding: '8px 20px',
                            backgroundColor: filtro === 'todas' ? '#003b6f' : 'white',
                            color: filtro === 'todas' ? 'white' : '#333',
                            border: filtro === 'todas' ? '2px solid #003b6f' : '2px solid #ddd',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        📋 Todas
                    </button>
                </div>

                <button
                    onClick={cargarSolicitudes}
                    disabled={cargando}
                    style={{
                        padding: '8px 20px',
                        backgroundColor: '#003b6f',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: cargando ? 'not-allowed' : 'pointer',
                        opacity: cargando ? 0.6 : 1
                    }}
                >
                    {cargando ? '🔄 Cargando...' : '🔄 Actualizar'}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    backgroundColor: '#ffebee',
                    padding: '15px',
                    borderRadius: '8px',
                    color: '#c62828',
                    marginBottom: '20px'
                }}>
                    ❌ {error}
                </div>
            )}

            {/* Tabla */}
            {cargando && solicitudesMostrar.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
                    <p style={{ fontSize: '1.5rem' }}>⏳</p>
                    <p>Cargando solicitudes...</p>
                </div>
            ) : solicitudesMostrar.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '60px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '12px',
                    color: '#999'
                }}>
                    <p style={{ fontSize: '2rem' }}>📭</p>
                    <p>No hay solicitudes {filtro === 'pendientes' ? 'pendientes' : `con estado "${filtro}"`}</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                        <thead>
                            <tr style={{ backgroundColor: '#003b6f', color: 'white' }}>
                                <th style={{ padding: '12px 15px', textAlign: 'left' }}>ID</th>
                                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Cliente</th>
                                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Solicitante</th>
                                <th style={{ padding: '12px 15px', textAlign: 'right' }}>Monto Solicitado</th>
                                <th style={{ padding: '12px 15px', textAlign: 'right' }}>Monto Aprobado</th>
                                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Motivo</th>
                                <th style={{ padding: '12px 15px', textAlign: 'center' }}>Estado</th>
                                <th style={{ padding: '12px 15px', textAlign: 'center' }}>Fecha</th>
                                <th style={{ padding: '12px 15px', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {solicitudesMostrar.map((solicitud, index) => (
                                <tr key={solicitud.id} style={{
                                    backgroundColor: index % 2 === 0 ? '#fafafa' : 'white',
                                    borderBottom: '1px solid #eee'
                                }}>
                                    <td style={{ padding: '12px 15px', fontWeight: 'bold' }}>#{solicitud.id}</td>
                                    <td style={{ padding: '12px 15px' }}>
                                        {solicitud.cliente_nombre || 'N/A'}
                                        {solicitud.codigo_entrega && (
                                            <span style={{
                                                display: 'block',
                                                fontSize: '0.7rem',
                                                color: '#666'
                                            }}>
                                                Código: {solicitud.codigo_entrega}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 15px' }}>
                                        {solicitud.solicitante_nombre || 'N/A'}
                                    </td>
                                    <td style={{ padding: '12px 15px', textAlign: 'right', fontWeight: 'bold' }}>
                                        RD$ {Number(solicitud.monto_solicitado).toFixed(2)}
                                    </td>
                                    <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                                        {solicitud.monto_aprobado 
                                            ? `RD$ ${Number(solicitud.monto_aprobado).toFixed(2)}` 
                                            : '-'}
                                    </td>
                                    <td style={{ padding: '12px 15px', maxWidth: '200px', wordBreak: 'break-word' }}>
                                        {solicitud.motivo || 'Sin motivo'}
                                    </td>
                                    <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                                        {getEstadoBadge(solicitud.estado)}
                                    </td>
                                    <td style={{ padding: '12px 15px', textAlign: 'center', fontSize: '0.8rem' }}>
                                        {formatearFecha(solicitud.fecha_solicitud)}
                                        {solicitud.fecha_respuesta && (
                                            <div style={{ fontSize: '0.7rem', color: '#666' }}>
                                                Respuesta: {formatearFecha(solicitud.fecha_respuesta)}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                                        {solicitud.estado === 'pendiente' && (
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                <button
                                                    onClick={() => {
                                                        const monto = prompt('Monto a aprobar:', solicitud.monto_solicitado);
                                                        if (monto) {
                                                            aprobarSolicitud(solicitud.id, parseFloat(monto));
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '6px 14px',
                                                        backgroundColor: '#4CAF50',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem'
                                                    }}
                                                >
                                                    ✅ Aprobar
                                                </button>
                                                <button
                                                    onClick={() => rechazarSolicitud(solicitud.id)}
                                                    style={{
                                                        padding: '6px 14px',
                                                        backgroundColor: '#f44336',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem'
                                                    }}
                                                >
                                                    ❌ Rechazar
                                                </button>
                                            </div>
                                        )}
                                        {solicitud.estado !== 'pendiente' && solicitud.codigo_autorizacion && (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                backgroundColor: '#f0f4f8',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                color: '#666'
                                            }}>
                                                Código: {solicitud.codigo_autorizacion}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default SolicitudesDescuento;