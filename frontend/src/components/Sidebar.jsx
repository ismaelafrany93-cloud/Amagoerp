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

  // Función para manejar clic en enlace - colapsa el sidebar
  const handleLinkClick = () => {
    setColapsado(true)
  }

  // Función para alternar el sidebar (expandir/colapsar)
  const toggleSidebar = () => {
    setColapsado(!colapsado)
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
        overflowX: 'hidden',
        transition: 'width 0.3s ease',
        boxShadow: '2px 0 10px rgba(0,0,0,0.2)'
      }}
    >
      {/* BOTÓN TOGGLE - Siempre visible */}
      <div style={{
        display: 'flex',
        justifyContent: colapsado ? 'center' : 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: '12px'
      }}>
        <button
          onClick={toggleSidebar}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '5px 8px',
            borderRadius: '4px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title={colapsado ? 'Expandir menú' : 'Colapsar menú'}
        >
          ☰
        </button>
        {!colapsado && <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>AMAGO</span>}
      </div>

      {/* INFO USUARIO - Solo visible cuando está expandido */}
      {!colapsado && (
        <div style={{ 
          marginBottom: '15px', 
          borderBottom: '1px solid rgba(255,255,255,0.08)', 
          paddingBottom: '10px', 
          flexShrink: 0 
        }}>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold' }}>
            {usuario?.nombre || 'Usuario'}
          </p>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.65rem', opacity: 0.6 }}>
            Rol: {rol}
          </p>
          {sucursalNombre && (
            <p style={{ margin: '2px 0 0 0', fontSize: '0.65rem', opacity: 0.6 }}>
              🏢 {sucursalNombre}
            </p>
          )}
          {!sucursalNombre && esVendedor && (
            <p style={{ margin: '2px 0 0 0', fontSize: '0.65rem', opacity: 0.6, color: '#ff8a80' }}>
              ⚠️ Sin sucursal asignada
            </p>
          )}
        </div>
      )}

      {/* MENÚ DE NAVEGACIÓN */}
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
            <Link 
              to="/dashboard" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/dashboard' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Dashboard' : ''}
            >
              <span>📊</span>
              {!colapsado && <span>Dashboard</span>}
            </Link>
            
            <Link 
              to="/empleados" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/empleados' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Empleados' : ''}
            >
              <span>👥</span>
              {!colapsado && <span>Empleados</span>}
            </Link>
            
            <Link 
              to="/nomina" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/nomina' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Nómina' : ''}
            >
              <span>💰</span>
              {!colapsado && <span>Nómina</span>}
            </Link>
            
            <Link 
              to="/ventas" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/ventas' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Ventas' : ''}
            >
              <span>🛒</span>
              {!colapsado && <span>Ventas</span>}
            </Link>
            
            <Link 
              to="/productos" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/productos' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Productos' : ''}
            >
              <span>📦</span>
              {!colapsado && <span>Productos</span>}
            </Link>
            
            <Link 
              to="/inventario" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/inventario' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Inventario' : ''}
            >
              <span>📊</span>
              {!colapsado && <span>Inventario</span>}
            </Link>
            
            <Link 
              to="/inventario-bani" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/inventario-bani' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Inventario Baní' : ''}
            >
              <span>🏢</span>
              {!colapsado && <span>Inventario Baní</span>}
            </Link>
            
            <Link 
              to="/inventario-sabana" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/inventario-sabana' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Inventario Sabana' : ''}
            >
              <span>🏢</span>
              {!colapsado && <span>Inventario Sabana</span>}
            </Link>
            
            <Link 
              to="/clientes" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/clientes' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Clientes' : ''}
            >
              <span>👤</span>
              {!colapsado && <span>Clientes</span>}
            </Link>
            
            <Link 
              to="/produccion" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/produccion' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Producción' : ''}
            >
              <span>🏭</span>
              {!colapsado && <span>Producción</span>}
            </Link>
            
            <Link 
              to="/materiales" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/materiales' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Materiales' : ''}
            >
              <span>🔧</span>
              {!colapsado && <span>Materiales</span>}
            </Link>
            
            <Link 
              to="/recetas" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/recetas' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Recetas' : ''}
            >
              <span>📋</span>
              {!colapsado && <span>Recetas</span>}
            </Link>
            
            <Link 
              to="/entregas" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/entregas' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Entregas' : ''}
            >
              <span>🚚</span>
              {!colapsado && <span>Entregas</span>}
            </Link>
            
            <Link 
              to="/no-entregados" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/no-entregados' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'No Entregados' : ''}
            >
              <span>📋</span>
              {!colapsado && <span>No Entregados</span>}
            </Link>
            
            <Link 
              to="/creditos" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/creditos' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Créditos' : ''}
            >
              <span>💰</span>
              {!colapsado && <span>Créditos</span>}
            </Link>
            
            <Link 
              to="/reportes" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/reportes' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Reportes' : ''}
            >
              <span>📈</span>
              {!colapsado && <span>Reportes</span>}
            </Link>
            
            <Link 
              to="/historial" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/historial' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Historial' : ''}
            >
              <span>📜</span>
              {!colapsado && <span>Historial</span>}
            </Link>

            <Link 
  to="/pedidos" 
  onClick={handleLinkClick}
  style={{ 
    color: 'white', 
    textDecoration: 'none', 
    padding: '8px 12px', 
    borderRadius: '6px', 
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    justifyContent: colapsado ? 'center' : 'flex-start',
    backgroundColor: location.pathname === '/pedidos' ? 'rgba(255,255,255,0.15)' : 'transparent',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    fontSize: colapsado ? '1.2rem' : '0.9rem'
  }}
  title={colapsado ? 'Pedidos' : ''}
>
  <span>📋</span>
  {!colapsado && <span>Pedidos</span>}
</Link>
            
            <Link 
              to="/cambios" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/cambios' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Cambios' : ''}
            >
              <span>🔄</span>
              {!colapsado && <span>Cambios</span>}
            </Link>
            
            <Link 
              to="/usuarios" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/usuarios' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Usuarios' : ''}
            >
              <span>👥</span>
              {!colapsado && <span>Usuarios</span>}
            </Link>
            
            <Link 
              to="/sucursales" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/sucursales' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Sucursales' : ''}
            >
              <span>🏢</span>
              {!colapsado && <span>Sucursales</span>}
            </Link>
            
            <Link 
              to="/transferencias" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/transferencias' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Transferencias' : ''}
            >
              <span>📦</span>
              {!colapsado && <span>Transferencias</span>}
            </Link>

            {/* ========================================== */}
            {/* 👇 NUEVOS MÓDULOS CONTABLES */}
            {/* ========================================== */}
            <Link 
              to="/cuentas-pagar" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/cuentas-pagar' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Cuentas por Pagar' : ''}
            >
              <span>📋</span>
              {!colapsado && <span>Cuentas por Pagar</span>}
            </Link>

            <Link 
              to="/gastos" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/gastos' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Gastos' : ''}
            >
              <span>💰</span>
              {!colapsado && <span>Gastos</span>}
            </Link>

            <Link 
              to="/costos-productos" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/costos-productos' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Costos Productos' : ''}
            >
              <span>📊</span>
              {!colapsado && <span>Costos Productos</span>}
            </Link>
            
            <Link 
              to="/configuracion" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/configuracion' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Configuración' : ''}
            >
              <span>⚙️</span>
              {!colapsado && <span>Configuración</span>}
            </Link>
          </>
        )}

        {/* ========================================== */}
        {/* MENÚ PARA VENDEDOR */}
        {/* ========================================== */}
        {esVendedor && (
          <>
            <Link 
              to="/ventas" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/ventas' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Ventas' : ''}
            >
              <span>🛒</span>
              {!colapsado && <span>Ventas</span>}
            </Link>

            {esVendedorPrincipal && (
              <Link 
                to="/inventario" 
                onClick={handleLinkClick}
                style={{ 
                  color: 'white', 
                  textDecoration: 'none', 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  justifyContent: colapsado ? 'center' : 'flex-start',
                  backgroundColor: location.pathname === '/inventario' ? 'rgba(255,255,255,0.15)' : 'transparent',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  fontSize: colapsado ? '1.2rem' : '0.9rem'
                }}
                title={colapsado ? 'Inventario' : ''}
              >
                <span>📊</span>
                {!colapsado && <span>Inventario</span>}
              </Link>
            )}
            
            {esSucursalBani && (
              <Link 
                to="/inventario-bani" 
                onClick={handleLinkClick}
                style={{ 
                  color: 'white', 
                  textDecoration: 'none', 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  justifyContent: colapsado ? 'center' : 'flex-start',
                  backgroundColor: location.pathname === '/inventario-bani' ? 'rgba(255,255,255,0.15)' : 'transparent',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  fontSize: colapsado ? '1.2rem' : '0.9rem'
                }}
                title={colapsado ? 'Inventario Baní' : ''}
              >
                <span>📊</span>
                {!colapsado && <span>Inventario Baní</span>}
              </Link>
            )}
            
            {esSucursalSabana && (
              <Link 
                to="/inventario-sabana" 
                onClick={handleLinkClick}
                style={{ 
                  color: 'white', 
                  textDecoration: 'none', 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  justifyContent: colapsado ? 'center' : 'flex-start',
                  backgroundColor: location.pathname === '/inventario-sabana' ? 'rgba(255,255,255,0.15)' : 'transparent',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  fontSize: colapsado ? '1.2rem' : '0.9rem'
                }}
                title={colapsado ? 'Inventario Sabana' : ''}
              >
                <span>📊</span>
                {!colapsado && <span>Inventario Sabana</span>}
              </Link>
            )}

            <Link 
              to="/clientes" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/clientes' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Clientes' : ''}
            >
              <span>👤</span>
              {!colapsado && <span>Clientes</span>}
            </Link>
            
            <Link 
              to="/creditos" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/creditos' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Créditos' : ''}
            >
              <span>💰</span>
              {!colapsado && <span>Créditos</span>}
            </Link>
            
            <Link 
              to="/historial" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/historial' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Historial' : ''}
            >
              <span>📜</span>
              {!colapsado && <span>Historial</span>}
            </Link>
            
            <Link 
              to="/cambios" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/cambios' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Cambios' : ''}
            >
              <span>🔄</span>
              {!colapsado && <span>Cambios</span>}
            </Link>

            {esVendedorPrincipal && (
              <Link 
                to="/transferencias" 
                onClick={handleLinkClick}
                style={{ 
                  color: 'white', 
                  textDecoration: 'none', 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  justifyContent: colapsado ? 'center' : 'flex-start',
                  backgroundColor: location.pathname === '/transferencias' ? 'rgba(255,255,255,0.15)' : 'transparent',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  fontSize: colapsado ? '1.2rem' : '0.9rem'
                }}
                title={colapsado ? 'Transferencias' : ''}
              >
                <span>📦</span>
                {!colapsado && <span>Transferencias</span>}
              </Link>
            )}

            <Link 
              to="/configuracion" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/configuracion' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Configuración' : ''}
            >
              <span>⚙️</span>
              {!colapsado && <span>Configuración</span>}
            </Link>
          </>
        )}

        {/* ========================================== */}
        {/* MENÚ PARA CHOFER */}
        {/* ========================================== */}
        {esChofer && (
          <>
            <Link 
              to="/entregas" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/entregas' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Entregas' : ''}
            >
              <span>🚚</span>
              {!colapsado && <span>Entregas</span>}
            </Link>
            
            <Link 
              to="/configuracion" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/configuracion' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Configuración' : ''}
            >
              <span>⚙️</span>
              {!colapsado && <span>Configuración</span>}
            </Link>
          </>
        )}

        {/* ========================================== */}
        {/* MENÚ PARA SUPERVISOR */}
        {/* ========================================== */}
        {esSupervisor && (
          <>
            <Link 
              to="/produccion" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/produccion' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Producción' : ''}
            >
              <span>🏭</span>
              {!colapsado && <span>Producción</span>}
            </Link>
            
            <Link 
              to="/materiales" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/materiales' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Materiales' : ''}
            >
              <span>🔧</span>
              {!colapsado && <span>Materiales</span>}
            </Link>
            
            <Link 
              to="/recetas" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/recetas' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Recetas' : ''}
            >
              <span>📋</span>
              {!colapsado && <span>Recetas</span>}
            </Link>
            
            <Link 
              to="/configuracion" 
              onClick={handleLinkClick}
              style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: colapsado ? 'center' : 'flex-start',
                backgroundColor: location.pathname === '/configuracion' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontSize: colapsado ? '1.2rem' : '0.9rem'
              }}
              title={colapsado ? 'Configuración' : ''}
            >
              <span>⚙️</span>
              {!colapsado && <span>Configuración</span>}
            </Link>
          </>
        )}
      </nav>

      {/* BOTÓN CERRAR SESIÓN */}
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
          alignItems: 'center',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(244, 67, 54, 0.3)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(244, 67, 54, 0.15)'}
        title={colapsado ? 'Cerrar sesión' : ''}
      >
        🚪 {!colapsado && <span>Cerrar sesión</span>}
      </button>
    </div>
  )
}

export default Sidebar