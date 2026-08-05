const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /inventario - Obtener inventario por sucursal
// ============================================
router.get('/', async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        
        if (!sucursal_id) {
            return res.status(400).json({
                success: false,
                error: 'sucursal_id es requerido'
            });
        }

        const esPrincipal = parseInt(sucursal_id) === 3;

        let query;
        let params = [sucursal_id];

        if (esPrincipal) {
            query = `
                SELECT 
                    p.id,
                    p.nombre,
                    p.categoria,
                    p.descripcion,
                    p.precio,
                    p.precio_mayor,
                    p.cantidad_mayor,
                    p.sucursal_id as producto_sucursal_id,
                    COALESCE(pi.stock, 0) as stock,
                    p.precio as precio_venta,
                    'Principal' as sucursal_nombre,
                    ${sucursal_id} as sucursal_id
                FROM productos p
                LEFT JOIN producto_inventario pi ON p.id = pi.producto_id AND pi.sucursal_id = $1
                ORDER BY p.nombre
            `;
        } else {
            query = `
                SELECT 
                    p.id,
                    p.nombre,
                    p.categoria,
                    p.descripcion,
                    p.precio_mayor,
                    p.cantidad_mayor,
                    pi.sucursal_id,
                    pi.stock,
                    COALESCE(pi.precio_venta, 0) as precio_venta,
                    s.nombre as sucursal_nombre
                FROM producto_inventario pi
                INNER JOIN productos p ON pi.producto_id = p.id
                INNER JOIN sucursales s ON pi.sucursal_id = s.id
                WHERE pi.sucursal_id = $1
                  AND pi.stock > 0
                ORDER BY p.nombre
            `;
        }

        const result = await pool.query(query, params);
        res.json(result.rows || []);
        
    } catch (error) {
        console.error('❌ Error en GET /inventario:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// POST /inventario - Agregar producto a inventario de sucursal
// ============================================
router.post('/', async (req, res) => {
    try {
        const { producto_id, sucursal_id, stock, precio, precio_mayor, cantidad_mayor } = req.body;

        if (!producto_id || !sucursal_id) {
            return res.status(400).json({
                success: false,
                error: 'producto_id y sucursal_id son requeridos'
            });
        }

        const existe = await pool.query(
            'SELECT id FROM producto_inventario WHERE producto_id = $1 AND sucursal_id = $2',
            [producto_id, sucursal_id]
        );

        if (existe.rows.length > 0) {
            await pool.query(
                `UPDATE producto_inventario 
                 SET stock = stock + $1,
                     precio_venta = $2,
                     precio_mayorista = $3,
                     cantidad_mayor = $4,
                     updated_at = NOW()
                 WHERE producto_id = $5 AND sucursal_id = $6`,
                [stock || 0, precio || 0, precio_mayor || 0, cantidad_mayor || 0, producto_id, sucursal_id]
            );
            
            return res.json({
                success: true,
                message: '✅ Stock actualizado en la sucursal'
            });
        }

        await pool.query(
            `INSERT INTO producto_inventario (producto_id, sucursal_id, stock, precio_venta, precio_mayorista, cantidad_mayor)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [producto_id, sucursal_id, stock || 0, precio || 0, precio_mayor || 0, cantidad_mayor || 0]
        );

        res.json({
            success: true,
            message: '✅ Producto agregado a la sucursal'
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
// PUT /inventario/stock - Actualizar stock en sucursal
// ============================================
router.put('/stock', async (req, res) => {
    try {
        const { producto_id, sucursal_id, stock } = req.body;

        if (!producto_id || !sucursal_id) {
            return res.status(400).json({
                success: false,
                error: 'producto_id y sucursal_id son requeridos'
            });
        }

        if (stock === undefined || stock < 0) {
            return res.status(400).json({
                success: false,
                error: 'stock debe ser un número válido mayor o igual a 0'
            });
        }

        const esPrincipal = parseInt(sucursal_id) === 3;

        if (esPrincipal) {
            await pool.query(
                `UPDATE productos SET stock = $1 WHERE id = $2`,
                [stock, producto_id]
            );
            
            const existe = await pool.query(
                'SELECT id FROM producto_inventario WHERE producto_id = $1 AND sucursal_id = $2',
                [producto_id, sucursal_id]
            );

            if (existe.rows.length > 0) {
                await pool.query(
                    `UPDATE producto_inventario SET stock = $1 WHERE producto_id = $2 AND sucursal_id = $3`,
                    [stock, producto_id, sucursal_id]
                );
            } else {
                await pool.query(
                    `INSERT INTO producto_inventario (producto_id, sucursal_id, stock) VALUES ($1, $2, $3)`,
                    [producto_id, sucursal_id, stock]
                );
            }

            return res.json({
                success: true,
                message: '✅ Stock actualizado correctamente en Principal'
            });
        }

        const existe = await pool.query(
            'SELECT id FROM producto_inventario WHERE producto_id = $1 AND sucursal_id = $2',
            [producto_id, sucursal_id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado en esta sucursal'
            });
        }

        await pool.query(
            `UPDATE producto_inventario 
             SET stock = $1,
                 updated_at = NOW()
             WHERE producto_id = $2 AND sucursal_id = $3`,
            [stock, producto_id, sucursal_id]
        );

        res.json({
            success: true,
            message: '✅ Stock actualizado correctamente'
        });

    } catch (error) {
        console.error('❌ Error en PUT /inventario/stock:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// PUT /inventario/precio - Actualizar precio en sucursal
// ============================================
router.put('/precio', async (req, res) => {
    try {
        const { producto_id, sucursal_id, precio_venta } = req.body;

        if (!producto_id || !sucursal_id) {
            return res.status(400).json({
                success: false,
                error: 'producto_id y sucursal_id son requeridos'
            });
        }

        if (precio_venta === undefined || precio_venta < 0) {
            return res.status(400).json({
                success: false,
                error: 'precio_venta debe ser un número válido mayor o igual a 0'
            });
        }

        if (parseInt(sucursal_id) === 3) {
            return res.status(400).json({
                success: false,
                error: 'No se puede modificar el precio de la sucursal Principal'
            });
        }

        const existe = await pool.query(
            'SELECT id FROM producto_inventario WHERE producto_id = $1 AND sucursal_id = $2',
            [producto_id, sucursal_id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado en esta sucursal'
            });
        }

        await pool.query(
            `UPDATE producto_inventario 
             SET precio_venta = $1,
                 updated_at = NOW()
             WHERE producto_id = $2 AND sucursal_id = $3`,
            [precio_venta, producto_id, sucursal_id]
        );

        res.json({
            success: true,
            message: '✅ Precio actualizado correctamente',
            producto: { producto_id, sucursal_id, precio_venta }
        });

    } catch (error) {
        console.error('❌ Error en PUT /inventario/precio:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// POST /inventario/producto - Agregar producto a sucursal
// ============================================
router.post('/producto', async (req, res) => {
    try {
        const { 
            nombre, 
            categoria, 
            descripcion, 
            precio, 
            stock,
            sucursal_id,
            precio_mayor,
            cantidad_mayor
        } = req.body;

        if (!nombre || !precio) {
            return res.status(400).json({
                success: false,
                error: 'Nombre y precio son requeridos'
            });
        }

        const sucursalFinal = sucursal_id || 3;
        const stockFinal = stock || 0;
        const precioFinal = precio || 0;

        if (parseInt(sucursalFinal) === 3) {
            return res.status(400).json({
                success: false,
                error: 'No se puede agregar productos directamente a la sucursal Principal'
            });
        }

        const existe = await pool.query(
            `SELECT pi.id
             FROM producto_inventario pi
             WHERE pi.producto_id IN (SELECT id FROM productos WHERE nombre ILIKE $1)
               AND pi.sucursal_id = $2`,
            [nombre, sucursalFinal]
        );

        if (existe.rows.length > 0) {
            await pool.query(
                `UPDATE producto_inventario 
                 SET stock = stock + $1,
                     precio_venta = $2,
                     updated_at = NOW()
                 WHERE id = $3`,
                [stockFinal, precioFinal, existe.rows[0].id]
            );

            return res.json({
                success: true,
                message: `✅ Producto actualizado en la sucursal (stock +${stockFinal})`
            });
        }

        const productoExistente = await pool.query(
            'SELECT id FROM productos WHERE nombre ILIKE $1',
            [nombre]
        );

        let productoId;
        if (productoExistente.rows.length > 0) {
            productoId = productoExistente.rows[0].id;
        } else {
            const result = await pool.query(
                `INSERT INTO productos 
                 (nombre, categoria, descripcion, precio, precio_mayor, cantidad_mayor, stock)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id`,
                [
                    nombre, 
                    categoria || 'General', 
                    descripcion || '', 
                    precioFinal,
                    precio_mayor || 0,
                    cantidad_mayor || 0,
                    stockFinal
                ]
            );
            productoId = result.rows[0].id;
        }

        await pool.query(
            `INSERT INTO producto_inventario (producto_id, sucursal_id, stock, precio_venta, precio_mayorista)
             VALUES ($1, $2, $3, $4, $5)`,
            [productoId, sucursalFinal, stockFinal, precioFinal, precio_mayor || 0]
        );

        res.json({
            success: true,
            message: `✅ Producto agregado a la sucursal con precio RD$ ${precioFinal}`
        });

    } catch (error) {
        console.error('❌ Error en POST /inventario/producto:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// DELETE /inventario/:id - Eliminar producto de una sucursal (NUEVA RUTA)
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { sucursal_id } = req.query;

        console.log(`🗑️ Eliminando producto ${id} de sucursal ${sucursal_id}`);

        if (!sucursal_id) {
            return res.status(400).json({
                success: false,
                error: 'sucursal_id es requerido'
            });
        }

        if (parseInt(sucursal_id) === 3) {
            return res.status(400).json({
                success: false,
                error: 'No se puede eliminar productos de la sucursal Principal'
            });
        }

        const result = await pool.query(
            `DELETE FROM producto_inventario 
             WHERE producto_id = $1 AND sucursal_id = $2
             RETURNING *`,
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
            message: '✅ Producto eliminado de la sucursal'
        });

    } catch (error) {
        console.error('❌ Error en DELETE /inventario/:id:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// DELETE /inventario/producto - Eliminar producto (MANTENER POR COMPATIBILIDAD)
// ============================================
router.delete('/producto', async (req, res) => {
    try {
        const { producto_id, sucursal_id } = req.body;

        if (!producto_id || !sucursal_id) {
            return res.status(400).json({
                success: false,
                error: 'producto_id y sucursal_id son requeridos'
            });
        }

        if (parseInt(sucursal_id) === 3) {
            return res.status(400).json({
                success: false,
                error: 'No se puede eliminar productos de la sucursal Principal'
            });
        }

        const result = await pool.query(
            `DELETE FROM producto_inventario 
             WHERE producto_id = $1 AND sucursal_id = $2
             RETURNING *`,
            [producto_id, sucursal_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado en esta sucursal'
            });
        }

        res.json({
            success: true,
            message: '✅ Producto eliminado de la sucursal'
        });

    } catch (error) {
        console.error('❌ Error en DELETE /inventario/producto:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;