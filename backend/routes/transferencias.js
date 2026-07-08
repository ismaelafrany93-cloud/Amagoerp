const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /transferencias - Obtener transferencias
// ============================================
router.get('/', async (req, res) => {
    try {
        const { sucursal_id, estado } = req.query;
        let query = `
            SELECT 
                t.id,
                t.usuario_id,
                t.sucursal_origen_id,
                t.sucursal_destino_id,
                t.observacion,
                t.estado,
                t.fecha_salida,
                t.fecha_llegada,
                t.created_at,
                u.nombre as usuario_nombre,
                so.nombre as sucursal_origen_nombre,
                sd.nombre as sucursal_destino_nombre,
                (
                    SELECT COALESCE(SUM(cantidad), 0) 
                    FROM detalle_transferencia 
                    WHERE transferencia_id = t.id
                ) as total_productos
            FROM transferencias t
            LEFT JOIN usuarios u ON t.usuario_id = u.id
            LEFT JOIN sucursales so ON t.sucursal_origen_id = so.id
            LEFT JOIN sucursales sd ON t.sucursal_destino_id = sd.id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (sucursal_id) {
            query += ` AND (t.sucursal_origen_id = $${paramIndex} OR t.sucursal_destino_id = $${paramIndex})`;
            params.push(sucursal_id);
            paramIndex++;
        }

        if (estado) {
            query += ` AND t.estado = $${paramIndex}`;
            params.push(estado);
            paramIndex++;
        }

        query += ` ORDER BY t.id DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en GET /transferencias:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// POST /transferencias - Crear transferencia
// ============================================
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const { 
            usuario_id, 
            sucursal_origen_id, 
            sucursal_destino_id, 
            productos, 
            observacion 
        } = req.body;

        // Validar datos
        if (!usuario_id || !sucursal_origen_id || !sucursal_destino_id || !productos || productos.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Faltan datos requeridos para la transferencia'
            });
        }

        if (sucursal_origen_id === sucursal_destino_id) {
            return res.status(400).json({
                success: false,
                error: 'La sucursal de origen y destino deben ser diferentes'
            });
        }

        await client.query('BEGIN');

        // 1. Verificar que el usuario existe
        const userCheck = await client.query(
            'SELECT id, sucursal_id, nombre FROM usuarios WHERE id = $1',
            [usuario_id]
        );

        if (userCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false, 
                error: 'Usuario no encontrado' 
            });
        }

        // 2. Verificar que las sucursales existen
        const sucursalesCheck = await client.query(
            'SELECT id, nombre FROM sucursales WHERE id = $1 OR id = $2',
            [sucursal_origen_id, sucursal_destino_id]
        );

        if (sucursalesCheck.rows.length < 2) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Una de las sucursales no existe'
            });
        }

        // 3. Verificar stock en la sucursal origen
        for (const item of productos) {
            const stockCheck = await client.query(
                `SELECT COALESCE(stock, 0) as stock 
                 FROM producto_inventario 
                 WHERE producto_id = $1 AND sucursal_id = $2`,
                [item.id, sucursal_origen_id]
            );

            const stockActual = stockCheck.rows[0]?.stock || 0;
            
            if (stockActual < item.cantidad) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    error: `Stock insuficiente para el producto ID ${item.id}. Disponible: ${stockActual}, Requerido: ${item.cantidad}`
                });
            }
        }

        // 4. Crear transferencia
        const transferencia = await client.query(
            `INSERT INTO transferencias 
             (usuario_id, sucursal_origen_id, sucursal_destino_id, observacion, estado, fecha_salida)
             VALUES ($1, $2, $3, $4, 'pendiente', NOW())
             RETURNING *`,
            [usuario_id, sucursal_origen_id, sucursal_destino_id, observacion || '']
        );

        const transferenciaId = transferencia.rows[0].id;

        // 5. Guardar detalles y descontar stock de origen
        for (const item of productos) {
            // Guardar detalle
            await client.query(
                `INSERT INTO detalle_transferencia 
                 (transferencia_id, producto_id, cantidad, precio)
                 VALUES ($1, $2, $3, $4)`,
                [transferenciaId, item.id, item.cantidad, item.precio || 0]
            );

            // Descontar stock de la sucursal origen
            await client.query(
                `UPDATE producto_inventario 
                 SET stock = stock - $1, updated_at = NOW()
                 WHERE producto_id = $2 AND sucursal_id = $3`,
                [item.cantidad, item.id, sucursal_origen_id]
            );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            transferencia: transferencia.rows[0],
            message: 'Transferencia creada correctamente'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en POST /transferencias:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

// ============================================
// PUT /transferencias/:id/recibir - Confirmar recepción (ACTUALIZA STOCK AUTOMÁTICAMENTE)
// ============================================
router.put('/:id/recibir', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        // Obtener transferencia
        const transferencia = await client.query(
            'SELECT * FROM transferencias WHERE id = $1',
            [id]
        );

        if (transferencia.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false, 
                message: 'Transferencia no encontrada' 
            });
        }

        if (transferencia.rows[0].estado !== 'pendiente') {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                message: 'Esta transferencia ya fue procesada' 
            });
        }

        // Obtener detalles
        const detalles = await client.query(
            'SELECT * FROM detalle_transferencia WHERE transferencia_id = $1',
            [id]
        );

        // 👇 SUMAR STOCK A LA SUCURSAL DESTINO (AUTOMÁTICO)
        for (const item of detalles.rows) {
            const sucursalDestinoId = transferencia.rows[0].sucursal_destino_id;
            
            // Verificar si existe registro en producto_inventario para la sucursal destino
            const existeInventario = await client.query(
                'SELECT id FROM producto_inventario WHERE producto_id = $1 AND sucursal_id = $2',
                [item.producto_id, sucursalDestinoId]
            );

            if (existeInventario.rows.length > 0) {
                // Actualizar stock existente
                await client.query(
                    `UPDATE producto_inventario 
                     SET stock = stock + $1, updated_at = NOW()
                     WHERE producto_id = $2 AND sucursal_id = $3`,
                    [item.cantidad, item.producto_id, sucursalDestinoId]
                );
            } else {
                // Crear nuevo registro de inventario (esto es AUTOMÁTICO)
                await client.query(
                    `INSERT INTO producto_inventario 
                     (producto_id, sucursal_id, stock)
                     VALUES ($1, $2, $3)`,
                    [item.producto_id, sucursalDestinoId, item.cantidad]
                );
            }
        }

        // Actualizar estado
        await client.query(
            `UPDATE transferencias 
             SET estado = 'completada', fecha_llegada = NOW()
             WHERE id = $1`,
            [id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Transferencia recibida correctamente. Stock actualizado automáticamente.'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en PUT /transferencias/:id/recibir:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

// ============================================
// PUT /transferencias/:id/cancelar - Cancelar transferencia
// ============================================
router.put('/:id/cancelar', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        const transferencia = await client.query(
            'SELECT * FROM transferencias WHERE id = $1',
            [id]
        );

        if (transferencia.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false, 
                message: 'Transferencia no encontrada' 
            });
        }

        if (transferencia.rows[0].estado !== 'pendiente') {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                message: 'Esta transferencia ya fue procesada' 
            });
        }

        // Devolver stock a la sucursal origen
        const detalles = await client.query(
            'SELECT * FROM detalle_transferencia WHERE transferencia_id = $1',
            [id]
        );

        for (const item of detalles.rows) {
            await client.query(
                `UPDATE producto_inventario 
                 SET stock = stock + $1, updated_at = NOW()
                 WHERE producto_id = $2 AND sucursal_id = $3`,
                [item.cantidad, item.producto_id, transferencia.rows[0].sucursal_origen_id]
            );
        }

        await client.query(
            `UPDATE transferencias SET estado = 'cancelada' WHERE id = $1`,
            [id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Transferencia cancelada correctamente'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en PUT /transferencias/:id/cancelar:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

module.exports = router;