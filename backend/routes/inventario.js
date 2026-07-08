const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /inventario - Obtener inventario (con filtro por sucursal)
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
                p.costo,
                COALESCE(p.stock, 0) as stock,
                p.sucursal_id,
                s.nombre as sucursal_nombre,
                CASE 
                    WHEN COALESCE(p.stock, 0) <= 0 THEN 'Agotado'
                    WHEN COALESCE(p.stock, 0) <= 5 THEN 'Bajo stock'
                    ELSE 'En stock'
                END as estado_stock
            FROM productos p
            LEFT JOIN sucursales s ON p.sucursal_id = s.id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        // Filtrar por sucursal si se envía el parámetro
        if (sucursal_id) {
            query += ` AND (p.sucursal_id = $${paramIndex} OR p.sucursal_id IS NULL)`;
            params.push(sucursal_id);
            paramIndex++;
        }

        query += ` ORDER BY p.nombre`;

        const result = await pool.query(query, params);
        
        // Siempre devolver un array, incluso si está vacío
        res.json(result.rows || []);
    } catch (error) {
        console.error('Error en GET /inventario:', error);
        // Devolver array vacío en lugar de error para evitar que el frontend falle
        res.status(500).json([]);
    }
});

// ============================================
// GET /inventario/sucursal/:id - Obtener inventario de una sucursal específica
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
                p.costo,
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
        console.error('Error en GET /inventario/sucursal/:id:', error);
        res.status(500).json([]);
    }
});

// ============================================
// PUT /inventario/:id - Actualizar stock de un producto
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { stock, sucursal_id } = req.body;

        // Verificar que el producto existe
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

        // Si se especifica sucursal, actualizar inventario de esa sucursal
        if (sucursal_id) {
            // Verificar si ya existe registro en producto_inventario
            const existeInventario = await pool.query(
                'SELECT id FROM producto_inventario WHERE producto_id = $1 AND sucursal_id = $2',
                [id, sucursal_id]
            );

            if (existeInventario.rows.length > 0) {
                // Actualizar stock existente
                await pool.query(
                    `UPDATE producto_inventario 
                     SET stock = $1, updated_at = NOW()
                     WHERE producto_id = $2 AND sucursal_id = $3`,
                    [stock, id, sucursal_id]
                );
            } else {
                // Crear nuevo registro de inventario
                await pool.query(
                    `INSERT INTO producto_inventario (producto_id, sucursal_id, stock)
                     VALUES ($1, $2, $3)`,
                    [id, sucursal_id, stock]
                );
            }
        } else {
            // Actualizar stock general del producto
            await pool.query(
                'UPDATE productos SET stock = $1 WHERE id = $2',
                [stock, id]
            );
        }

        res.json({ 
            success: true,
            message: 'Stock actualizado correctamente'
        });
    } catch (error) {
        console.error('Error en PUT /inventario/:id:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// POST /inventario/movimiento - Registrar movimiento de inventario
// ============================================
router.post('/movimiento', async (req, res) => {
    try {
        const { producto_id, sucursal_id, tipo, cantidad, usuario_id, observacion } = req.body;

        // Validar datos
        if (!producto_id || !sucursal_id || !tipo || !cantidad) {
            return res.status(400).json({
                success: false,
                error: 'Faltan datos requeridos'
            });
        }

        // Registrar movimiento
        await pool.query(
            `INSERT INTO inventario_movimientos 
             (producto_id, sucursal_id, tipo, cantidad, usuario_id, observacion, fecha)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [producto_id, sucursal_id, tipo, cantidad, usuario_id, observacion || '']
        );

        // Actualizar stock
        const signo = tipo === 'entrada' ? '+' : '-';
        await pool.query(
            `UPDATE producto_inventario 
             SET stock = stock ${signo} $1, updated_at = NOW()
             WHERE producto_id = $2 AND sucursal_id = $3`,
            [cantidad, producto_id, sucursal_id]
        );

        res.json({
            success: true,
            message: `Movimiento de ${tipo} registrado correctamente`
        });
    } catch (error) {
        console.error('Error en POST /inventario/movimiento:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;