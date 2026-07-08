const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /inventario - Obtener inventario con filtro por sucursal
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
                COALESCE(pi.stock, 0) as stock,
                pi.sucursal_id,
                s.nombre as sucursal_nombre
            FROM productos p
            LEFT JOIN producto_inventario pi ON p.id = pi.producto_id
            LEFT JOIN sucursales s ON pi.sucursal_id = s.id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        // Si se especifica sucursal, filtrar SOLO esa sucursal
        if (sucursal_id) {
            // Si es la sucursal principal (1), mostrar todos los productos
            // incluyendo los que tienen NULL o sucursal_id = 1
            if (sucursal_id === '1') {
                query += ` AND (pi.sucursal_id = $${paramIndex} OR pi.sucursal_id IS NULL)`;
                params.push(sucursal_id);
                paramIndex++;
            } else {
                // Para otras sucursales, mostrar SOLO productos de esa sucursal
                query += ` AND pi.sucursal_id = $${paramIndex}`;
                params.push(sucursal_id);
                paramIndex++;
            }
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
// GET /inventario/sucursal/:id - Inventario por sucursal específica
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
                COALESCE(pi.stock, 0) as stock,
                s.nombre as sucursal_nombre
             FROM productos p
             LEFT JOIN producto_inventario pi ON p.id = pi.producto_id AND pi.sucursal_id = $1
             LEFT JOIN sucursales s ON s.id = $1
             WHERE pi.sucursal_id = $1 OR pi.sucursal_id IS NULL
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
// POST /inventario - Agregar producto a una sucursal
// ============================================
router.post('/', async (req, res) => {
    try {
        const { producto_id, sucursal_id, stock } = req.body;

        // Validar datos
        if (!producto_id || !sucursal_id) {
            return res.status(400).json({
                success: false,
                error: 'Producto y sucursal son requeridos'
            });
        }

        // Verificar que el producto existe
        const producto = await pool.query(
            'SELECT id, nombre FROM productos WHERE id = $1',
            [producto_id]
        );

        if (producto.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado'
            });
        }

        // Verificar que la sucursal existe
        const sucursal = await pool.query(
            'SELECT id, nombre FROM sucursales WHERE id = $1',
            [sucursal_id]
        );

        if (sucursal.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Sucursal no encontrada'
            });
        }

        // Verificar si ya existe el producto en esa sucursal
        const existe = await pool.query(
            'SELECT id FROM producto_inventario WHERE producto_id = $1 AND sucursal_id = $2',
            [producto_id, sucursal_id]
        );

        if (existe.rows.length > 0) {
            // Actualizar stock si ya existe
            await pool.query(
                `UPDATE producto_inventario 
                 SET stock = stock + $1, updated_at = NOW()
                 WHERE producto_id = $2 AND sucursal_id = $3`,
                [stock || 0, producto_id, sucursal_id]
            );
            res.json({
                success: true,
                message: `Stock actualizado en ${sucursal.rows[0].nombre}`
            });
        } else {
            // Crear nuevo registro
            await pool.query(
                `INSERT INTO producto_inventario (producto_id, sucursal_id, stock)
                 VALUES ($1, $2, $3)`,
                [producto_id, sucursal_id, stock || 0]
            );
            res.json({
                success: true,
                message: `Producto agregado a ${sucursal.rows[0].nombre} correctamente`
            });
        }

    } catch (error) {
        console.error('❌ Error en POST /inventario:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// PUT /inventario/:id - Actualizar stock de un producto en una sucursal
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { stock, sucursal_id } = req.body;

        if (!sucursal_id) {
            return res.status(400).json({
                success: false,
                error: 'Sucursal es requerida'
            });
        }

        // Verificar que existe el registro
        const existe = await pool.query(
            'SELECT id FROM producto_inventario WHERE producto_id = $1 AND sucursal_id = $2',
            [id, sucursal_id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado en esta sucursal'
            });
        }

        await pool.query(
            `UPDATE producto_inventario 
             SET stock = $1, updated_at = NOW()
             WHERE producto_id = $2 AND sucursal_id = $3`,
            [stock || 0, id, sucursal_id]
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

// ============================================
// DELETE /inventario/:id - Eliminar producto de una sucursal
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { sucursal_id } = req.query;

        if (!sucursal_id) {
            return res.status(400).json({
                success: false,
                error: 'Sucursal es requerida'
            });
        }

        const result = await pool.query(
            'DELETE FROM producto_inventario WHERE producto_id = $1 AND sucursal_id = $2 RETURNING id',
            [id, sucursal_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado en esta sucursal'
            });
        }

        res.json({
            success: true,
            message: 'Producto eliminado de la sucursal correctamente'
        });

    } catch (error) {
        console.error('❌ Error en DELETE /inventario/:id:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;