import { useState, useEffect } from 'react'

function Empleados() {
  const [usuarios, setUsuarios] = useState([])
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null)
  const [actividad, setActividad] = useState([])
  const [estadisticas, setEstadisticas] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [tipoVista, setTipoVista] = useState('dia')
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0])
  const [semanaSeleccionada, setSemanaSeleccionada] = useState(1)
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1)
  const [anoSeleccionado, setAnoSeleccionado] = useState(new Date().getFullYear())
  const [filtroRol, setFiltroRol] = useState('todos')

  const API_URL = 'https://amagoerp-backend.onrender.com'
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const sucursalId = usuario?.sucursal_id || 3
  const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario?.rol)

  // Cargar usuarios al inicio
  useEffect(() => {
    if (esAdmin) {
      cargarUsuarios()
    }
  }, [])

  // Cargar actividad cuando cambia el usuario o la fecha
  useEffect(() => {
    if (usuarioSeleccionado) {
      cargarActividad()
      cargarEstadisticas()
    }
  }, [usuarioSeleccionado, tipoVista, fechaSeleccionada, semanaSeleccionada, mesSeleccionado, anoSeleccionado])

  const cargarUsuarios = async () => {
    setCargando(true)
    try {
      const response = await fetch(`${API_URL}/usuarios?sucursal_id=${sucursalId}`)
      const data = await response.json()
      setUsuarios(Array.isArray(data) ? data : [])
      
      if (data.length > 0) {
        setUsuarioSeleccionado(data[0])
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      setError('Error al cargar usuarios')
    } finally {
      setCargando(false)
    }
  }

  // ============================================
  // FUNCIÓN CARGAR ACTIVIDAD - CORREGIDA
  // ============================================
  const cargarActividad = async () => {
    if (!usuarioSeleccionado) return
    
    setCargando(true)
    setError('')
    try {
      // ✅ CORREGIDO: usar la ruta correcta actividad-usuario
      let url = `${API_URL}/empleados/actividad-usuario/${usuarioSeleccionado.id}?tipo=${tipoVista}`
      
      if (tipoVista === 'dia') {
        url += `&fecha=${fechaSeleccionada}`
      } else if (tipoVista === 'semana') {
        url += `&semana=${semanaSeleccionada}&mes=${mesSeleccionado}&ano=${anoSeleccionado}`
      } else if (tipoVista === 'mes') {
        url += `&mes=${mesSeleccionado}&ano=${anoSeleccionado}`
      }
      
      console.log('📡 URL de actividad:', url) // 👈 Log para depurar
      
      const response = await fetch(url)
      
      // Verificar si la respuesta es OK
      if (!response.ok) {
        const text = await response.text()
        console.error('❌ Respuesta error:', text)
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('📊 Datos de actividad:', data) // 👈 Log para depurar
      
      setActividad(data.success ? data.data : [])
    } catch (error) {
      console.error('❌ Error cargando actividad:', error)
      setError('Error al cargar actividad: ' + error.message)
    } finally {
      setCargando(false)
    }
  }

  const cargarEstadisticas = async () => {
    if (!usuarioSeleccionado) return
    
    try {
      const url = `${API_URL}/empleados/estadisticas/${usuarioSeleccionado.id}?mes=${mesSeleccionado}&ano=${anoSeleccionado}`
      console.log('📡 URL de estadísticas:', url)
      
      const response = await fetch(url)
      const data = await response.json()
      setEstadisticas(data.success ? data.estadisticas : null)
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    }
  }

  const getNombreMes = (mes) => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return meses[mes - 1] || mes
  }

  const getRolEmoji = (rol) => {
    const emojis = {
      'vendedor': '🛒',
      'vendedora': '🛒',
      'operario': '🔧',
      'administrativo': '📋',
      'gerente': '👔',
      'admin': '🛡️',
      'dueño': '👑',
      'subgerente': '📊',
      'chofer': '🚚',
      'supervisor': '📋'
    }
    return emojis[rol] || '👤'
  }

  const getRolColor = (rol) => {
    const colores = {
      'vendedor': '#4CAF50',
      'vendedora': '#4CAF50',
      'operario': '#2196F3',
      'administrativo': '#FF9800',
      'gerente': '#9C27B0',
      'admin': '#f44336',
      'dueño': '#f44336',
      'subgerente': '#003b6f',
      'chofer': '#795548',
      'supervisor': '#607D8B'
    }
    return colores[rol] || '#666'
  }

  // Filtrar usuarios por rol
  const usuariosFiltrados = filtroRol === 'todos' 
    ? usuarios 
    : usuarios.filter(u => u.rol === filtroRol)

  // Obtener días de la semana
  const getDiasSemana = (semana, mes, ano) => {
    const dias = []
    const primerDia = new Date(ano, mes - 1, 1)
    const diaInicio = (semana - 1) * 7 + 1
    const diaFin = Math.min(semana * 7, new Date(ano, mes, 0).getDate())
    
    for (let d = diaInicio; d <= diaFin; d++) {
      dias.push(d)
    }
    return dias
  }

  const diasSemana = getDiasSemana(semanaSeleccionada, mesSeleccionado, anoSeleccionado)

  if (!esAdmin) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>⛔ Acceso Denegado</h2>
        <p>No tienes permisos para ver este módulo</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '25px',
        flexWrap: 'wrap',
        gap: '15px',
        background: 'linear-gradient(135deg, #003b6f, #005a9c)',
        padding: '20px 30px',
        borderRadius: '16px',
        color: 'white'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>👥 Gestión de Empleados</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
            {usuarios.length} empleados · {usuarioSeleccionado?.nombre || 'Sin seleccionar'}
          </p>
        </div>
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.15)',
          padding: '6px 16px',
          borderRadius: '8px',
          fontSize: '0.85rem'
        }}>
          🏢 {usuario?.sucursal || 'Principal'}
        </div>
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
            style={{
              marginLeft: '10px',
              background: 'none',
              border: 'none',
              color: '#c62828',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* FILTROS Y SELECCIÓN */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          alignItems: 'center'
        }}>
          {/* Seleccionar Usuario */}
          <div>
            <label style={{ fontWeight: '500', color: '#555', display: 'block', marginBottom: '4px' }}>
              👤 Usuario
            </label>
            <select
              value={usuarioSeleccionado?.id || ''}
              onChange={(e) => {
                const user = usuarios.find(u => u.id === parseInt(e.target.value))
                setUsuarioSeleccionado(user)
              }}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '0.95rem'
              }}
            >
              {usuariosFiltrados.map(user => (
                <option key={user.id} value={user.id}>
                  {getRolEmoji(user.rol)} {user.nombre} - {user.rol}
                </option>
              ))}
            </select>
          </div>

          {/* Filtrar por Rol */}
          <div>
            <label style={{ fontWeight: '500', color: '#555', display: 'block', marginBottom: '4px' }}>
              📋 Filtrar por Rol
            </label>
            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '0.95rem'
              }}
            >
              <option value="todos">Todos los roles</option>
              <option value="vendedor">🛒 Vendedores</option>
              <option value="operario">🔧 Operarios</option>
              <option value="administrativo">📋 Administrativos</option>
              <option value="gerente">👔 Gerentes</option>
              <option value="subgerente">📊 Subgerentes</option>
              <option value="chofer">🚚 Choferes</option>
              <option value="supervisor">📋 Supervisores</option>
            </select>
          </div>

          {/* Tipo de Vista */}
          <div>
            <label style={{ fontWeight: '500', color: '#555', display: 'block', marginBottom: '4px' }}>
              📊 Vista
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setTipoVista('dia')}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: tipoVista === 'dia' ? '#003b6f' : '#e0e0e0',
                  color: tipoVista === 'dia' ? 'white' : '#555',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                Día
              </button>
              <button
                onClick={() => setTipoVista('semana')}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: tipoVista === 'semana' ? '#003b6f' : '#e0e0e0',
                  color: tipoVista === 'semana' ? 'white' : '#555',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                Semana
              </button>
              <button
                onClick={() => setTipoVista('mes')}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: tipoVista === 'mes' ? '#003b6f' : '#e0e0e0',
                  color: tipoVista === 'mes' ? 'white' : '#555',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                Mes
              </button>
            </div>
          </div>

          {/* Selector de Fecha - Día */}
          {tipoVista === 'dia' && (
            <div>
              <label style={{ fontWeight: '500', color: '#555', display: 'block', marginBottom: '4px' }}>
                📅 Fecha
              </label>
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          )}

          {/* Selector de Fecha - Semana */}
          {tipoVista === 'semana' && (
            <>
              <div>
                <label style={{ fontWeight: '500', color: '#555', display: 'block', marginBottom: '4px' }}>
                  📅 Semana
                </label>
                <select
                  value={semanaSeleccionada}
                  onChange={(e) => setSemanaSeleccionada(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '0.95rem'
                  }}
                >
                  {[1,2,3,4].map(s => (
                    <option key={s} value={s}>Semana {s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontWeight: '500', color: '#555', display: 'block', marginBottom: '4px' }}>
                  📅 Mes
                </label>
                <select
                  value={mesSeleccionado}
                  onChange={(e) => setMesSeleccionado(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '0.95rem'
                  }}
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <option key={m} value={m}>{getNombreMes(m)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontWeight: '500', color: '#555', display: 'block', marginBottom: '4px' }}>
                  📅 Año
                </label>
                <select
                  value={anoSeleccionado}
                  onChange={(e) => setAnoSeleccionado(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '0.95rem'
                  }}
                >
                  {[2024, 2025, 2026, 2027].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Selector de Fecha - Mes */}
          {tipoVista === 'mes' && (
            <>
              <div>
                <label style={{ fontWeight: '500', color: '#555', display: 'block', marginBottom: '4px' }}>
                  📅 Mes
                </label>
                <select
                  value={mesSeleccionado}
                  onChange={(e) => setMesSeleccionado(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '0.95rem'
                  }}
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <option key={m} value={m}>{getNombreMes(m)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontWeight: '500', color: '#555', display: 'block', marginBottom: '4px' }}>
                  📅 Año
                </label>
                <select
                  value={anoSeleccionado}
                  onChange={(e) => setAnoSeleccionado(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '0.95rem'
                  }}
                >
                  {[2024, 2025, 2026, 2027].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* INFORMACIÓN DEL USUARIO SELECCIONADO */}
      {usuarioSeleccionado && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '30px',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#003b6f' }}>
              {getRolEmoji(usuarioSeleccionado.rol)} {usuarioSeleccionado.nombre}
            </h2>
            <p style={{ margin: '5px 0 0 0', color: '#666' }}>
              {usuarioSeleccionado.rol.toUpperCase()} · 📧 {usuarioSeleccionado.email || 'Sin email'}
            </p>
          </div>
          <div style={{
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
            marginLeft: 'auto'
          }}>
            <div style={{
              backgroundColor: '#e3f2fd',
              padding: '8px 16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.7rem', color: '#666' }}>ID</div>
              <div style={{ fontWeight: 'bold' }}>#{usuarioSeleccionado.id}</div>
            </div>
            <div style={{
              backgroundColor: '#e8f5e9',
              padding: '8px 16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.7rem', color: '#666' }}>Sucursal</div>
              <div style={{ fontWeight: 'bold', color: '#1b5e20' }}>
                {usuarioSeleccionado.sucursal_nombre || 'Principal'}
              </div>
            </div>
            <div style={{
              backgroundColor: '#fff3e0',
              padding: '8px 16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.7rem', color: '#666' }}>Rol</div>
              <div style={{ fontWeight: 'bold', color: '#e65100' }}>
                {usuarioSeleccionado.rol}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABLA DE ACTIVIDAD - VISTA EXCEL */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        overflowX: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <h3 style={{ margin: 0, color: '#003b6f' }}>
            📊 Actividad {usuarioSeleccionado && `de ${usuarioSeleccionado.nombre}`}
          </h3>
          <span style={{
            backgroundColor: '#e3f2fd',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            color: '#003b6f'
          }}>
            {tipoVista === 'dia' ? `📅 ${fechaSeleccionada}` :
             tipoVista === 'semana' ? `📅 Semana ${semanaSeleccionada} - ${getNombreMes(mesSeleccionado)} ${anoSeleccionado}` :
             `📅 ${getNombreMes(mesSeleccionado)} ${anoSeleccionado}`}
          </span>
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e3f2fd',
              borderTop: '4px solid #003b6f',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }} />
            <p style={{ marginTop: '15px', color: '#666' }}>Cargando actividad...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : actividad.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#999'
          }}>
            <p style={{ fontSize: '1.2rem' }}>📭 No hay actividad registrada</p>
            <p>El usuario no tiene registros en este período</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.9rem',
              fontFamily: 'Calibri, Arial, sans-serif'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#003b6f',
                  color: 'white'
                }}>
                  {Object.keys(actividad[0] || {}).map(columna => (
                    <th key={columna} style={{
                      padding: '10px 15px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #003b6f',
                      whiteSpace: 'nowrap'
                    }}>
                      {columna.replace(/_/g, ' ').toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actividad.map((fila, index) => (
                  <tr key={index} style={{
                    backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                    borderBottom: '1px solid #e0e0e0'
                  }}>
                    {Object.values(fila).map((valor, i) => (
                      <td key={i} style={{
                        padding: '8px 15px',
                        border: '1px solid #e0e0e0',
                        whiteSpace: 'nowrap'
                      }}>
                        {typeof valor === 'number' ? Number(valor).toFixed(2) : valor || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ESTADÍSTICAS */}
      {estadisticas && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '15px',
          marginTop: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '18px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            textAlign: 'center',
            borderTop: '4px solid #003b6f'
          }}>
            <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Total Registros</p>
            <h2 style={{ margin: '5px 0', color: '#003b6f' }}>{estadisticas.total_registros || 0}</h2>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '18px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            textAlign: 'center',
            borderTop: '4px solid #4CAF50'
          }}>
            <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Total Ventas</p>
            <h2 style={{ margin: '5px 0', color: '#1b5e20' }}>{estadisticas.total_ventas || 0}</h2>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '18px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            textAlign: 'center',
            borderTop: '4px solid #FF9800'
          }}>
            <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Total Producción</p>
            <h2 style={{ margin: '5px 0', color: '#e65100' }}>{estadisticas.total_produccion || 0}</h2>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '18px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            textAlign: 'center',
            borderTop: '4px solid #9C27B0'
          }}>
            <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Total Monto</p>
            <h2 style={{ margin: '5px 0', color: '#4a148c' }}>
              RD$ {Number(estadisticas.total_monto || 0).toFixed(2)}
            </h2>
          </div>
        </div>
      )}

      {/* PIE DE PÁGINA */}
      <div style={{
        marginTop: '30px',
        padding: '15px 20px',
        backgroundColor: '#f5f7fa',
        borderRadius: '12px',
        textAlign: 'center',
        color: '#666',
        fontSize: '0.8rem'
      }}>
        <p style={{ margin: 0 }}>
          © {new Date().getFullYear()} Sistema de Gestión · {usuarios.length} usuarios · 
          Vista: {tipoVista === 'dia' ? 'Diaria' : tipoVista === 'semana' ? 'Semanal' : 'Mensual'}
        </p>
      </div>
    </div>
  )
}

export default Empleados