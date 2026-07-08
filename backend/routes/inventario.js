const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /inventario - Obtener inventario
// ============================================
router.get('/', async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        
        let query = `
            SELECT 
                p.id, 
                p.nombre, 
                p.categoria, 
                p.descripcion,
                p.precio,
                COALESCE(p.stock, 0) as stock,
                p.sucursal_id,
                s.nombre as sucursal_nombre
            FROM productos p
            LEFT JOIN sucursales s ON p.sucursal_id = s.id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (sucursal_id) {
            query += ` AND (p.sucursal_id = $${paramIndex} OR p.sucursal_id IS NULL)`;
            params.push(sucursal_id);
            paramIndex++;
        }

        query += ` ORDER BY p.nombre`;

        const result = await pool.query(query, params);
        res.json(result.rows || []);
        
    } catch (error) {
        console.error('❌ Error en GET /inventario:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// GET /inventario/sucursal/:id
// ============================================
router.get('/sucursal/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            `SELECT 
                p.id, 
                p.nombre, 
                p.categoria, 
                p.precio,
                COALESCE(p.stock, 0) as stock,
                s.nombre as sucursal_nombre
             FROM productos p
             LEFT JOIN sucursales s ON p.sucursal_id = s.id
             WHERE p.sucursal_id = $1 OR p.sucursal_id IS NULL
             ORDER BY p.nombre`,
            [id]
        );

        res.json(result.rows || []);
        
    } catch (error) {
        console.error('❌ Error en GET /inventario/sucursal/:id:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// PUT /inventario/:id - Actualizar stock
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { stock, sucursal_id } = req.body;

        const existe = await pool.query(
            'SELECT id FROM productos WHERE id = $1',
            [id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        await pool.query(
            'UPDATE productos SET stock = $1 WHERE id = $2',
            [stock || 0, id]
        );

        res.json({ 
            success: true,
            message: 'Stock actualizado correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error en PUT /inventario/:id:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;