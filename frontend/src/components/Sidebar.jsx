import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

function Sidebar() {
  const [colapsado, setColapsado] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const rol = usuario?.rol || ''
  const sucursalId = usuario?.sucursal_id || null
  const esSucursalPrincipal = sucursalId === 1
  const esSucursalBani = sucursalId === 2
  const esSubgerente = ['dueno', 'dueño', 'subgerente', 'admin'].includes(rol)

  const cerrarSesion = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      localStorage.removeItem('usuario')
      navigate('/')
    }
  }

  const tieneAcceso = (rolesPermitidos) => {
    return rolesPermitidos.includes(rol)
  }

  // 👇 SUBGERENTE PUEDE VER TRANSFERENCIAS
  const puedeVerTransferencias = () => {
    return esSucursalPrincipal && tieneAcceso(['vendedor', 'vendedora', 'subgerente', 'dueno', 'dueño', 'admin'])
  }

  // 👇 SUBGERENTE PUEDE VER INVENTARIO BANÍ
  const puedeVerInventarioBani = () => {
    // Subgerente, dueño, admin SIEMPRE pueden ver Inventario Baní
    return esSubgerente || esSucursalBani
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
          {usuario?.sucursal_nombre && (
            <p style={{ margin: '2px 0 0 0', fontSize: '0.65rem', opacity: 0.6 }}>🏢 {usuario.sucursal_nombre}</p>
          )}
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

        {/* ========================================== */}
        {/* MENÚ PRINCIPAL (PARA TODOS) */}
        {/* ========================================== */}

        {/* 📊 Dashboard - Subgerente, Dueño, Admin */}
        {tieneAcceso(['dueno', 'dueño', 'subgerente', 'admin']) && (
          <Link to="/dashboard" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            display: 'block', 
            textAlign: colapsado ? 'center' : 'left',
            backgroundColor: location.pathname === '/dashboard' ? 'rgba(255,255,255,0.15)' : 'transparent'
          }}>
            📊 {!colapsado && <span>Dashboard</span>}
          </Link>
        )}

        {/* 🛒 Ventas - Subgerente, Dueño, Admin, Vendedor */}
        {tieneAcceso(['vendedor', 'vendedora', 'subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/ventas" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            display: 'block', 
            textAlign: colapsado ? 'center' : 'left',
            backgroundColor: location.pathname === '/ventas' ? 'rgba(255,255,255,0.15)' : 'transparent'
          }}>
            🛒 {!colapsado && <span>Ventas</span>}
          </Link>
        )}

        {/* 📦 Productos - Subgerente, Dueño, Admin, Supervisor */}
        {tieneAcceso(['supervisor', 'subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/productos" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            display: 'block', 
            textAlign: colapsado ? 'center' : 'left',
            backgroundColor: location.pathname === '/productos' ? 'rgba(255,255,255,0.15)' : 'transparent'
          }}>
            📦 {!colapsado && <span>Productos</span>}
          </Link>
        )}

        {/* 📊 Inventario General - Subgerente, Dueño, Admin */}
        {tieneAcceso(['dueno', 'dueño', 'subgerente', 'admin']) && (
          <Link to="/inventario" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            display: 'block', 
            textAlign: colapsado ? 'center' : 'left',
            backgroundColor: location.pathname === '/inventario' ? 'rgba(255,255,255,0.15)' : 'transparent'
          }}>
            📊 {!colapsado && <span>Inventario General</span>}
          </Link>
        )}

        {/* 🏢 Inventario Baní - Subgerente, Dueño, Admin SIEMPRE lo ven */}
        {puedeVerInventarioBani() && (
          <Link to="/inventario-bani" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            display: 'block', 
            textAlign: colapsado ? 'center' : 'left',
            backgroundColor: location.pathname === '/inventario-bani' ? 'rgba(255,255,255,0.15)' : 'transparent'
          }}>
            🏢 {!colapsado && <span>Inventario Baní</span>}
          </Link>
        )}

        {/* 👤 Clientes - Subgerente, Dueño, Admin, Vendedor */}
        {tieneAcceso(['vendedor', 'vendedora', 'subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/clientes" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            display: 'block', 
            textAlign: colapsado ? 'center' : 'left',
            backgroundColor: location.pathname === '/clientes' ? 'rgba(255,255,255,0.15)' : 'transparent'
          }}>
            👤 {!colapsado && <span>Clientes</span>}
          </Link>
        )}

        {/* 🏭 Producción - Subgerente, Dueño, Admin, Supervisor */}
        {tieneAcceso(['supervisor', 'subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/produccion" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            display: 'block', 
            textAlign: colapsado ? 'center' : 'left',
            backgroundColor: location.pathname === '/produccion' ? 'rgba(255,255,255,0.15)' : 'transparent'
          }}>
            🏭 {!colapsado && <span>Producción</span>}
          </Link>
        )}

        {/* 🔧 Materiales - Subgerente, Dueño, Admin, Supervisor */}
        {tieneAcceso(['supervisor', 'subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/materiales" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            display: 'block', 
            textAlign: colapsado ? 'center' : 'left',
            backgroundColor: location.pathname === '/materiales' ? 'rgba(255,255,255,0.15)' : 'transparent'
          }}>
            🔧 {!colapsado && <span>Materiales</span>}
          </Link>
        )}

        {/* 📋 Recetas - Subgerente, Dueño, Admin, Supervisor */}
        {tieneAcceso(['supervisor', 'subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/recetas" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            display: 'block', 
            textAlign: colapsado ? 'center' : 'left',
            backgroundColor: location.pathname === '/recetas' ? 'rgba(255,255,255,0.15)' : 'transparent'
          }}>
            📋 {!colapsado && <span>Recetas</span>}
          </Link>
        )}

        {/* 🚚 Entregas - Subgerente, Dueño, Admin, Chofer */}
        {tieneAcceso(['chofer', 'subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/entregas" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            display: 'block', 
            textAlign: colapsado ? 'center' : 'left',
            backgroundColor: location.pathname === '/entregas' ? 'rgba(255,255,255,0.15)' : 'transparent'
          }}>
            🚚 {!colapsado && <span>Entregas</span>}
          </Link>
        )}

        {/* 📋 No Entregados - Subgerente, Dueño, Admin */}
        {tieneAcceso(['subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/no-entregados" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            display: 'block', 
            textAlign: colapsado ? 'center' : 'left',
            backgroundColor: location.pathname === '/no-entregados' ? 'rgba(255,255,255,0.15)' : 'transparent'
          }}>
            📋 {!colapsado && <span>No Entregados</span>}
          </Link>
        )}

        {/* 💰 Créditos - Subgerente, Dueño, Admin, Vendedor */}
        {tieneAcceso(['vendedor', 'vendedora', 'subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/creditos" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            display: 'block', 
            textAlign: colapsado ? 'center' : 'left',
            backgroundColor: location.pathname === '/creditos' ? 'rgba(255,255,255,0.15)' : 'transparent'
          }}>
            💰 {!colapsado && <span>Créditos</span>}
          </Link>
        )}

        {/* 📈 Reportes - Subgerente, Dueño, Admin */}
        {tieneAcceso(['subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/reportes" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            display: 'block', 
            textAlign: colapsado ? 'center' : 'left',
            backgroundColor: location.pathname === '/reportes' ? 'rgba(255,255,255,0.15)' : 'transparent'
          }}>
            📈 {!colapsado && <span>Reportes</span>}
          </Link>
        )}

        {/* 📜 Historial - Subgerente, Dueño, Admin */}
        {tieneAcceso(['subgerente', 'dueno', 'dueño', 'admin']) && (
          <Link to="/historial" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            display: 'block', 
            textAlign: colapsado ? 'center' : 'left',
            backgroundColor: location.pathname === '/historial' ? 'rgba(255,255,255,0.15)' : 'transparent'
          }}>
            📜 {!colapsado && <span>Historial</span>}
          </Link>
        )}

        {/* 👥 Usuarios - Subgerente, Dueño, Admin */}
        {tieneAcceso(['dueno', 'dueño', 'subgerente', 'admin']) && (
          <Link to="/usuarios" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            display: 'block', 
            textAlign: colapsado ? 'center' : 'left',
            backgroundColor: location.pathname === '/usuarios' ? 'rgba(255,255,255,0.15)' : 'transparent'
          }}>
            👥 {!colapsado && <span>Usuarios</span>}
          </Link>
        )}

        {/* 🏢 Sucursales - Subgerente, Dueño, Admin */}
        {tieneAcceso(['dueno', 'dueño', 'subgerente', 'admin']) && (
          <Link to="/sucursales" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            display: 'block', 
            textAlign: colapsado ? 'center' : 'left',
            backgroundColor: location.pathname === '/sucursales' ? 'rgba(255,255,255,0.15)' : 'transparent'
          }}>
            🏢 {!colapsado && <span>Sucursales</span>}
          </Link>
        )}

        {/* 📦 Transferencias - Subgerente, Dueño, Admin, Vendedor de Principal */}
        {puedeVerTransferencias() && (
          <Link to="/transferencias" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            display: 'block', 
            textAlign: colapsado ? 'center' : 'left',
            backgroundColor: location.pathname === '/transferencias' ? 'rgba(255,255,255,0.15)' : 'transparent'
          }}>
            📦 {!colapsado && <span>Transferencias</span>}
          </Link>
        )}

        {/* ⚙️ Configuración - TODOS */}
        <Link to="/configuracion" style={{ 
          color: 'white', 
          textDecoration: 'none', 
          padding: '8px 12px', 
          borderRadius: '6px', 
          display: 'block', 
          textAlign: colapsado ? 'center' : 'left',
          backgroundColor: location.pathname === '/configuracion' ? 'rgba(255,255,255,0.15)' : 'transparent'
        }}>
          ⚙️ {!colapsado && <span>Configuración</span>}
        </Link>

      </nav>

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
    </div>
  )
}

export default Sidebar