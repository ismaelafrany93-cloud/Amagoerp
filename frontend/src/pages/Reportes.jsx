import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import API_URL from '../config'  // 👈 Importar la URL centralizada

function Reportes() {
  const [topProductos, setTopProductos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarReportes()
  }, [])

  const cargarReportes = async () => {
    try {
      const response = await fetch(`${API_URL}/reportes/top-productos`)  // 👈 Cambiado
      const data = await response.json()
      setTopProductos(data)
    } catch (error) {
      console.error('Error cargando reportes:', error)
    } finally {
      setCargando(false)
    }
  }

  if (cargando) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Cargando reportes...</h2>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <h1>📊 Reportes</h1>

      <div style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '20px', backgroundColor: 'white' }}>
        <h3 style={{ color: '#003b6f' }}>🔥 Top Productos Más Vendidos</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f4f8' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Producto</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Cantidad Vendida</th>
            </tr>
          </thead>
          <tbody>
            {topProductos.map((p, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>{p.nombre}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{p.total_vendido}</td>
              </tr>
            ))}
            {topProductos.length === 0 && <tr><td colSpan="2" style={{ padding: '15px', textAlign: 'center', color: '#999' }}>No hay datos de productos vendidos</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}

export default Reportes