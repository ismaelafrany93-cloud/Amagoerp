const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener materiales
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM materiales ORDER BY nombre'
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear material
router.post('/', async (req, res) => {
    try {
        const { nombre, unidad, stock, stock_minimo } = req.body;

        const result = await pool.query(
            `INSERT INTO materiales (nombre, unidad, stock, stock_minimo)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [nombre, unidad || 'unidades', stock || 0, stock_minimo || 0]
        );

        res.json({ success: true, material: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar stock
router.put('/:id/stock', async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidad } = req.body;

        await pool.query(
            `UPDATE materiales SET stock = stock + $1 WHERE id = $2`,
            [cantidad, id]
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar material
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query('DELETE FROM materiales WHERE id = $1', [id]);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;