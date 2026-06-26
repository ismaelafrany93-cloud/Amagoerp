// ============================================
// CONFIGURACIÓN DE LA API
// ============================================

const API_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://amagoerp-backend.onrender.com'  // 👈 CORREGIDO (sin el guion)

export default API_URL