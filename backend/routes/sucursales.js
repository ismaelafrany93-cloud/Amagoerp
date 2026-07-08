const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener todas las sucursales
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM sucursales ORDER BY nombre');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear sucursal
router.post('/', async (req, res) => {
    try {
        const { nombre, direccion, telefono, encargado } = req.body;

        const result = await pool.query(
            `INSERT INTO sucursales (nombre, direccion, telefono, encargado)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [nombre, direccion, telefono, encargado]
        );

        res.json({
            success: true,
            sucursal: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar sucursal
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM sucursales WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;