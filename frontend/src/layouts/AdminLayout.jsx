import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

function AdminLayout({ children }) {
  const navigate = useNavigate()

  const cerrarSesion = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      localStorage.removeItem('usuario')
      navigate('/')
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f7fb' }}>
      <Sidebar />
      <div
        className="admin-content"
        style={{
          marginLeft: '220px',
          flex: 1,
          padding: '20px',
          backgroundColor: '#f5f7fb',
          minHeight: '100vh',
          maxHeight: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        {/* 👇 BARRA SUPERIOR CON CERRAR SESIÓN (visible en móviles) */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '10px 0',
          marginBottom: '20px',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: 'white',
          borderRadius: '8px',
          paddingLeft: '20px',
          paddingRight: '20px'
        }}>
          <button
            onClick={cerrarSesion}
            style={{
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            🚪 Cerrar Sesión
          </button>
        </div>

        {/* Contenido de la página */}
        {children}
      </div>
    </div>
  )
}

export default AdminLayout