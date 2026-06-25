import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'

function Configuracion() {
  const [usuario, setUsuario] = useState(null)
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('usuario') || '{}')
    if (!user.id) {
      navigate('/')
    } else {
      setUsuario(user)
    }
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setExito('')

    if (nueva.length < 4) {
      setError('La nueva contraseña debe tener al menos 4 caracteres')
      return
    }

    if (nueva !== confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }

    setCargando(true)

    try {
      const response = await fetch(`${API_URL}/auth/cambiar-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuario.id,
          actual,
          nueva
        })
      })

      const data = await response.json()

      if (data.success) {
        setExito('✅ Contraseña actualizada correctamente')
        setActual('')
        setNueva('')
        setConfirmar('')
      } else {
        setError(data.message || 'Error al cambiar contraseña')
      }
    } catch (error) {
      console.error('Error cambiando contraseña:', error)
      setError('Error de conexión con el servidor')
    } finally {
      setCargando(false)
    }
  }

  if (!usuario) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>Cargando...</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <h1>⚙️ Configuración</h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '30px',
        maxWidth: '900px'
      }}>
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          backgroundColor: '#f9fafb'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>👤 Mi Perfil</h3>
          <p><strong>Nombre:</strong> {usuario.nombre}</p>
          <p><strong>Correo:</strong> {usuario.correo || 'No disponible'}</p>
          <p><strong>Rol:</strong> <span style={{
            backgroundColor: '#003b6f',
            color: 'white',
            padding: '2px 12px',
            borderRadius: '20px',
            fontSize: '0.8rem'
          }}>
            {usuario.rol || 'Usuario'}
          </span></p>
          {usuario.sucursal && <p><strong>Sucursal:</strong> {usuario.sucursal}</p>}
        </div>

        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          backgroundColor: 'white'
        }}>
          <h3 style={{ marginTop: 0, color: '#003b6f' }}>🔑 Cambiar Contraseña</h3>

          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.85rem'
            }}>
              ⚠️ {error}
            </div>
          )}

          {exito && (
            <div style={{
              backgroundColor: '#f0fdf4',
              color: '#16a34a',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.85rem'
            }}>
              {exito}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Contraseña Actual</label>
              <input
                type="password"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                placeholder="••••••••"
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Nueva Contraseña</label>
              <input
                type="password"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                placeholder="•••••••• (mínimo 4 caracteres)"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Confirmar Contraseña</label>
              <input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#003b6f',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              {cargando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}

export default Configuracion