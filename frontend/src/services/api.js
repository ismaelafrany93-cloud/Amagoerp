import axios from 'axios';

// 👇 Cambia esta IP por la IP de tu computadora
const api = axios.create({
  baseURL: 'http://192.168.1.117:5000',  // ← TU IP LOCAL
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;