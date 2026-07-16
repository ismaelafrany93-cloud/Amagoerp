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
                p.precio_mayor,
                p.cantidad_mayor,
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

        if (sucursal_id) {
            query += ` AND (pi.sucursal_id = $${paramIndex} OR pi.sucursal_id IS NULL)`;
            params.push(sucursal_id);
            paramIndex++;
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
                COALESCE(pi.stock, 0) as stock_inventario,
                s.nombre as sucursal_nombre
             FROM productos p
             LEFT JOIN producto_inventario pi ON p.id = pi.producto_id
             LEFT JOIN sucursales s ON pi.sucursal_id = s.id
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
            precio_mayor,
            cantidad_mayor,
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
             (nombre, categoria, descripcion, precio, precio_mayor, cantidad_mayor)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                nombre, 
                categoria || 'General', 
                descripcion || '', 
                precio,
                precio_mayor || null,
                cantidad_mayor || 0
            ]
        );

        const producto = result.rows[0];

        if (sucursal_id && stock) {
            await pool.query(
                `INSERT INTO producto_inventario (producto_id, sucursal_id, stock)
                 VALUES ($1, $2, $3)`,
                [producto.id, sucursal_id, stock]
            );
        }

        res.json({ 
            success: true, 
            producto: producto,
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
// PUT /productos/:id - ACTUALIZAR PRODUCTO COMPLETO
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            nombre, 
            categoria, 
            descripcion, 
            precio,
            precio_mayor,
            cantidad_mayor,
            stock,
            sucursal_id
        } = req.body;

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

        // Actualizar producto
        const result = await pool.query(
            `UPDATE productos
             SET nombre = $1, 
                 categoria = $2, 
                 descripcion = $3, 
                 precio = $4,
                 precio_mayor = $5,
                 cantidad_mayor = $6,
                 updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [
                nombre, 
                categoria || 'General', 
                descripcion || '', 
                precio,
                precio_mayor || null,
                cantidad_mayor || 0,
                id
            ]
        );

        // Si se especifica sucursal y stock, actualizar inventario
        if (sucursal_id && stock !== undefined && stock !== null) {
            const existeInventario = await pool.query(
                'SELECT id FROM producto_inventario WHERE producto_id = $1 AND sucursal_id = $2',
                [id, sucursal_id]
            );

            if (existeInventario.rows.length > 0) {
                await pool.query(
                    `UPDATE producto_inventario 
                     SET stock = $1, updated_at = NOW()
                     WHERE producto_id = $2 AND sucursal_id = $3`,
                    [stock, id, sucursal_id]
                );
            } else {
                await pool.query(
                    `INSERT INTO producto_inventario (producto_id, sucursal_id, stock)
                     VALUES ($1, $2, $3)`,
                    [id, sucursal_id, stock]
                );
            }
        }

        res.json({ 
            success: true, 
            producto: result.rows[0],
            message: '✅ Producto actualizado correctamente'
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

        // Eliminar registros de inventario primero
        await pool.query('DELETE FROM producto_inventario WHERE producto_id = $1', [id]);
        
        // Eliminar producto
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

// ============================================
// PUT /productos/:id/stock - ACTUALIZAR SOLO STOCK
// ============================================
router.put('/:id/stock', async (req, res) => {
    try {
        const { id } = req.params;
        const { stock, sucursal_id } = req.body;

        if (stock === undefined || stock === null) {
            return res.status(400).json({
                success: false,
                message: 'Stock es requerido'
            });
        }

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

        const sucursalFinal = sucursal_id || 3;
        const stockFinal = parseInt(stock) || 0;

        // Actualizar en producto_inventario
        const existeInventario = await pool.query(
            'SELECT id FROM producto_inventario WHERE producto_id = $1 AND sucursal_id = $2',
            [id, sucursalFinal]
        );

        if (existeInventario.rows.length > 0) {
            await pool.query(
                `UPDATE producto_inventario 
                 SET stock = $1, updated_at = NOW()
                 WHERE producto_id = $2 AND sucursal_id = $3`,
                [stockFinal, id, sucursalFinal]
            );
        } else {
            await pool.query(
                `INSERT INTO producto_inventario (producto_id, sucursal_id, stock)
                 VALUES ($1, $2, $3)`,
                [id, sucursalFinal, stockFinal]
            );
        }

        // Actualizar también en productos
        await pool.query(
            `UPDATE productos SET stock = $1 WHERE id = $2`,
            [stockFinal, id]
        );

        res.json({
            success: true,
            message: '✅ Stock actualizado correctamente',
            stock: stockFinal,
            sucursal_id: sucursalFinal
        });

    } catch (error) {
        console.error('❌ Error en PUT /productos/:id/stock:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;