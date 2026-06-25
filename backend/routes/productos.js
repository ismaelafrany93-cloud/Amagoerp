const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener todos los productos
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM productos ORDER BY nombre'
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener un producto por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM productos WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Crear producto
router.post('/', async (req, res) => {
    try {
        const { nombre, categoria, descripcion, precio, stock } = req.body;

        const result = await pool.query(
            `INSERT INTO productos (nombre, categoria, descripcion, precio, stock)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [nombre, categoria, descripcion, precio, stock || 0]
        );

        res.json({ success: true, producto: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Actualizar producto
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, categoria, descripcion, precio, stock } = req.body;

        const result = await pool.query(
            `UPDATE productos
             SET nombre = $1, categoria = $2, descripcion = $3, 
                 precio = $4, stock = $5
             WHERE id = $6
             RETURNING *`,
            [nombre, categoria, descripcion, precio, stock, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        res.json({ success: true, producto: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Eliminar producto
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const existe = await pool.query(
            'SELECT * FROM productos WHERE id = $1',
            [id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        await pool.query('DELETE FROM productos WHERE id = $1', [id]);

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;