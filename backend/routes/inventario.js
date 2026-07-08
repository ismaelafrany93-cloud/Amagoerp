const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /inventario - Obtener inventario por sucursal
// ============================================
router.get('/', async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        
        // Si no hay sucursal_id, devolver todos los productos (para el dueño)
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
        `;
        let params = [];
        let paramIndex = 1;

        // Si se especifica sucursal, filtrar SOLO esa sucursal
        if (sucursal_id) {
            query += ` WHERE pi.sucursal_id = $${paramIndex}`;
            params.push(sucursal_id);
            paramIndex++;
        } else {
            // Si no hay filtro, mostrar todos (para el dueño)
            query += ` WHERE 1=1`;
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
// POST /inventario - Agregar producto a una sucursal (SOLO DUEÑO/SUBGERENTE)
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
        } else {
            // Crear nuevo registro
            await pool.query(
                `INSERT INTO producto_inventario (producto_id, sucursal_id, stock)
                 VALUES ($1, $2, $3)`,
                [producto_id, sucursal_id, stock || 0]
            );
        }

        res.json({
            success: true,
            message: `Producto agregado a ${sucursal.rows[0].nombre} correctamente`
        });

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