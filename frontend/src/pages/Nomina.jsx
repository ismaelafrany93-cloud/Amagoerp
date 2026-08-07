import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Nomina() {
  const [empleados, setEmpleados] = useState([])
  const [nominas, setNominas] = useState([])
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [filtros, setFiltros] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    sucursal_id: ''
  })
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nuevoEmpleado, setNuevoEmpleado] = useState({
    nombre: '',
    cedula: '',
    cargo: 'vendedor',
    salario_base: 0,
    comision_porcentaje: 0,
    bono_anual: 0,
    fecha_contratacion: new Date().toISOString().split('T')[0],
    sucursal_id: 3
  })

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario.rol)
  const sucursalId = usuario.sucursal_id || 3

  useEffect(() => {
    cargarDatos()
  }, [filtros])

  const cargarDatos = async () => {
    setCargando(true)
    setError('')
    try {
      // Cargar empleados
      const params = new URLSearchParams({
        sucursal_id: filtros.sucursal_id || sucursalId || 3,
        activo: true
      })
      const empResponse = await fetch(`${API_URL}/nomina/empleados?${params}`)
      const empData = await empResponse.json()
      setEmpleados(Array.isArray(empData) ? empData : [])

      // Cargar nóminas
      const nomParams = new URLSearchParams({
        mes: filtros.mes,
        ano: filtros.ano,
        sucursal_id: filtros.sucursal_id || sucursalId || 3
      })
      const nomResponse = await fetch(`${API_URL}/nomina/listar?${nomParams}`)
      const nomData = await nomResponse.json()
      setNominas(Array.isArray(nomData) ? nomData : [])

      // Cargar resumen
      const resParams = new URLSearchParams({
        mes: filtros.mes,
        ano: filtros.ano,
        sucursal_id: filtros.sucursal_id || sucursalId || 3
      })
      const resResponse = await fetch(`${API_URL}/nomina/resumen?${resParams}`)
      const resData = await resResponse.json()
      setResumen(resData.success ? resData.resumen : null)

    } catch (error) {
      console.error('Error cargando datos:', error)
      setError('Error al cargar datos de nómina')
    } finally {
      setCargando(false)
    }
  }

  const formatearPrecio = (valor) => {
    return `RD$ ${Number(valor).toFixed(2)}`
  }

  const getNombreMes = (mes) => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return meses[mes - 1] || mes
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

  if (cargando) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Cargando nómina...</h2>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h1 style={{ margin: 0 }}>💰 Gestión de Nómina</h1>
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: '#003b6f'
        }}>
          📅 {getNombreMes(filtros.mes)} {filtros.ano}
        </div>
      </div>

      {/* RESUMEN */}
      {resumen && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div style={{
            backgroundColor: '#e3f2fd',
            padding: '15px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Total Empleados</p>
            <h3 style={{ margin: '5px 0', color: '#003b6f' }}>{resumen.total_empleados}</h3>
          </div>
          <div style={{
            backgroundColor: '#e8f5e9',
            padding: '15px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Total Nómina Bruta</p>
            <h3 style={{ margin: '5px 0', color: '#1b5e20' }}>{formatearPrecio(resumen.total_bruto)}</h3>
          </div>
          <div style={{
            backgroundColor: '#f3e5f5',
            padding: '15px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Total Nómina Neta</p>
            <h3 style={{ margin: '5px 0', color: '#4a148c' }}>{formatearPrecio(resumen.total_neto)}</h3>
          </div>
          <div style={{
            backgroundColor: '#fff3e0',
            padding: '15px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Deducciones Totales</p>
            <h3 style={{ margin: '5px 0', color: '#e65100' }}>{formatearPrecio(resumen.total_deducciones)}</h3>
          </div>
          <div style={{
            backgroundColor: '#ffebee',
            padding: '15px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Estado</p>
            <h3 style={{ margin: '5px 0', color: resumen.pendientes > 0 ? '#c62828' : '#4CAF50' }}>
              {resumen.pendientes > 0 ? `${resumen.pendientes} pendientes` : '✅ Completado'}
            </h3>
          </div>
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
          <label style={{ fontWeight: '500', marginRight: '5px' }}>📅 Mes:</label>
          <select
            value={filtros.mes}
            onChange={(e) => setFiltros({ ...filtros, mes: parseInt(e.target.value) })}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
          >
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m}>{getNombreMes(m)}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontWeight: '500', marginRight: '5px' }}>📆 Año:</label>
          <select
            value={filtros.ano}
            onChange={(e) => setFiltros({ ...filtros, ano: parseInt(e.target.value) })}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
          >
            {[2024, 2025, 2026, 2027].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <button
          onClick={cargarDatos}
          style={{
            padding: '8px 20px',
            backgroundColor: '#003b6f',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🔄 Actualizar
        </button>

        {esAdmin && (
          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            style={{
              padding: '8px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            + Nuevo Empleado
          </button>
        )}
      </div>

      {/* FORMULARIO NUEVO EMPLEADO */}
      {mostrarFormulario && esAdmin && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ marginTop: 0 }}>👤 Nuevo Empleado</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            <input
              type="text"
              placeholder="Nombre completo"
              value={nuevoEmpleado.nombre}
              onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, nombre: e.target.value })}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
            />
            <input
              type="text"
              placeholder="Cédula"
              value={nuevoEmpleado.cedula}
              onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, cedula: e.target.value })}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
            />
            <select
              value={nuevoEmpleado.cargo}
              onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, cargo: e.target.value })}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
            >
              <option value="vendedor">Vendedor</option>
              <option value="operario">Operario</option>
              <option value="administrativo">Administrativo</option>
              <option value="gerente">Gerente</option>
            </select>
            <input
              type="number"
              placeholder="Salario base (RD$)"
              value={nuevoEmpleado.salario_base}
              onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, salario_base: parseFloat(e.target.value) || 0 })}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
            />
            {nuevoEmpleado.cargo.includes('vendedor') && (
              <input
                type="number"
                placeholder="% Comisión"
                value={nuevoEmpleado.comision_porcentaje}
                onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, comision_porcentaje: parseFloat(e.target.value) || 0 })}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
              />
            )}
            <input
              type="number"
              placeholder="Bono anual (RD$)"
              value={nuevoEmpleado.bono_anual}
              onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, bono_anual: parseFloat(e.target.value) || 0 })}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
            />
            <input
              type="date"
              value={nuevoEmpleado.fecha_contratacion}
              onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, fecha_contratacion: e.target.value })}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
            />
          </div>
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            <button
              onClick={async () => {
                try {
                  const response = await fetch(`${API_URL}/nomina/empleados`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...nuevoEmpleado, sucursal_id: sucursalId || 3 })
                  })
                  const data = await response.json()
                  if (data.success) {
                    alert('✅ Empleado creado correctamente')
                    setMostrarFormulario(false)
                    setNuevoEmpleado({
                      nombre: '',
                      cedula: '',
                      cargo: 'vendedor',
                      salario_base: 0,
                      comision_porcentaje: 0,
                      bono_anual: 0,
                      fecha_contratacion: new Date().toISOString().split('T')[0],
                      sucursal_id: 3
                    })
                    cargarDatos()
                  } else {
                    alert('❌ Error: ' + data.error)
                  }
                } catch (error) {
                  alert('❌ Error al crear empleado')
                }
              }}
              style={{
                padding: '10px 24px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Guardar Empleado
            </button>
            <button
              onClick={() => setMostrarFormulario(false)}
              style={{
                padding: '10px 24px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* LISTA DE EMPLEADOS */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h3 style={{ marginTop: 0, color: '#003b6f' }}>👥 Empleados</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Nombre</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Cédula</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Cargo</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Salario Base</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Comisión</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Nómina Mes</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {empleados.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    No hay empleados registrados
                  </td>
                </tr>
              ) : (
                empleados.map(emp => {
                  const nomina = nominas.find(n => n.empleado_id === emp.id)
                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>
                        <strong>{emp.nombre}</strong>
                      </td>
                      <td style={{ padding: '10px' }}>{emp.cedula}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          backgroundColor: getCargoColor(emp.cargo) + '20',
                          color: getCargoColor(emp.cargo),
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem'
                        }}>
                          {emp.cargo}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        {formatearPrecio(emp.salario_base)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        {emp.comision_porcentaje || 0}%
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                        {nomina ? formatearPrecio(nomina.total_neto) : 'Pendiente'}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        {nomina ? (
                          <span style={{
                            backgroundColor: nomina.estado === 'pagado' ? '#e8f5e9' : '#fff3e0',
                            color: nomina.estado === 'pagado' ? '#1b5e20' : '#e65100',
                            padding: '2px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem'
                          }}>
                            {nomina.estado === 'pagado' ? '✅ Pagado' : '⏳ Pendiente'}
                          </span>
                        ) : (
                          <span style={{
                            backgroundColor: '#ffebee',
                            color: '#c62828',
                            padding: '2px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem'
                          }}>
                            Sin nómina
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}

export default Nomina