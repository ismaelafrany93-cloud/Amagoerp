const { Pool } = require('pg');

// 👇 USAR LA VARIABLE DE ENTORNO DE RENDER
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;