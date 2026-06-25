import React, { forwardRef } from 'react'

const Factura = forwardRef(({ 
  venta, 
  cliente, 
  carrito, 
  total, 
  tipoVenta, 
  tipoEntrega, 
  codigoEntrega 
}, ref) => {
  const fecha = new Date().toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const tipoPagoTexto = tipoVenta === 'credito' ? 'Crédito' : 'Contado'
  const tipoEntregaTexto = tipoEntrega === 'domicilio' ? 'Entrega a domicilio' : 'Retiro en tienda'

  return (
    <div ref={ref} style={{
      width: '210mm',
      minHeight: '297mm',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      backgroundColor: 'white',
      color: 'black',
      margin: '0 auto',
      boxShadow: '0 0 10px rgba(0,0,0,0.1)'
    }}>
      {/* Encabezado */}
      <div style={{ textAlign: 'center', borderBottom: '3px solid #003b6f', paddingBottom: '15px', marginBottom: '15px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#003b6f' }}>AMAGO MUEBLES</h1>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>Muebles · Cocinas · Closets</p>
        <p style={{ margin: '2px 0', fontSize: '12px', color: '#555' }}>Tel: 809-555-0000 | Santo Domingo, R.D.</p>
      </div>

      {/* CÓDIGO DE ENTREGA - DESTACADO */}
      {codigoEntrega && codigoEntrega !== 'null' && (
        <div style={{ 
          margin: '10px 0 15px 0',
          backgroundColor: '#e3f2fd',
          border: '2px solid #003b6f',
          borderRadius: '8px',
          padding: '15px',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#003b6f' }}>
            🔑 <strong>CÓDIGO DE ENTREGA</strong>
          </p>
          <p style={{ 
            margin: '5px 0 0 0', 
            fontSize: '32px', 
            fontWeight: 'bold',
            color: '#003b6f',
            letterSpacing: '4px'
          }}>
            {codigoEntrega}
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#555' }}>
            Presente este código al chofer para la entrega
          </p>
        </div>
      )}

      {/* Resto de la factura... */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px', fontSize: '13px' }}>
        <div>
          <p style={{ margin: '4px 0' }}><strong>Factura:</strong> #{venta?.id || 'N/A'}</p>
          <p style={{ margin: '4px 0' }}><strong>Fecha:</strong> {fecha}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '4px 0' }}>
            <strong>Tipo:</strong> {tipoPagoTexto}
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>Entrega:</strong> {tipoEntregaTexto}
          </p>
        </div>
      </div>

      {tipoVenta === 'credito' && (
        <div style={{ 
          backgroundColor: '#ffebee', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '15px',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, color: '#c62828', fontWeight: 'bold' }}>
            ⚠️ PENDIENTE DE PAGO
          </p>
        </div>
      )}

      {/* Datos del Cliente */}
      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '4px', 
        padding: '12px', 
        marginBottom: '15px',
        backgroundColor: '#f9f9f9'
      }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#003b6f' }}>👤 DATOS DEL CLIENTE</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', fontSize: '13px' }}>
          <p style={{ margin: '2px 0' }}><strong>Nombre:</strong> {cliente?.nombre || 'N/A'}</p>
          <p style={{ margin: '2px 0' }}><strong>Teléfono:</strong> {cliente?.telefono || 'N/A'}</p>
          <p style={{ margin: '2px 0', gridColumn: '1 / -1' }}><strong>Dirección:</strong> {cliente?.direccion || 'N/A'}</p>
          {cliente?.referencia && <p style={{ margin: '2px 0', gridColumn: '1 / -1' }}><strong>Referencia:</strong> {cliente.referencia}</p>}
        </div>
      </div>

      {/* Detalle de productos */}
      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#003b6f' }}>📋 PRODUCTOS</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '15px' }}>
        <thead>
          <tr style={{ backgroundColor: '#003b6f', color: 'white' }}>
            <th style={{ padding: '8px', textAlign: 'left' }}>Cant</th>
            <th style={{ padding: '8px', textAlign: 'left' }}>Producto</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Precio</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {carrito && carrito.length > 0 ? (
            carrito.map((item, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px', textAlign: 'left' }}>{item.cantidad}</td>
                <td style={{ padding: '8px', textAlign: 'left' }}>{item.nombre}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>RD$ {Number(item.precio).toFixed(2)}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>RD$ {(Number(item.precio) * item.cantidad).toFixed(2)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ textAlign: 'center', padding: '10px' }}>Sin productos</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '3px solid #003b6f' }}>
            <td colSpan="3" style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>TOTAL:</td>
            <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', fontSize: '18px', color: '#003b6f' }}>
              RD$ {Number(total).toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Pie de página */}
      <div style={{ 
        textAlign: 'center', 
        borderTop: '2px solid #003b6f', 
        paddingTop: '15px', 
        marginTop: '15px', 
        fontSize: '12px', 
        color: '#555'
      }}>
        <p style={{ margin: '2px 0' }}>¡Gracias por su compra!</p>
        {tipoVenta === 'credito' && (
          <p style={{ margin: '2px 0', color: '#c62828', fontWeight: 'bold' }}>
            ⚠️ Recuerde pagar su factura a tiempo
          </p>
        )}
        <p style={{ margin: '2px 0', fontSize: '10px' }}>AMAGO MUEBLES - Todos los derechos reservados</p>
      </div>
    </div>
  )
})

export default Factura