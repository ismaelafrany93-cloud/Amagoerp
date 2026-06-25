const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    password: 'AmagoERP2026!',
    host: 'localhost',
    port: 5432,
    database: 'amago_erp'
});

module.exports = pool;