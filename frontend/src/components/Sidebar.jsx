import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function Sidebar() {
  const [colapsado, setColapsado] = useState(false)
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const rol = usuario?.rol || ''

  const cerrarSesion = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      localStorage.removeItem('usuario')
      navigate('/')
    }
  }

  const tieneAcceso = (rolesPermitidos) => {
    return rolesPermitidos.includes(rol)
  }

  const sidebarWidth = colapsado ? '60px' : '220px'

  return (
    <div
      className="sidebar"
      style={{
        width: sidebarWidth,
        minHeight: '100vh',
        height: '100vh',
        background: '#003b6f',
        color: 'white',
        padding: '15px 10px',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        transition: 'width 0.3s ease'
      }}
    >
      {/* Botón hamburguesa ☰ */}
      <div style={{
        display: 'flex',
        justifyContent: colapsado ? 'center' : 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: '12px'
      }}>
        <button
          onClick={() => setColapsado(!colapsado)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer'
          }}
        >
          ☰
        </button>
        {!colapsado && <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>AMAGO</span>}
      </div>

      {/* Usuario */}
      {!colapsado && (
        <div style={{ marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>{usuario?.nombre || 'Usuario'}</p>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.65rem', opacity: 0.6 }}>Rol: {rol}</p>
        </div>
      )}

      {/* Menú */}
      <nav style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '3px',
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingRight: '5px'
      }}>
        {/* 📊 Dashboard - Dueño, Subgerente */}
        {tieneAcceso(['dueno', 'dueño', 'subgerente', 'admin']) && (
          <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left' }}>
            📊 {!colapsado && <span>Dashboard</span>}
          </Link>
        )}

        {/* 🛒 Ventas - Vendedor, Subgerente, Dueño */}
        {tieneAcceso(['vendedor', 'vendedora', 'subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/ventas" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left' }}>
            🛒 {!colapsado && <span>Ventas</span>}
          </Link>
        )}

        {/* 📦 Productos - Supervisor, Subgerente, Dueño */}
        {tieneAcceso(['supervisor', 'subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/productos" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left' }}>
            📦 {!colapsado && <span>Productos</span>}
          </Link>
        )}

        {/* 📊 Inventario - Vendedor, Supervisor, Subgerente, Dueño */}
        {tieneAcceso(['vendedor', 'vendedora', 'supervisor', 'subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/inventario" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left' }}>
            📊 {!colapsado && <span>Inventario</span>}
          </Link>
        )}

        {/* 👤 Clientes - Vendedor, Subgerente, Dueño */}
        {tieneAcceso(['vendedor', 'vendedora', 'subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/clientes" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left' }}>
            👤 {!colapsado && <span>Clientes</span>}
          </Link>
        )}

        {/* 🏭 Producción - Supervisor, Subgerente, Dueño */}
        {tieneAcceso(['supervisor', 'subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/produccion" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left' }}>
            🏭 {!colapsado && <span>Producción</span>}
          </Link>
        )}

        {/* 🔧 Materiales - Supervisor, Subgerente, Dueño */}
        {tieneAcceso(['supervisor', 'subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/materiales" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left' }}>
            🔧 {!colapsado && <span>Materiales</span>}
          </Link>
        )}

        {/* 📋 Recetas - Supervisor, Subgerente, Dueño */}
        {tieneAcceso(['supervisor', 'subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/recetas" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left' }}>
            📋 {!colapsado && <span>Recetas</span>}
          </Link>
        )}

        {/* 🚚 Entregas - Chofer, Subgerente, Dueño */}
        {tieneAcceso(['chofer', 'subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/entregas" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left' }}>
            🚚 {!colapsado && <span>Entregas</span>}
          </Link>
        )}

        {/* 📋 No Entregados - Subgerente, Dueño */}
        {tieneAcceso(['subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/no-entregados" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left' }}>
            📋 {!colapsado && <span>No Entregados</span>}
          </Link>
        )}

        {/* 💰 Créditos - Vendedor, Subgerente, Dueño */}
        {tieneAcceso(['vendedor', 'vendedora', 'subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/creditos" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left' }}>
            💰 {!colapsado && <span>Créditos</span>}
          </Link>
        )}

        {/* 📈 Reportes - Subgerente, Dueño */}
        {tieneAcceso(['subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/reportes" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left' }}>
            📈 {!colapsado && <span>Reportes</span>}
          </Link>
        )}

        {/* 📜 Historial - Subgerente, Dueño */}
        {tieneAcceso(['subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/historial" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left' }}>
            📜 {!colapsado && <span>Historial</span>}
          </Link>
        )}

        {/* 👥 Usuarios - Dueño, Subgerente */}
        {tieneAcceso(['dueno', 'dueño', 'subgerente', 'admin']) && (
          <Link to="/usuarios" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left' }}>
            👥 {!colapsado && <span>Usuarios</span>}
          </Link>
        )}

        {/* 🏢 Sucursales - Dueño, Subgerente */}
        {tieneAcceso(['dueno', 'dueño', 'subgerente', 'admin']) && (
          <Link to="/sucursales" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left' }}>
            🏢 {!colapsado && <span>Sucursales</span>}
          </Link>
        )}

        {/* 📦 Transferencias - Vendedor, Subgerente, Dueño */}
        {tieneAcceso(['vendedor', 'vendedora', 'subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/transferencias" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left' }}>
            📦 {!colapsado && <span>Transferencias</span>}
          </Link>
        )}

        {/* ⚙️ Configuración - TODOS lo ven */}
        <Link to="/configuracion" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left' }}>
          ⚙️ {!colapsado && <span>Configuración</span>}
        </Link>

        {/* Botón Cerrar Sesión */}
        <button
          onClick={cerrarSesion}
          style={{
            marginTop: '15px',
            padding: '10px',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '6px',
            backgroundColor: 'rgba(244, 67, 54, 0.15)',
            color: '#ff8a80',
            width: '100%',
            fontSize: colapsado ? '1.2rem' : '0.85rem',
            display: 'flex',
            justifyContent: colapsado ? 'center' : 'flex-start',
            gap: colapsado ? 0 : '8px',
            alignItems: 'center'
          }}
        >
          🚪 {!colapsado && <span>Cerrar sesión</span>}
        </button>
      </nav>
    </div>
  )
}

export default Sidebar