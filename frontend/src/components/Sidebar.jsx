import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

function Sidebar() {
  const [colapsado, setColapsado] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const rol = usuario?.rol || ''
  
  const sucursalId = usuario?.sucursal_id || null
  const sucursalNombre = usuario?.sucursal || usuario?.sucursal_nombre || ''
  
  const esSucursalPrincipal = sucursalId === 3 || 
                              sucursalNombre === 'Sucursal Principal' || 
                              sucursalNombre === 'Principal'
  
  const esSucursalBani = sucursalId === 1 || 
                         sucursalNombre === 'Sucursal Baní' || 
                         sucursalNombre === 'Bani' || 
                         sucursalNombre === 'Baní'
  
  const esSucursalSabana = sucursalId === 2 || 
                           sucursalNombre === 'Sucursal Sabana' || 
                           sucursalNombre === 'Sabana'
  
  const esSubgerente = ['dueno', 'dueño', 'subgerente', 'admin'].includes(rol)
  const esVendedor = ['vendedor', 'vendedora'].includes(rol)
  const esChofer = rol === 'chofer'
  const esSupervisor = rol === 'supervisor'

  const esVendedorPrincipal = esVendedor && (esSucursalPrincipal || sucursalId === null)

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

      {!colapsado && (
        <div style={{ marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>{usuario?.nombre || 'Usuario'}</p>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.65rem', opacity: 0.6 }}>Rol: {rol}</p>
          {sucursalNombre && (
            <p style={{ margin: '2px 0 0 0', fontSize: '0.65rem', opacity: 0.6 }}>🏢 {sucursalNombre}</p>
          )}
          {!sucursalNombre && esVendedor && (
            <p style={{ margin: '2px 0 0 0', fontSize: '0.65rem', opacity: 0.6, color: '#ff8a80' }}>⚠️ Sin sucursal asignada</p>
          )}
        </div>
      )}

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
        {/* MENÚ PARA SUBGERENTE/DUEÑO */}
        {/* ========================================== */}
        {esSubgerente && (
          <>
            <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/dashboard' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>📊 {!colapsado && <span>Dashboard</span>}</Link>
            <Link to="/ventas" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/ventas' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>🛒 {!colapsado && <span>Ventas</span>}</Link>
            <Link to="/productos" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/productos' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>📦 {!colapsado && <span>Productos</span>}</Link>
            <Link to="/inventario" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/inventario' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>📊 {!colapsado && <span>Inventario General</span>}</Link>
            <Link to="/inventario-bani" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/inventario-bani' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>🏢 {!colapsado && <span>Inventario Baní</span>}</Link>
            <Link to="/inventario-sabana" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/inventario-sabana' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>🏢 {!colapsado && <span>Inventario Sabana</span>}</Link>
            <Link to="/clientes" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/clientes' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>👤 {!colapsado && <span>Clientes</span>}</Link>
            <Link to="/produccion" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/produccion' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>🏭 {!colapsado && <span>Producción</span>}</Link>
            <Link to="/materiales" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/materiales' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>🔧 {!colapsado && <span>Materiales</span>}</Link>
            <Link to="/recetas" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/recetas' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>📋 {!colapsado && <span>Recetas</span>}</Link>
            <Link to="/entregas" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/entregas' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>🚚 {!colapsado && <span>Entregas</span>}</Link>
            <Link to="/no-entregados" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/no-entregados' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>📋 {!colapsado && <span>No Entregados</span>}</Link>
            <Link to="/creditos" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/creditos' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>💰 {!colapsado && <span>Créditos</span>}</Link>
            <Link to="/reportes" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/reportes' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>📈 {!colapsado && <span>Reportes</span>}</Link>
            
            {/* 👇 HISTORIAL - Subgerente ve TODO */}
            <Link to="/historial" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/historial' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>📜 {!colapsado && <span>Historial</span>}</Link>
            
            <Link to="/usuarios" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/usuarios' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>👥 {!colapsado && <span>Usuarios</span>}</Link>
            <Link to="/sucursales" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/sucursales' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>🏢 {!colapsado && <span>Sucursales</span>}</Link>
            <Link to="/transferencias" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/transferencias' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>📦 {!colapsado && <span>Transferencias</span>}</Link>
            <Link to="/configuracion" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/configuracion' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>⚙️ {!colapsado && <span>Configuración</span>}</Link>
          </>
        )}

        {/* ========================================== */}
        {/* MENÚ PARA VENDEDOR */}
        {/* ========================================== */}
        {esVendedor && (
          <>
            <Link to="/ventas" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/ventas' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>🛒 {!colapsado && <span>Ventas</span>}</Link>

            {esVendedorPrincipal && (
              <Link to="/inventario" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/inventario' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>📊 {!colapsado && <span>Inventario</span>}</Link>
            )}
            {esSucursalBani && (
              <Link to="/inventario-bani" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/inventario-bani' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>📊 {!colapsado && <span>Inventario Baní</span>}</Link>
            )}
            {esSucursalSabana && (
              <Link to="/inventario-sabana" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/inventario-sabana' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>📊 {!colapsado && <span>Inventario Sabana</span>}</Link>
            )}

            <Link to="/clientes" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/clientes' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>👤 {!colapsado && <span>Clientes</span>}</Link>
            <Link to="/creditos" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/creditos' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>💰 {!colapsado && <span>Créditos</span>}</Link>

            {/* 👇 HISTORIAL - Vendedores ven sus propias ventas */}
            <Link to="/historial" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/historial' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>📜 {!colapsado && <span>Historial</span>}</Link>

            {esVendedorPrincipal && (
              <Link to="/transferencias" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/transferencias' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>📦 {!colapsado && <span>Transferencias</span>}</Link>
            )}

            <Link to="/configuracion" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/configuracion' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>⚙️ {!colapsado && <span>Configuración</span>}</Link>
          </>
        )}

        {/* ========================================== */}
        {/* MENÚ PARA CHOFER */}
        {/* ========================================== */}
        {esChofer && (
          <>
            <Link to="/entregas" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/entregas' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>🚚 {!colapsado && <span>Entregas</span>}</Link>
            <Link to="/configuracion" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/configuracion' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>⚙️ {!colapsado && <span>Configuración</span>}</Link>
          </>
        )}

        {/* ========================================== */}
        {/* MENÚ PARA SUPERVISOR */}
        {/* ========================================== */}
        {esSupervisor && (
          <>
            <Link to="/produccion" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/produccion' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>🏭 {!colapsado && <span>Producción</span>}</Link>
            <Link to="/materiales" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/materiales' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>🔧 {!colapsado && <span>Materiales</span>}</Link>
            <Link to="/recetas" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/recetas' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>📋 {!colapsado && <span>Recetas</span>}</Link>
            <Link to="/configuracion" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', display: 'block', textAlign: colapsado ? 'center' : 'left', backgroundColor: location.pathname === '/configuracion' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>⚙️ {!colapsado && <span>Configuración</span>}</Link>
          </>
        )}
      </nav>

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