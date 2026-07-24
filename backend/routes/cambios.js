const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /cambios - Listar todos los cambios
// ============================================
router.get('/', async (req, res) => {
    try {
        const { factura, estado, fecha_inicio, fecha_fin } = req.query;
        
        let query = `
            SELECT 
                c.*,
                u.nombre as usuario_nombre,
                v.cliente_nombre as venta_cliente,
                v.total as venta_total
            FROM cambios c
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            LEFT JOIN ventas v ON c.venta_id = v.id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (factura) {
            query += ` AND c.factura_original ILIKE $${paramIndex}`;
            params.push(`%${factura}%`);
            paramIndex++;
        }

        if (estado) {
            query += ` AND c.estado = $${paramIndex}`;
            params.push(estado);
            paramIndex++;
        }

        if (fecha_inicio) {
            query += ` AND DATE(c.fecha) >= $${paramIndex}`;
            params.push(fecha_inicio);
            paramIndex++;
        }

        if (fecha_fin) {
            query += ` AND DATE(c.fecha) <= $${paramIndex}`;
            params.push(fecha_fin);
            paramIndex++;
        }

        query += ` ORDER BY c.fecha DESC LIMIT 100`;

        const result = await pool.query(query, params);
        res.json(result.rows || []);
    } catch (error) {
        console.error('❌ Error en GET /cambios:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// GET /cambios/venta/:factura - Buscar por factura
// ============================================
router.get('/venta/:factura', async (req, res) => {
    try {
        const { factura } = req.params;
        
        // Buscar la venta
        const venta = await pool.query(
            `SELECT 
                v.*,
                u.nombre as vendedor_nombre
            FROM ventas v
            LEFT JOIN usuarios u ON v.usuario_id = u.id
            WHERE v.factura = $1 OR v.id::text = $1`,
            [factura]
        );

        if (venta.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Factura no encontrada'
            });
        }

        // Buscar los detalles de la venta
        const detalles = await pool.query(
            `SELECT 
                d.*,
                p.nombre as producto_nombre,
                p.precio as producto_precio
            FROM detalle_ventas d
            LEFT JOIN productos p ON d.producto_id = p.id
            WHERE d.venta_id = $1`,
            [venta.rows[0].id]
        );

        res.json({
            success: true,
            venta: venta.rows[0],
            detalles: detalles.rows || []
        });
    } catch (error) {
        console.error('❌ Error en GET /cambios/venta/:factura:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// POST /cambios - Crear un cambio
// ============================================
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            venta_id,
            factura_original,
            cliente_nombre,
            cliente_telefono,
            producto_devuelto_id,
            producto_devuelto_nombre,
            cantidad_devuelta,
            precio_devuelto,
            producto_nuevo_id,
            producto_nuevo_nombre,
            cantidad_nueva,
            precio_nuevo,
            total_devuelto,
            total_nuevo,
            diferencia,
            tipo,
            motivo,
            usuario_id,
            envio_opcional
        } = req.body;

        if (!venta_id || !producto_devuelto_id || !tipo) {
            return res.status(400).json({
                success: false,
                error: 'Venta, producto devuelto y tipo son requeridos'
            });
        }

        await client.query('BEGIN');

        // Crear el cambio
        const result = await client.query(
            `INSERT INTO cambios (
                venta_id, factura_original, cliente_nombre, cliente_telefono,
                producto_devuelto_id, producto_devuelto_nombre, cantidad_devuelta, precio_devuelto,
                producto_nuevo_id, producto_nuevo_nombre, cantidad_nueva, precio_nuevo,
                total_devuelto, total_nuevo, diferencia, tipo, motivo, usuario_id, estado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'completado')
            RETURNING *`,
            [
                venta_id, factura_original, cliente_nombre, cliente_telefono,
                producto_devuelto_id, producto_devuelto_nombre, cantidad_devuelta, precio_devuelto,
                producto_nuevo_id, producto_nuevo_nombre, cantidad_nueva || 0, precio_nuevo || 0,
                total_devuelto || 0, total_nuevo || 0, diferencia || 0,
                tipo, motivo, usuario_id
            ]
        );

        const cambio = result.rows[0];

        // Marcar la venta como que tiene cambio
        await client.query(
            `UPDATE ventas SET tiene_cambio = TRUE, cambio_id = $1 WHERE id = $2`,
            [cambio.id, venta_id]
        );

        // Si es un cambio por otro producto, actualizar inventario
        if (tipo === 'cambio' && producto_nuevo_id) {
            // Devolver el producto devuelto al inventario
            await client.query(
                `UPDATE producto_inventario 
                 SET stock = stock + $1
                 WHERE producto_id = $2 AND sucursal_id = 3`,
                [cantidad_devuelta, producto_devuelto_id]
            );

            // Descontar el producto nuevo del inventario
            await client.query(
                `UPDATE producto_inventario 
                 SET stock = stock - $1
                 WHERE producto_id = $2 AND sucursal_id = 3`,
                [cantidad_nueva || 1, producto_nuevo_id]
            );
        }

        // Si es devolución, devolver al inventario
        if (tipo === 'devolucion') {
            await client.query(
                `UPDATE producto_inventario 
                 SET stock = stock + $1
                 WHERE producto_id = $2 AND sucursal_id = 3`,
                [cantidad_devuelta, producto_devuelto_id]
            );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: '✅ Cambio registrado correctamente',
            cambio: cambio
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en POST /cambios:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

// ============================================
// GET /cambios/:id - Obtener un cambio específico
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            `SELECT 
                c.*,
                u.nombre as usuario_nombre
            FROM cambios c
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            WHERE c.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cambio no encontrado'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error en GET /cambios/:id:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// PUT /cambios/:id - Actualizar estado de un cambio
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const result = await pool.query(
            `UPDATE cambios SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [estado, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cambio no encontrado'
            });
        }

        res.json({
            success: true,
            message: '✅ Estado actualizado correctamente',
            cambio: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Error en PUT /cambios/:id:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;