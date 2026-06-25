const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener inventario (usando la tabla productos directamente)
router.get('/', async (req, res) => {
    try {
        // Si tienes tabla inventario, úsala; si no, usa productos
        const result = await pool.query(`
            SELECT 
                p.id, 
                p.nombre, 
                p.categoria, 
                p.precio, 
                COALESCE(p.stock, 0) as stock
            FROM productos p
            ORDER BY p.nombre
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error en inventario:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Actualizar stock de un producto
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { stock } = req.body;

        await pool.query(
            'UPDATE productos SET stock = $1 WHERE id = $2',
            [stock, id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;