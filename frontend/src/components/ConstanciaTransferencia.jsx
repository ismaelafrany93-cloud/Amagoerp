import React, { forwardRef } from 'react'

const ConstanciaTransferencia = forwardRef(({ transferencia, detalles, usuario }, ref) => {
  const fecha = new Date(transferencia.fecha_salida).toLocaleString('es-DO', {
    dateStyle: 'long',
    timeStyle: 'short'
  })

  const total = detalles.reduce((acc, item) => acc + (Number(item.precio) * item.cantidad), 0)

  return (
    <div ref={ref} style={{
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: 'white',
      color: '#003b6f'
    }}>
      {/* Encabezado */}
      <div style={{
        textAlign: 'center',
        borderBottom: '3px solid #003b6f',
        paddingBottom: '15px',
        marginBottom: '20px'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#003b6f' }}>🏢 AMAGO MUEBLES</h1>
        <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
          RNC: 123-456789-0 | Tel: (809) 555-0000
        </p>
        <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
          www.amagomuebles.com | amago@amagomuebles.com
        </p>
      </div>

      {/* Título */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', color: '#003b6f', margin: 0 }}>
          📦 CONSTANCIA DE TRANSFERENCIA
        </h2>
        <p style={{ fontSize: '14px', color: '#666', margin: '5px 0 0 0' }}>
          <strong>N°:</strong> {transferencia.id} | <strong>Fecha:</strong> {fecha}
        </p>
      </div>

      {/* Información */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        backgroundColor: '#f5f7fb',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>🔵 Sucursal Origen:</strong> {transferencia.sucursal_origen_nombre}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>🟢 Sucursal Destino:</strong> {transferencia.sucursal_destino_nombre}
          </p>
        </div>
        <div>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>👤 Usuario:</strong> {usuario?.nombre || 'N/A'}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>📌 Estado:</strong>{' '}
            <span style={{
              backgroundColor: transferencia.estado === 'completada' ? '#4CAF50' : '#ff9800',
              color: 'white',
              padding: '2px 10px',
              borderRadius: '12px',
              fontSize: '12px'
            }}>
              {transferencia.estado === 'completada' ? '✅ Completada' : '⏳ Pendiente'}
            </span>
          </p>
        </div>
      </div>

      {/* Tabla de productos */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '20px',
        fontSize: '14px'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#003b6f', color: 'white' }}>
            <th style={{ padding: '8px', textAlign: 'left' }}>#</th>
            <th style={{ padding: '8px', textAlign: 'left' }}>Producto</th>
            <th style={{ padding: '8px', textAlign: 'center' }}>Cantidad</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Precio</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {detalles.map((item, index) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px' }}>{index + 1}</td>
              <td style={{ padding: '8px' }}>{item.producto_nombre}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{item.cantidad}</td>
              <td style={{ padding: '8px', textAlign: 'right' }}>RD$ {Number(item.precio).toFixed(2)}</td>
              <td style={{ padding: '8px', textAlign: 'right' }}>RD$ {(Number(item.precio) * item.cantidad).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#f5f7fb', fontWeight: 'bold' }}>
            <td colSpan="4" style={{ padding: '10px', textAlign: 'right' }}>TOTAL:</td>
            <td style={{ padding: '10px', textAlign: 'right', color: '#003b6f', fontSize: '16px' }}>
              RD$ {total.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Observación */}
      {transferencia.observacion && (
        <div style={{
          backgroundColor: '#fff8e1',
          padding: '10px 15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            <strong>📝 Observación:</strong> {transferencia.observacion}
          </p>
        </div>
      )}

      {/* Firmas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '20px',
        marginTop: '30px',
        borderTop: '1px solid #eee',
        paddingTop: '20px',
        textAlign: 'center'
      }}>
        <div>
          <p style={{ margin: 0 }}>_________________________</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
            <strong>Usuario</strong>
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>{usuario?.nombre || ''}</p>
        </div>
        <div>
          <p style={{ margin: 0 }}>_________________________</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
            <strong>Recibe</strong>
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>Sucursal Destino</p>
        </div>
        <div>
          <p style={{ margin: 0 }}>_________________________</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
            <strong>Sello / Firma</strong>
          </p>
        </div>
      </div>

      {/* Pie de página */}
      <div style={{
        textAlign: 'center',
        borderTop: '1px solid #eee',
        paddingTop: '15px',
        marginTop: '20px',
        fontSize: '12px',
        color: '#999'
      }}>
        <p style={{ margin: 0 }}>
          Documento generado por AMAGO MUEBLES ERP v1.0
        </p>
        <p style={{ margin: 0 }}>
          Este documento es una constancia válida de transferencia de mercancía.
        </p>
      </div>
    </div>
  )
})

export default ConstanciaTransferencia