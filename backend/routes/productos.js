const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /productos - Obtener productos
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

        if (sucursal_id) {
            query += ` AND (p.sucursal_id = $1 OR p.sucursal_id IS NULL)`;
            params.push(sucursal_id);
        }

        query += ` ORDER BY p.nombre`;

        const result = await pool.query(query, params);
        res.json(result.rows || []);
        
    } catch (error) {
        console.error('❌ Error en GET /productos:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// GET /productos/:id - Obtener producto por ID
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT 
                p.*,
                s.nombre as sucursal_nombre
             FROM productos p
             LEFT JOIN sucursales s ON p.sucursal_id = s.id
             WHERE p.id = $1`,
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
        console.error('❌ Error en GET /productos/:id:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// POST /productos - Crear producto
// ============================================
router.post('/', async (req, res) => {
    try {
        const { 
            nombre, 
            categoria, 
            descripcion, 
            precio, 
            stock, 
            sucursal_id
        } = req.body;

        if (!nombre || !precio) {
            return res.status(400).json({
                success: false,
                error: 'Nombre y precio son requeridos'
            });
        }

        const result = await pool.query(
            `INSERT INTO productos 
             (nombre, categoria, descripcion, precio, stock, sucursal_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                nombre, 
                categoria || 'General', 
                descripcion || '', 
                precio, 
                stock || 0, 
                sucursal_id || null
            ]
        );

        res.json({ 
            success: true, 
            producto: result.rows[0],
            message: 'Producto creado correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error en POST /productos:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// PUT /productos/:id - Actualizar producto
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            nombre, 
            categoria, 
            descripcion, 
            precio, 
            stock, 
            sucursal_id
        } = req.body;

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

        const result = await pool.query(
            `UPDATE productos
             SET nombre = $1, 
                 categoria = $2, 
                 descripcion = $3, 
                 precio = $4, 
                 stock = $5,
                 sucursal_id = $6,
                 updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [
                nombre, 
                categoria || 'General', 
                descripcion || '', 
                precio, 
                stock || 0, 
                sucursal_id || null,
                id
            ]
        );

        res.json({ 
            success: true, 
            producto: result.rows[0],
            message: 'Producto actualizado correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error en PUT /productos/:id:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// DELETE /productos/:id - Eliminar producto
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

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

        await pool.query('DELETE FROM productos WHERE id = $1', [id]);

        res.json({ 
            success: true,
            message: 'Producto eliminado correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error en DELETE /productos/:id:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;