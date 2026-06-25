import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API_URL from '../config'

function Login() {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password })
      })

      const data = await response.json()

      if (data.success) {
        localStorage.setItem('usuario', JSON.stringify(data.user))
        if (data.user.rol === 'vendedor' || data.user.rol === 'vendedora') {
          navigate('/ventas')
        } else if (data.user.rol === 'chofer') {
          navigate('/entregas')
        } else if (data.user.rol === 'supervisor') {
          navigate('/produccion')
        } else {
          navigate('/dashboard')
        }
      } else {
        setError(data.message || 'Credenciales incorrectas')
      }
    } catch (error) {
      setError('Error de conexión con el servidor')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{
      backgroundColor: '#0a0a0a',
      backgroundImage: 'radial-gradient(circle at 25% 50%, rgba(0, 70, 140, 0.3) 0%, rgba(0,0,0,0.95) 100%)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: 0,
      padding: '20px',
      fontFamily: "'Segoe UI', 'Roboto', 'Inter', sans-serif"
    }}>
      <div style={{
        display: 'flex',
        width: '920px',
        maxWidth: '95%',
        backgroundColor: 'white',
        borderRadius: '28px',
        overflow: 'hidden',
        boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.6)',
      }}>
        <div style={{
          flex: 1.1,
          background: 'linear-gradient(145deg, #003b6f 0%, #002a50 40%, #001a33 100%)',
          color: 'white',
          padding: '50px 35px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-30%',
            right: '-30%',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 100, 200, 0.15) 0%, transparent 70%)',
          }} />
          
          <div style={{ fontSize: '42px', marginBottom: '5px' }}>🏭</div>
          
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '900',
            margin: 0,
            letterSpacing: '-1px',
            background: 'linear-gradient(135deg, #ffffff 0%, #8cb8e0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: '1.1'
          }}>
            AMAGO
          </h1>
          
          <p style={{
            fontSize: '0.85rem',
            fontWeight: '300',
            color: '#8cb8e0',
            margin: '2px 0 0 0',
            letterSpacing: '3px',
            opacity: 0.9
          }}>
            MUEBLES · COCINAS · CLOSETS
          </p>

          <div style={{
            height: '3px',
            width: '40px',
            background: 'linear-gradient(90deg, #4a90d9, transparent)',
            margin: '15px 0 5px 0',
            borderRadius: '3px'
          }} />
          
          <p style={{
            fontSize: '0.55rem',
            fontWeight: '300',
            color: '#6a9fc9',
            margin: '5px 0 0 0',
            letterSpacing: '4px',
            opacity: 0.7
          }}>
            AMAGO MUEBLES
          </p>
          
          <div style={{
            height: '1px',
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            margin: '25px 0 25px 0'
          }} />
          
          <div style={{ marginTop: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>📦</div>
              <div>
                <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>Control de Inventario</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Gestión en tiempo real</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>🏭</div>
              <div>
                <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>Gestión de Producción</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Registro por operario</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>🚚</div>
              <div>
                <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>Seguimiento de Entregas</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Choferes y facturas</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>💰</div>
              <div>
                <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>Ventas y Créditos</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Clientes y abonos</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          flex: 1,
          backgroundColor: 'white',
          padding: '50px 45px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              color: '#003b6f',
              fontSize: '1.85rem',
              fontWeight: '700',
              marginBottom: '10px',
              letterSpacing: '-0.5px'
            }}>
              ¡Bienvenido!
            </h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '24px',
              fontSize: '0.875rem',
              borderLeft: '4px solid #dc2626'
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#374151',
                fontWeight: '500',
                fontSize: '0.875rem'
              }}>
                Correo Electrónico
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  fontSize: '18px'
                }}>📧</span>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '13px 13px 13px 45px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '14px',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s',
                    outline: 'none',
                    backgroundColor: '#f9fafb',
                    color: '#1f2937'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#003b6f'
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 59, 111, 0.1)'
                    e.target.style.backgroundColor = 'white'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb'
                    e.target.style.boxShadow = 'none'
                    e.target.style.backgroundColor = '#f9fafb'
                  }}
                  placeholder="usuario@amago.com"
                />
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#374151',
                fontWeight: '500',
                fontSize: '0.875rem'
              }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  fontSize: '18px'
                }}>🔒</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '13px 13px 13px 45px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '14px',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s',
                    outline: 'none',
                    backgroundColor: '#f9fafb',
                    color: '#1f2937'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#003b6f'
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 59, 111, 0.1)'
                    e.target.style.backgroundColor = 'white'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb'
                    e.target.style.boxShadow = 'none'
                    e.target.style.backgroundColor = '#f9fafb'
                  }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #003b6f 0%, #002a50 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                opacity: cargando ? 0.7 : 1,
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(0, 59, 111, 0.3)'
              }}
            >
              {cargando ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => alert('🔐 Contacta al administrador o subgerente para reiniciar tu contraseña')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#003b6f',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '8px 16px',
                  fontWeight: '500'
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>

          <div style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '0.65rem',
            color: '#9ca3af',
            borderTop: '1px solid #f0f0f0',
            paddingTop: '20px'
          }}>
            <p>AMAGO MUEBLES v1.0 | Sistema de Gestión Empresarial</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login