const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /inventario - Obtener inventario con precios por sucursal
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
                COALESCE(pi.precio, p.precio) as precio,
                COALESCE(pi.precio_mayor, p.precio_mayor) as precio_mayor,
                COALESCE(pi.cantidad_mayor, p.cantidad_mayor) as cantidad_mayor,
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
            if (parseInt(sucursal_id) === 3) {
                query += ` AND (pi.sucursal_id = $${paramIndex} OR pi.sucursal_id IS NULL)`;
                params.push(sucursal_id);
                paramIndex++;
            } else {
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
// POST /inventario - Agregar producto a una sucursal con precio
// ============================================
router.post('/', async (req, res) => {
    try {
        const { 
            producto_id, 
            sucursal_id, 
            stock,
            precio,
            precio_mayor,
            cantidad_mayor
        } = req.body;

        if (!producto_id || !sucursal_id) {
            return res.status(400).json({
                success: false,
                error: 'Producto y sucursal son requeridos'
            });
        }

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

        const stockFinal = parseInt(stock) || 0;
        const precioFinal = parseFloat(precio) || 0;
        const precioMayorFinal = parseFloat(precio_mayor) || null;
        const cantidadMayorFinal = parseInt(cantidad_mayor) || 0;

        const existe = await pool.query(
            'SELECT id FROM producto_inventario WHERE producto_id = $1 AND sucursal_id = $2',
            [producto_id, sucursal_id]
        );

        if (existe.rows.length > 0) {
            await pool.query(
                `UPDATE producto_inventario 
                 SET stock = stock + $1, 
                     precio = $2,
                     precio_mayor = $3,
                     cantidad_mayor = $4,
                     updated_at = NOW()
                 WHERE producto_id = $5 AND sucursal_id = $6`,
                [stockFinal, precioFinal, precioMayorFinal, cantidadMayorFinal, producto_id, sucursal_id]
            );
        } else {
            await pool.query(
                `INSERT INTO producto_inventario (producto_id, sucursal_id, stock, precio, precio_mayor, cantidad_mayor)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [producto_id, sucursal_id, stockFinal, precioFinal, precioMayorFinal, cantidadMayorFinal]
            );
        }

        res.json({
            success: true,
            message: `✅ Producto agregado/actualizado en ${sucursal.rows[0].nombre}`
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
// PUT /inventario/:id - Actualizar stock y precios
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { stock, sucursal_id, precio, precio_mayor, cantidad_mayor } = req.body;

        if (!sucursal_id) {
            return res.status(400).json({
                success: false,
                error: 'Sucursal es requerida'
            });
        }

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
             SET stock = $1, 
                 precio = $2,
                 precio_mayor = $3,
                 cantidad_mayor = $4,
                 updated_at = NOW()
             WHERE producto_id = $5 AND sucursal_id = $6`,
            [stock || 0, precio || 0, precio_mayor || null, cantidad_mayor || 0, id, sucursal_id]
        );

        res.json({
            success: true,
            message: '✅ Stock y precios actualizados correctamente'
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