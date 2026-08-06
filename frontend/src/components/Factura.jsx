import React, { forwardRef } from 'react'

const Factura = forwardRef(({ 
  venta, 
  cliente, 
  carrito, 
  total, 
  tipoVenta, 
  tipoEntrega, 
  codigoEntrega,
  vendedor,
  formato = 'A4',
  sucursalNombre = 'Sucursal Principal',
  sucursalId = 3
}, ref) => {
  const fecha = new Date().toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // 👇 DETECTAR SI ES SABANA PARA CAMBIAR EL NOMBRE
  const esSabana = sucursalId === 2 || 
                   (sucursalNombre && sucursalNombre.toLowerCase().includes('sabana'));
  
  const nombreEmpresa = esSabana ? 'Lizhomedecore' : 'AMAGO MUEBLES';
  const nombreCorto = esSabana ? 'LIZHOMEDECORE' : 'AMAGO';
  const eslogan = esSabana ? 'Decoración · Diseño · Estilo' : 'Muebles · Cocinas · Closets';

  const tipoPagoTexto = tipoVenta === 'credito' ? 'Crédito' : 'Contado'
  const tipoEntregaTexto = tipoEntrega === 'domicilio' ? 'Entrega a domicilio' : 'Retiro en tienda'

  const isPOS = formato === 'POS80'
  
  const styles = {
    container: {
      width: isPOS ? '80mm' : '210mm',
      minHeight: isPOS ? 'auto' : '297mm',
      padding: isPOS ? '8px' : '20px',
      fontFamily: isPOS ? "'Courier New', monospace" : 'Arial, sans-serif',
      fontSize: isPOS ? '10px' : '14px',
      backgroundColor: 'white',
      color: 'black',
      margin: '0 auto',
      boxShadow: isPOS ? 'none' : '0 0 10px rgba(0,0,0,0.1)'
    },
    header: {
      textAlign: 'center',
      borderBottom: isPOS ? '1px dashed #003b6f' : '3px solid #003b6f',
      paddingBottom: isPOS ? '5px' : '15px',
      marginBottom: isPOS ? '5px' : '15px'
    },
    title: {
      margin: 0,
      fontSize: isPOS ? '16px' : '28px',
      color: '#003b6f',
      fontWeight: 'bold'
    },
    codigoContainer: {
      margin: isPOS ? '5px 0 8px 0' : '10px 0 15px 0',
      backgroundColor: '#e3f2fd',
      border: isPOS ? '1px solid #003b6f' : '2px solid #003b6f',
      borderRadius: isPOS ? '4px' : '8px',
      padding: isPOS ? '8px' : '15px',
      textAlign: 'center'
    },
    codigoTexto: {
      margin: isPOS ? '2px 0 0 0' : '5px 0 0 0',
      fontSize: isPOS ? '18px' : '32px',
      fontWeight: 'bold',
      color: '#003b6f',
      letterSpacing: isPOS ? '2px' : '4px'
    },
    sucursalNombre: {
      margin: '2px 0',
      fontSize: isPOS ? '8px' : '12px',
      color: '#555'
    }
  }

  return (
    <div ref={ref} style={styles.container}>
      {/* Encabezado */}
      <div style={styles.header}>
        <h1 style={styles.title}>🏭 {nombreEmpresa}</h1>
        {!isPOS && <p style={{ margin: '5px 0', fontSize: '14px' }}>{eslogan}</p>}
        <p style={styles.sucursalNombre}>{sucursalNombre}</p>
        <p style={{ margin: isPOS ? '2px 0' : '2px 0', fontSize: isPOS ? '8px' : '12px', color: '#555' }}>
          Tel: 809-555-0000 | Santo Domingo, R.D.
        </p>
        {!isPOS && <p style={{ margin: '2px 0', fontSize: '12px', color: '#555' }}>www.{nombreCorto.toLowerCase()}.com</p>}
      </div>

      {/* Código de entrega */}
      {codigoEntrega && codigoEntrega !== 'null' && (
        <div style={styles.codigoContainer}>
          <p style={{ margin: 0, fontSize: isPOS ? '8px' : '14px', color: '#003b6f' }}>
            🔑 <strong>CÓDIGO DE ENTREGA</strong>
          </p>
          <p style={styles.codigoTexto}>{codigoEntrega}</p>
          {!isPOS && (
            <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#555' }}>
              Presente este código al chofer para la entrega
            </p>
          )}
        </div>
      )}

      {/* Información de la venta */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isPOS ? '1fr' : '1fr 1fr', 
        gap: isPOS ? '3px' : '10px', 
        marginBottom: isPOS ? '5px' : '15px', 
        fontSize: isPOS ? '9px' : '13px' 
      }}>
        <div>
          <p style={{ margin: isPOS ? '1px 0' : '4px 0' }}>
            <strong>Factura:</strong> #{venta?.id || 'N/A'}
          </p>
          <p style={{ margin: isPOS ? '1px 0' : '4px 0' }}>
            <strong>Fecha:</strong> {fecha}
          </p>
          <p style={{ margin: isPOS ? '1px 0' : '4px 0' }}>
            <strong>Vendedor:</strong> {vendedor || 'N/A'}
          </p>
        </div>
        <div style={{ textAlign: isPOS ? 'left' : 'right' }}>
          <p style={{ margin: isPOS ? '1px 0' : '4px 0' }}>
            <strong>Tipo:</strong> {tipoPagoTexto}
          </p>
          <p style={{ margin: isPOS ? '1px 0' : '4px 0' }}>
            <strong>Entrega:</strong> {tipoEntregaTexto}
          </p>
        </div>
      </div>

      {tipoVenta === 'credito' && (
        <div style={{ 
          backgroundColor: '#ffebee', 
          padding: isPOS ? '4px' : '10px', 
          borderRadius: '4px',
          marginBottom: isPOS ? '5px' : '15px',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, color: '#c62828', fontWeight: 'bold', fontSize: isPOS ? '9px' : '14px' }}>
            ⚠️ PENDIENTE DE PAGO
          </p>
        </div>
      )}

      {/* Cliente */}
      <div style={{
        border: '1px solid #ddd',
        borderRadius: isPOS ? '2px' : '4px',
        padding: isPOS ? '6px' : '12px',
        marginBottom: isPOS ? '8px' : '15px',
        backgroundColor: '#f9f9f9',
        fontSize: isPOS ? '9px' : '13px'
      }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: isPOS ? '9px' : '14px', color: '#003b6f' }}>
          {isPOS ? 'CLIENTE' : '👤 DATOS DEL CLIENTE'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: isPOS ? '1fr' : '1fr 1fr', gap: isPOS ? '1px' : '5px', fontSize: isPOS ? '9px' : '13px' }}>
          <p style={{ margin: isPOS ? '1px 0' : '2px 0' }}>
            <strong>Nombre:</strong> {cliente?.nombre || 'N/A'}
          </p>
          <p style={{ margin: isPOS ? '1px 0' : '2px 0' }}>
            <strong>Teléfono:</strong> {cliente?.telefono || 'N/A'}
          </p>
          <p style={{ margin: isPOS ? '1px 0' : '2px 0', gridColumn: isPOS ? '1 / -1' : '1 / -1' }}>
            <strong>Dirección:</strong> {cliente?.direccion || 'N/A'}
          </p>
          {cliente?.referencia && (
            <p style={{ margin: isPOS ? '1px 0' : '2px 0', gridColumn: '1 / -1' }}>
              <strong>Referencia:</strong> {cliente.referencia}
            </p>
          )}
        </div>
      </div>

      {/* Productos */}
      <h3 style={{ margin: '0 0 4px 0', fontSize: isPOS ? '9px' : '14px', color: '#003b6f' }}>
        {isPOS ? 'PRODUCTOS' : '📋 PRODUCTOS'}
      </h3>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: isPOS ? '9px' : '13px',
        marginBottom: isPOS ? '8px' : '15px'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#003b6f', color: 'white' }}>
            <th style={{ padding: isPOS ? '3px' : '8px', textAlign: 'left' }}>Cant</th>
            <th style={{ padding: isPOS ? '3px' : '8px', textAlign: 'left' }}>Producto</th>
            <th style={{ padding: isPOS ? '3px' : '8px', textAlign: 'right' }}>Precio</th>
            <th style={{ padding: isPOS ? '3px' : '8px', textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {carrito && carrito.length > 0 ? (
            carrito.map((item, index) => (
              <tr key={index} style={{ borderBottom: isPOS ? '1px dotted #eee' : '1px solid #eee' }}>
                <td style={{ padding: isPOS ? '3px' : '8px', textAlign: 'left' }}>{item.cantidad}</td>
                <td style={{ padding: isPOS ? '3px' : '8px', textAlign: 'left' }}>
                  {isPOS ? item.nombre.substring(0, 20) : item.nombre}
                  {isPOS && item.nombre.length > 20 ? '...' : ''}
                </td>
                <td style={{ padding: isPOS ? '3px' : '8px', textAlign: 'right' }}>
                  {isPOS ? `$${Number(item.precio_unitario || item.precio).toFixed(2)}` : `RD$ ${Number(item.precio_unitario || item.precio).toFixed(2)}`}
                </td>
                <td style={{ padding: isPOS ? '3px' : '8px', textAlign: 'right' }}>
                  {isPOS ? `$${(Number(item.precio_unitario || item.precio) * item.cantidad).toFixed(2)}` : `RD$ ${(Number(item.precio_unitario || item.precio) * item.cantidad).toFixed(2)}`}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ textAlign: 'center', padding: isPOS ? '5px' : '10px' }}>Sin productos</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: isPOS ? '1px solid #003b6f' : '3px solid #003b6f' }}>
            <td colSpan="3" style={{ padding: isPOS ? '5px 0' : '12px 0', textAlign: 'right', fontWeight: 'bold', fontSize: isPOS ? '12px' : '16px' }}>
              TOTAL:
            </td>
            <td style={{ padding: isPOS ? '5px 0' : '12px 0', textAlign: 'right', fontWeight: 'bold', fontSize: isPOS ? '14px' : '18px', color: '#003b6f' }}>
              {isPOS ? `$${Number(total).toFixed(2)}` : `RD$ ${Number(total).toFixed(2)}`}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Pie de página */}
      <div style={{
        textAlign: 'center',
        borderTop: isPOS ? '1px dashed #003b6f' : '2px solid #003b6f',
        paddingTop: isPOS ? '5px' : '15px',
        marginTop: isPOS ? '5px' : '15px',
        fontSize: isPOS ? '8px' : '12px',
        color: '#555'
      }}>
        <p style={{ margin: isPOS ? '1px 0' : '2px 0' }}>
          {isPOS ? '¡GRACIAS!' : '¡Gracias por su compra!'}
        </p>
        <p style={{ margin: isPOS ? '1px 0' : '2px 0', fontSize: isPOS ? '7px' : '10px' }}>
          {nombreCorto} - {sucursalNombre}
        </p>
        {tipoVenta === 'credito' && !isPOS && (
          <p style={{ margin: '2px 0', color: '#c62828', fontWeight: 'bold' }}>
            ⚠️ Recuerde pagar su factura a tiempo
          </p>
        )}
        {!isPOS && (
          <p style={{ margin: '2px 0', fontSize: '10px' }}>Todos los derechos reservados</p>
        )}
      </div>
    </div>
  )
})

export default Factura