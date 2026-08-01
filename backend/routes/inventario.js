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

        // 👇 DETECTAR SI ES LA SUCURSAL PRINCIPAL (ID 3)
        const esPrincipal = parseInt(sucursal_id) === 3;

        let query = `
            SELECT 
                p.id,
                p.nombre,
                p.categoria,
                p.descripcion,
                p.precio_mayor,
                p.cantidad_mayor,
                p.categoria_icono,
                p.categoria_color,
                pi.sucursal_id,
                pi.stock,
                s.nombre as sucursal_nombre
        `;

        // 👇 SI ES PRINCIPAL, USAR p.precio (el precio original)
        // 👇 SI NO ES PRINCIPAL, USAR pi.precio_venta (precio de la sucursal)
        if (esPrincipal) {
            query += `, p.precio as precio`;
        } else {
            query += `, COALESCE(pi.precio_venta, 0) as precio`;
        }

        query += `
            FROM producto_inventario pi
            JOIN productos p ON pi.producto_id = p.id
            JOIN sucursales s ON pi.sucursal_id = s.id
            WHERE pi.sucursal_id = $1
            ORDER BY p.nombre
        `;

        const result = await pool.query(query, [sucursal_id]);
        res.json(result.rows || []);
        
    } catch (error) {
        console.error('❌ Error en GET /inventario:', error.message);
        res.status(200).json([]);
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

        // 👇 VERIFICAR QUE LA SUCURSAL NO SEA LA PRINCIPAL
        if (parseInt(sucursal_id) === 3) {
            return res.status(400).json({
                success: false,
                error: 'No se puede modificar el precio de la sucursal Principal'
            });
        }

        const result = await pool.query(
            `UPDATE producto_inventario 
             SET precio_venta = $1,
                 updated_at = NOW()
             WHERE producto_id = $2 AND sucursal_id = $3
             RETURNING *`,
            [precio_venta, producto_id, sucursal_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado en esta sucursal'
            });
        }

        res.json({
            success: true,
            message: '✅ Precio actualizado correctamente',
            producto: result.rows[0]
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
// PUT /inventario/stock - Actualizar stock manualmente
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

        const result = await pool.query(
            `UPDATE producto_inventario 
             SET stock = $1,
                 updated_at = NOW()
             WHERE producto_id = $2 AND sucursal_id = $3
             RETURNING *`,
            [stock, producto_id, sucursal_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado en esta sucursal'
            });
        }

        // También actualizar la tabla productos para mantener consistencia
        await pool.query(
            `UPDATE productos SET stock = $1 WHERE id = $2`,
            [stock, producto_id]
        );

        res.json({
            success: true,
            message: '✅ Stock actualizado correctamente',
            producto: result.rows[0]
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
            cantidad_mayor,
            categoria_icono,
            categoria_color
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

        // Verificar si el producto ya existe en esta sucursal
        const existe = await pool.query(
            `SELECT p.id, pi.id as inventario_id
             FROM productos p
             JOIN producto_inventario pi ON p.id = pi.producto_id
             WHERE p.nombre ILIKE $1 AND pi.sucursal_id = $2`,
            [nombre, sucursalFinal]
        );

        let productoId;

        if (existe.rows.length > 0) {
            // El producto ya existe en esta sucursal
            productoId = existe.rows[0].id;
            
            // Actualizar stock y precio
            await pool.query(
                `UPDATE producto_inventario 
                 SET stock = stock + $1,
                     precio_venta = $2,
                     updated_at = NOW()
                 WHERE producto_id = $3 AND sucursal_id = $4`,
                [stockFinal, precioFinal, productoId, sucursalFinal]
            );

            res.json({
                success: true,
                message: `✅ Producto actualizado en la sucursal (stock +${stockFinal})`,
                producto_id: productoId
            });
        } else {
            // Crear nuevo producto
            const result = await pool.query(
                `INSERT INTO productos 
                 (nombre, categoria, descripcion, precio, precio_mayor, cantidad_mayor, categoria_icono, categoria_color, sucursal_id, stock)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING id`,
                [
                    nombre, 
                    categoria || 'General', 
                    descripcion || '', 
                    precioFinal,
                    precio_mayor || 0,
                    cantidad_mayor || 0,
                    categoria_icono || null,
                    categoria_color || null,
                    sucursalFinal,
                    stockFinal
                ]
            );

            productoId = result.rows[0].id;

            // Crear inventario con el precio específico de la sucursal
            await pool.query(
                `INSERT INTO producto_inventario (producto_id, sucursal_id, stock, precio_venta, precio_mayorista)
                 VALUES ($1, $2, $3, $4, $5)`,
                [productoId, sucursalFinal, stockFinal, precioFinal, precio_mayor || 0]
            );

            res.json({
                success: true,
                message: `✅ Producto agregado a la sucursal con precio RD$ ${precioFinal}`,
                producto_id: productoId
            });
        }

    } catch (error) {
        console.error('❌ Error en POST /inventario/producto:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// DELETE /inventario/producto - Eliminar producto de una sucursal
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

        // 👇 NO PERMITIR ELIMINAR DE LA PRINCIPAL
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
            message: '✅ Producto eliminado de la sucursal',
            producto: result.rows[0]
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