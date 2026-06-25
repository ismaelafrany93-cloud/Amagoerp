const API_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://api.amagoerp.org'

export default API_URL