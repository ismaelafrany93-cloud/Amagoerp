import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Gastos() {
  const [gastos, setGastos] = useState([])
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes')
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  
  const [nuevoGasto, setNuevoGasto] = useState({
    concepto: '',
    categoria: 'otros',
    monto: 0,
    fecha: new Date().toISOString().split('T')[0],
    metodo_pago: 'efectivo',
    referencia: '',
    descripcion: ''
  })

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario?.rol)
  const sucursalId = usuario?.sucursal_id || 3

  useEffect(() => {
    if (esAdmin) {
      cargarGastos()
      cargarResumen()
    }
  }, [filtroPeriodo, filtroCategoria])

  const cargarGastos = async () => {
    setCargando(true)
    try {
      let url = `${API_URL}/gastos?sucursal_id=${sucursalId}`
      if (filtroCategoria !== 'todos') {
        url += `&categoria=${filtroCategoria}`
      }
      const response = await fetch(url)
      const data = await response.json()
      setGastos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error:', error)
      setError('Error al cargar gastos')
    } finally {
      setCargando(false)
    }
  }

  const cargarResumen = async () => {
    try {
      const response = await fetch(`${API_URL}/gastos/resumen?sucursal_id=${sucursalId}&periodo=${filtroPeriodo}`)
      const data = await response.json()
      setResumen(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const guardarGasto = async () => {
    if (!nuevoGasto.concepto || !nuevoGasto.monto) {
      setError('⚠️ Concepto y monto son requeridos')
      return
    }

    try {
      const response = await fetch(`${API_URL}/gastos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nuevoGasto,
          sucursal_id: sucursalId,
          created_by: usuario.id
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setMensaje('✅ Gasto registrado correctamente')
        setMostrarFormulario(false)
        setNuevoGasto({
          concepto: '',
          categoria: 'otros',
          monto: 0,
          fecha: new Date().toISOString().split('T')[0],
          metodo_pago: 'efectivo',
          referencia: '',
          descripcion: ''
        })
        cargarGastos()
        cargarResumen()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setError('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('❌ Error al registrar gasto')
    }
  }

  const eliminarGasto = async (id) => {
    if (!window.confirm('¿Eliminar este gasto?')) return

    try {
      const response = await fetch(`${API_URL}/gastos/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        setMensaje('✅ Gasto eliminado')
        cargarGastos()
        cargarResumen()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setError('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('❌ Error al eliminar')
    }
  }

  const formatearPrecio = (valor) => {
    return `RD$ ${Number(valor).toFixed(2)}`
  }

  const getCategoriaEmoji = (categoria) => {
    const emojis = {
      'transporte': '🚚',
      'materiales': '🔧',
      'servicios': '⚡',
      'personal': '👤',
      'administrativo': '📋',
      'otros': '📦'
    }
    return emojis[categoria] || '📦'
  }

  const getCategoriaColor = (categoria) => {
    const colores = {
      'transporte': '#FF9800',
      'materiales': '#2196F3',
      'servicios': '#4CAF50',
      'personal': '#9C27B0',
      'administrativo': '#607D8B',
      'otros': '#666'
    }
    return colores[categoria] || '#666'
  }

  if (!esAdmin) {
    return (
      <AdminLayout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>⛔ Acceso Denegado</h2>
          <p>No tienes permisos para ver este módulo</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* HEADER */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px',
          flexWrap: 'wrap',
          gap: '15px',
          background: 'linear-gradient(135deg, #2e7d32, #4CAF50)',
          padding: '20px 30px',
          borderRadius: '16px',
          color: 'white'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>💰 Gastos Operativos</h1>
            <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
              {gastos.length} gastos registrados
            </p>
          </div>
          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            style={{
              padding: '10px 24px',
              backgroundColor: mostrarFormulario ? '#ff5722' : 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid white',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 'bold'
            }}
          >
            {mostrarFormulario ? '✕ Cancelar' : '+ Nuevo Gasto'}
          </button>
        </div>

        {/* MENSAJES */}
        {mensaje && (
          <div style={{
            backgroundColor: '#e8f5e9',
            color: '#1b5e20',
            padding: '12px 20px',
            borderRadius: '10px',
            marginBottom: '15px',
            borderLeft: '4px solid #4CAF50'
          }}>
            {mensaje}
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '12px 20px',
            borderRadius: '10px',
            marginBottom: '15px',
            borderLeft: '4px solid #f44336'
          }}>
            {error}
            <button
              onClick={() => setError('')}
              style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* RESUMEN */}
        {resumen && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '18px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              textAlign: 'center',
              borderTop: '4px solid #003b6f'
            }}>
              <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>
                {filtroPeriodo === 'dia' ? '📅 Gasto Diario' :
                 filtroPeriodo === 'semana' ? '📅 Gasto Semanal' :
                 filtroPeriodo === 'mes' ? '📅 Gasto Mensual' :
                 '📅 Gasto Anual'}
              </p>
              <h2 style={{ margin: '5px 0', color: '#003b6f' }}>
                {formatearPrecio(resumen.total_gastos)}
              </h2>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>
                {resumen.total_registros} registros
              </p>
            </div>
            {resumen.por_categoria && resumen.por_categoria.map(cat => (
              <div key={cat.categoria} style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                textAlign: 'center',
                borderTop: `4px solid ${getCategoriaColor(cat.categoria)}`
              }}>
                <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>
                  {getCategoriaEmoji(cat.categoria)} {cat.categoria}
                </p>
                <h3 style={{ margin: '5px 0', color: getCategoriaColor(cat.categoria) }}>
                  {formatearPrecio(cat.total)}
                </h3>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#999' }}>
                  {cat.cantidad} gastos
                </p>
              </div>
            ))}
          </div>
        )}

        {/* FILTROS */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '15px 20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex',
          gap: '15px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div>
            <label style={{ fontWeight: '500', marginRight: '5px', color: '#555' }}>📊 Período:</label>
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }}
            >
              <option value="dia">📅 Día</option>
              <option value="semana">📅 Semana</option>
              <option value="mes">📅 Mes</option>
              <option value="ano">📅 Año</option>
            </select>
          </div>
          <div>
            <label style={{ fontWeight: '500', marginRight: '5px', color: '#555' }}>📂 Categoría:</label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }}
            >
              <option value="todos">Todos</option>
              <option value="transporte">🚚 Transporte</option>
              <option value="materiales">🔧 Materiales</option>
              <option value="servicios">⚡ Servicios</option>
              <option value="personal">👤 Personal</option>
              <option value="administrativo">📋 Administrativo</option>
              <option value="otros">📦 Otros</option>
            </select>
          </div>
          <button
            onClick={cargarGastos}
            style={{
              padding: '8px 24px',
              backgroundColor: '#003b6f',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🔄 Actualizar
          </button>
        </div>

        {/* FORMULARIO NUEVO GASTO */}
        {mostrarFormulario && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '25px',
            marginBottom: '20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, color: '#2e7d32' }}>📝 Nuevo Gasto</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '15px'
            }}>
              <input
                type="text"
                placeholder="Concepto *"
                value={nuevoGasto.concepto}
                onChange={(e) => setNuevoGasto({ ...nuevoGasto, concepto: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <select
                value={nuevoGasto.categoria}
                onChange={(e) => setNuevoGasto({ ...nuevoGasto, categoria: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              >
                <option value="transporte">🚚 Transporte</option>
                <option value="materiales">🔧 Materiales</option>
                <option value="servicios">⚡ Servicios</option>
                <option value="personal">👤 Personal</option>
                <option value="administrativo">📋 Administrativo</option>
                <option value="otros">📦 Otros</option>
              </select>
              <input
                type="number"
                placeholder="Monto *"
                value={nuevoGasto.monto || ''}
                onChange={(e) => setNuevoGasto({ ...nuevoGasto, monto: parseFloat(e.target.value) || 0 })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <input
                type="date"
                value={nuevoGasto.fecha}
                onChange={(e) => setNuevoGasto({ ...nuevoGasto, fecha: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <select
                value={nuevoGasto.metodo_pago}
                onChange={(e) => setNuevoGasto({ ...nuevoGasto, metodo_pago: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              >
                <option value="efectivo">💵 Efectivo</option>
                <option value="transferencia">🏦 Transferencia</option>
                <option value="cheque">📄 Cheque</option>
              </select>
              <input
                type="text"
                placeholder="Referencia"
                value={nuevoGasto.referencia}
                onChange={(e) => setNuevoGasto({ ...nuevoGasto, referencia: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <textarea
                placeholder="Descripción"
                value={nuevoGasto.descripcion}
                onChange={(e) => setNuevoGasto({ ...nuevoGasto, descripcion: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '60px' }}
              />
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button
                onClick={guardarGasto}
                style={{
                  padding: '12px 40px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                💾 Guardar Gasto
              </button>
              <button
                onClick={() => setMostrarFormulario(false)}
                style={{
                  padding: '12px 30px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* TABLA DE GASTOS */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          overflowX: 'auto'
        }}>
          <h3 style={{ marginTop: 0, color: '#2e7d32' }}>📋 Lista de Gastos</h3>
          
          {gastos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <p style={{ fontSize: '1.2rem' }}>📭 No hay gastos registrados</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f7fa', borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>Concepto</th>
                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>Categoría</th>
                  <th style={{ padding: '10px 15px', textAlign: 'right' }}>Monto</th>
                  <th style={{ padding: '10px 15px', textAlign: 'center' }}>Fecha</th>
                  <th style={{ padding: '10px 15px', textAlign: 'center' }}>Método</th>
                  <th style={{ padding: '10px 15px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gastos.map(g => (
                  <tr key={g.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 15px' }}>
                      <strong>{g.concepto}</strong>
                      {g.descripcion && (
                        <div style={{ fontSize: '0.7rem', color: '#999' }}>{g.descripcion}</div>
                      )}
                    </td>
                    <td style={{ padding: '10px 15px' }}>
                      <span style={{
                        backgroundColor: getCategoriaColor(g.categoria) + '20',
                        color: getCategoriaColor(g.categoria),
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.8rem'
                      }}>
                        {getCategoriaEmoji(g.categoria)} {g.categoria}
                      </span>
                    </td>
                    <td style={{ padding: '10px 15px', textAlign: 'right', fontWeight: 'bold', color: '#c62828' }}>
                      {formatearPrecio(g.monto)}
                    </td>
                    <td style={{ padding: '10px 15px', textAlign: 'center' }}>
                      {new Date(g.fecha).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 15px', textAlign: 'center' }}>
                      {g.metodo_pago}
                    </td>
                    <td style={{ padding: '10px 15px', textAlign: 'center' }}>
                      <button
                        onClick={() => eliminarGasto(g.id)}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default Gastos