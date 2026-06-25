const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener clientes
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM clientes ORDER BY nombre'
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear cliente
router.post('/', async (req, res) => {
    try {
        const { nombre, telefono, direccion, cedula } = req.body;

        const result = await pool.query(
            `INSERT INTO clientes (nombre, telefono, direccion, cedula)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [nombre, telefono, direccion, cedula]
        );

        res.json({ success: true, cliente: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;