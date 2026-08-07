import { useState, useEffect } from 'react'

function Nomina() {
  const [empleados, setEmpleados] = useState([])
  const [nominas, setNominas] = useState([])
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [mostrarDetalle, setMostrarDetalle] = useState(null)
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1)
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear())
  
  // Formulario nuevo empleado
  const [nuevoEmpleado, setNuevoEmpleado] = useState({
    nombre: '',
    cedula: '',
    email: '',
    telefono: '',
    direccion: '',
    cargo: 'vendedor',
    salario_base: 0,
    comision_porcentaje: 0,
    bono_anual: 0,
    fecha_contratacion: new Date().toISOString().split('T')[0]
  })

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const sucursalId = usuario?.sucursal_id || 3
  const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario?.rol)

  useEffect(() => {
    cargarDatos()
  }, [filtroMes, filtroAno])

  const cargarDatos = async () => {
    setCargando(true)
    setError('')
    try {
      // Cargar empleados
      const empResponse = await fetch(`${API_URL}/nomina/empleados?sucursal_id=${sucursalId}`)
      const empData = await empResponse.json()
      setEmpleados(Array.isArray(empData) ? empData : [])

      // Cargar nóminas
      const nomResponse = await fetch(
        `${API_URL}/nomina/listar?mes=${filtroMes}&ano=${filtroAno}&sucursal_id=${sucursalId}`
      )
      const nomData = await nomResponse.json()
      setNominas(Array.isArray(nomData) ? nomData : [])

      // Cargar resumen
      const resResponse = await fetch(
        `${API_URL}/nomina/resumen?mes=${filtroMes}&ano=${filtroAno}&sucursal_id=${sucursalId}`
      )
      const resData = await resResponse.json()
      setResumen(resData.success ? resData.resumen : null)
    } catch (error) {
      console.error('Error cargando datos:', error)
      setError('Error al cargar datos')
    } finally {
      setCargando(false)
    }
  }

  const formatearPrecio = (valor) => {
    return `RD$ ${Number(valor).toFixed(2)}`
  }

  const getCargoColor = (cargo) => {
    const colores = {
      'vendedor': '#4CAF50',
      'vendedora': '#4CAF50',
      'operario': '#2196F3',
      'administrativo': '#FF9800',
      'gerente': '#9C27B0'
    }
    return colores[cargo] || '#666'
  }

  const getCargoEmoji = (cargo) => {
    const emojis = {
      'vendedor': '🛒',
      'vendedora': '🛒',
      'operario': '🔧',
      'administrativo': '📋',
      'gerente': '👔'
    }
    return emojis[cargo] || '👤'
  }

  const getEstadoColor = (estado) => {
    const colores = {
      'pagado': '#4CAF50',
      'pendiente': '#FF9800',
      'anulado': '#f44336'
    }
    return colores[estado] || '#666'
  }

  const getEstadoEmoji = (estado) => {
    const emojis = {
      'pagado': '✅',
      'pendiente': '⏳',
      'anulado': '❌'
    }
    return emojis[estado] || '❓'
  }

  // Guardar nuevo empleado
  const guardarEmpleado = async () => {
    if (!nuevoEmpleado.nombre || !nuevoEmpleado.cedula) {
      setError('⚠️ Nombre y cédula son requeridos')
      return
    }

    try {
      const response = await fetch(`${API_URL}/nomina/empleados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nuevoEmpleado,
          sucursal_id: sucursalId
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setMensaje('✅ Empleado creado correctamente')
        setMostrarFormulario(false)
        setNuevoEmpleado({
          nombre: '',
          cedula: '',
          email: '',
          telefono: '',
          direccion: '',
          cargo: 'vendedor',
          salario_base: 0,
          comision_porcentaje: 0,
          bono_anual: 0,
          fecha_contratacion: new Date().toISOString().split('T')[0]
        })
        cargarDatos()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setError('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('❌ Error al crear empleado')
    }
  }

  // Calcular nómina de un empleado
  const calcularNomina = async (empleadoId) => {
    try {
      const response = await fetch(
        `${API_URL}/nomina/calcular?empleado_id=${empleadoId}&mes=${filtroMes}&ano=${filtroAno}`
      )
      const data = await response.json()
      return data.success ? data : null
    } catch (error) {
      console.error('Error:', error)
      return null
    }
  }

  // Generar nómina
  const generarNomina = async (empleadoId) => {
    if (!window.confirm('¿Generar nómina para este empleado?')) return

    try {
      const response = await fetch(`${API_URL}/nomina/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleado_id: empleadoId,
          mes: filtroMes,
          ano: filtroAno
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMensaje('✅ Nómina generada correctamente')
        cargarDatos()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setError('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('❌ Error al generar nómina')
    }
  }

  // Pagar nómina
  const pagarNomina = async (nominaId) => {
    if (!window.confirm('¿Marcar esta nómina como pagada?')) return

    try {
      const response = await fetch(`${API_URL}/nomina/pagar/${nominaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metodo_pago: 'efectivo',
          fecha_pago: new Date().toISOString().split('T')[0]
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMensaje('✅ Nómina pagada correctamente')
        cargarDatos()
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setError('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('❌ Error al pagar nómina')
    }
  }

  // Obtener nómina de un empleado
  const getNominaEmpleado = (empleadoId) => {
    return nominas.find(n => n.empleado_id === empleadoId)
  }

  const getNombreMes = (mes) => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return meses[mes - 1] || mes
  }

  if (cargando) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #e3f2fd',
          borderTop: '4px solid #003b6f',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <h2 style={{ color: '#003b6f' }}>Cargando nómina...</h2>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
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
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>💰 Gestión de Nómina</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
            {getNombreMes(filtroMes)} {filtroAno} · {empleados.length} empleados
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.85rem'
          }}>
            🏢 {usuario?.sucursal || 'Principal'}
          </div>
          {esAdmin && (
            <button
              onClick={() => setMostrarFormulario(!mostrarFormulario)}
              style={{
                padding: '10px 24px',
                backgroundColor: mostrarFormulario ? '#ff5722' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
            >
              {mostrarFormulario ? '✕ Cancelar' : '+ Nuevo Empleado'}
            </button>
          )}
        </div>
      </div>

      {/* MENSAJES */}
      {mensaje && (
        <div style={{
          backgroundColor: '#e8f5e9',
          color: '#1b5e20',
          padding: '14px 20px',
          borderRadius: '10px',
          marginBottom: '15px',
          borderLeft: '4px solid #4CAF50',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{mensaje}</span>
          <button
            onClick={() => setMensaje('')}
            style={{
              background: 'none',
              border: 'none',
              color: '#1b5e20',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '14px 20px',
          borderRadius: '10px',
          marginBottom: '15px',
          borderLeft: '4px solid #f44336',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            style={{
              background: 'none',
              border: 'none',
              color: '#c62828',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            ✕
          </button>
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
          <label style={{ fontWeight: '500', marginRight: '5px', color: '#555' }}>📅 Mes:</label>
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(parseInt(e.target.value))}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }}
          >
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m}>{getNombreMes(m)}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontWeight: '500', marginRight: '5px', color: '#555' }}>📆 Año:</label>
          <select
            value={filtroAno}
            onChange={(e) => setFiltroAno(parseInt(e.target.value))}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }}
          >
            {[2024, 2025, 2026, 2027].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <button
          onClick={cargarDatos}
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

      {/* FORMULARIO NUEVO EMPLEADO */}
      {mostrarFormulario && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '25px',
          marginBottom: '25px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>👤 Nuevo Empleado</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '15px'
          }}>
            <input
              type="text"
              placeholder="Nombre completo *"
              value={nuevoEmpleado.nombre}
              onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, nombre: e.target.value })}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
            <input
              type="text"
              placeholder="Cédula *"
              value={nuevoEmpleado.cedula}
              onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, cedula: e.target.value })}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
            <input
              type="email"
              placeholder="Email"
              value={nuevoEmpleado.email}
              onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, email: e.target.value })}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
            <input
              type="text"
              placeholder="Teléfono"
              value={nuevoEmpleado.telefono}
              onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, telefono: e.target.value })}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
            <input
              type="text"
              placeholder="Dirección"
              value={nuevoEmpleado.direccion}
              onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, direccion: e.target.value })}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
            <select
              value={nuevoEmpleado.cargo}
              onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, cargo: e.target.value })}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            >
              <option value="vendedor">🛒 Vendedor</option>
              <option value="operario">🔧 Operario</option>
              <option value="administrativo">📋 Administrativo</option>
              <option value="gerente">👔 Gerente</option>
            </select>
            <input
              type="number"
              placeholder="Salario base (RD$)"
              value={nuevoEmpleado.salario_base || ''}
              onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, salario_base: parseFloat(e.target.value) || 0 })}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
            {nuevoEmpleado.cargo.includes('vendedor') && (
              <input
                type="number"
                placeholder="% Comisión"
                value={nuevoEmpleado.comision_porcentaje || ''}
                onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, comision_porcentaje: parseFloat(e.target.value) || 0 })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
            )}
            <input
              type="number"
              placeholder="Bono anual (RD$)"
              value={nuevoEmpleado.bono_anual || ''}
              onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, bono_anual: parseFloat(e.target.value) || 0 })}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
            <input
              type="date"
              value={nuevoEmpleado.fecha_contratacion}
              onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, fecha_contratacion: e.target.value })}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
          </div>
          <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
            <button
              onClick={guardarEmpleado}
              style={{
                padding: '12px 40px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.95rem'
              }}
            >
              💾 Guardar Empleado
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

      {/* RESUMEN - TARJETAS */}
      {resumen && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '15px',
          marginBottom: '25px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '18px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            textAlign: 'center',
            borderTop: '4px solid #003b6f'
          }}>
            <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Total Empleados</p>
            <h2 style={{ margin: '5px 0', color: '#003b6f' }}>{resumen.total_empleados}</h2>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '18px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            textAlign: 'center',
            borderTop: '4px solid #4CAF50'
          }}>
            <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Total Nómina Bruta</p>
            <h2 style={{ margin: '5px 0', color: '#1b5e20' }}>{formatearPrecio(resumen.total_bruto)}</h2>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '18px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            textAlign: 'center',
            borderTop: '4px solid #9C27B0'
          }}>
            <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Total Nómina Neta</p>
            <h2 style={{ margin: '5px 0', color: '#4a148c' }}>{formatearPrecio(resumen.total_neto)}</h2>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '18px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            textAlign: 'center',
            borderTop: '4px solid #FF9800' 
          }}>
            <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Estado</p>
            <h2 style={{ margin: '5px 0', color: resumen.pendientes > 0 ? '#e65100' : '#4CAF50' }}>
              {resumen.pendientes > 0 ? `${resumen.pendientes} Pendientes` : '✅ Completado'}
            </h2>
          </div>
        </div>
      )}

      {/* TABLA DE EMPLEADOS */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
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
          <h3 style={{ margin: 0, color: '#003b6f' }}>👥 Empleados</h3>
          <span style={{
            backgroundColor: '#e3f2fd',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            color: '#003b6f'
          }}>
            {empleados.length} empleados activos
          </span>
        </div>

        {empleados.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#999'
          }}>
            <p style={{ fontSize: '1.2rem' }}>📭 No hay empleados registrados</p>
            <p>Haz clic en "+ Nuevo Empleado" para comenzar</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f7fa', borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#555' }}>Empleado</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#555' }}>Cargo</th>
                <th style={{ padding: '12px 15px', textAlign: 'right', fontWeight: '600', color: '#555' }}>Salario Base</th>
                <th style={{ padding: '12px 15px', textAlign: 'right', fontWeight: '600', color: '#555' }}>Comisión</th>
                <th style={{ padding: '12px 15px', textAlign: 'right', fontWeight: '600', color: '#555' }}>Total Bruto</th>
                <th style={{ padding: '12px 15px', textAlign: 'right', fontWeight: '600', color: '#555' }}>Total Neto</th>
                <th style={{ padding: '12px 15px', textAlign: 'center', fontWeight: '600', color: '#555' }}>Estado</th>
                <th style={{ padding: '12px 15px', textAlign: 'center', fontWeight: '600', color: '#555' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map(emp => {
                const nomina = getNominaEmpleado(emp.id)
                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #f0f0f0', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 15px' }}>
                      <div>
                        <strong>{emp.nombre}</strong>
                        <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '2px' }}>
                          📧 {emp.email || 'Sin email'} · 📱 {emp.telefono || 'Sin teléfono'}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      <span style={{
                        backgroundColor: getCargoColor(emp.cargo) + '20',
                        color: getCargoColor(emp.cargo),
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '500'
                      }}>
                        {getCargoEmoji(emp.cargo)} {emp.cargo.charAt(0).toUpperCase() + emp.cargo.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                      <strong>{formatearPrecio(emp.salario_base)}</strong>
                    </td>
                    <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                      {emp.comision_porcentaje || 0}%
                    </td>
                    <td style={{ padding: '12px 15px', textAlign: 'right', color: '#003b6f', fontWeight: 'bold' }}>
                      {nomina ? formatearPrecio(nomina.total_bruto) : 'Pendiente'}
                    </td>
                    <td style={{ padding: '12px 15px', textAlign: 'right', color: '#4CAF50', fontWeight: 'bold' }}>
                      {nomina ? formatearPrecio(nomina.total_neto) : 'Pendiente'}
                    </td>
                    <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                      {nomina ? (
                        <span style={{
                          backgroundColor: getEstadoColor(nomina.estado) + '20',
                          color: getEstadoColor(nomina.estado),
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {getEstadoEmoji(nomina.estado)} {nomina.estado.charAt(0).toUpperCase() + nomina.estado.slice(1)}
                        </span>
                      ) : (
                        <span style={{
                          backgroundColor: '#ffebee',
                          color: '#c62828',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.75rem'
                        }}>
                          ⏳ Sin nómina
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {!nomina && esAdmin && (
                          <button
                            onClick={() => generarNomina(emp.id)}
                            style={{
                              padding: '4px 12px',
                              backgroundColor: '#FF9800',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                            title="Generar nómina"
                          >
                            📄 Generar
                          </button>
                        )}
                        {nomina && nomina.estado === 'pendiente' && esAdmin && (
                          <button
                            onClick={() => pagarNomina(nomina.id)}
                            style={{
                              padding: '4px 12px',
                              backgroundColor: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                            title="Pagar nómina"
                          >
                            💰 Pagar
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            const data = await calcularNomina(emp.id)
                            if (data) {
                              alert(
                                `📊 Detalle de Nómina - ${emp.nombre}\n\n` +
                                `💰 Salario Base: ${formatearPrecio(data.ingresos.salario_base)}\n` +
                                `📈 Comisiones: ${formatearPrecio(data.ingresos.comisiones)}\n` +
                                `🎁 Bonos: ${formatearPrecio(data.ingresos.bonos)}\n` +
                                `━━━━━━━━━━━━━━━━━━━\n` +
                                `📊 Total Bruto: ${formatearPrecio(data.totales.bruto)}\n` +
                                `📉 Deducciones: ${formatearPrecio(data.deducciones.total)}\n` +
                                `✅ Total Neto: ${formatearPrecio(data.totales.neto)}`
                              )
                            }
                          }}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#003b6f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                          title="Ver detalle"
                        >
                          📊 Ver
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

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
          © {new Date().getFullYear()} Sistema de Nómina · Total de empleados: {empleados.length} · 
          Nóminas generadas: {nominas.filter(n => n.estado === 'pagado').length} pagadas, 
          {nominas.filter(n => n.estado === 'pendiente').length} pendientes
        </p>
      </div>
    </div>
  )
}

export default Nomina