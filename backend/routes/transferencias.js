const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener transferencias (con filtros)
router.get('/', async (req, res) => {
    try {
        const { sucursal_id, estado } = req.query;
        let query = `
            SELECT t.*, 
                   u.nombre as usuario_nombre,
                   so.nombre as sucursal_origen_nombre,
                   sd.nombre as sucursal_destino_nombre
            FROM transferencias t
            LEFT JOIN usuarios u ON t.usuario_id = u.id
            LEFT JOIN sucursales so ON t.sucursal_origen_id = so.id
            LEFT JOIN sucursales sd ON t.sucursal_destino_id = sd.id
            WHERE 1=1
        `;
        let params = [];

        if (sucursal_id) {
            query += ` AND (t.sucursal_origen_id = $${params.length + 1} OR t.sucursal_destino_id = $${params.length + 1})`;
            params.push(sucursal_id);
        }

        if (estado) {
            query += ` AND t.estado = $${params.length + 1}`;
            params.push(estado);
        }

        query += ` ORDER BY t.id DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener transferencia por ID con detalles
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const transferencia = await pool.query(
            `SELECT t.*, 
                    u.nombre as usuario_nombre,
                    so.nombre as sucursal_origen_nombre,
                    sd.nombre as sucursal_destino_nombre
             FROM transferencias t
             LEFT JOIN usuarios u ON t.usuario_id = u.id
             LEFT JOIN sucursales so ON t.sucursal_origen_id = so.id
             LEFT JOIN sucursales sd ON t.sucursal_destino_id = sd.id
             WHERE t.id = $1`,
            [id]
        );

        if (transferencia.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Transferencia no encontrada' });
        }

        const detalles = await pool.query(
            `SELECT dt.*, p.nombre as producto_nombre
             FROM detalle_transferencia dt
             JOIN productos p ON dt.producto_id = p.id
             WHERE dt.transferencia_id = $1`,
            [id]
        );

        res.json({
            success: true,
            transferencia: transferencia.rows[0],
            detalles: detalles.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Crear transferencia
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const { usuario_id, sucursal_origen_id, sucursal_destino_id, productos, observacion } = req.body;

        await client.query('BEGIN');

        // 1. Crear transferencia
        const transferencia = await client.query(
            `INSERT INTO transferencias (usuario_id, sucursal_origen_id, sucursal_destino_id, observacion, estado)
             VALUES ($1, $2, $3, $4, 'pendiente')
             RETURNING *`,
            [usuario_id, sucursal_origen_id, sucursal_destino_id, observacion || '']
        );

        const transferenciaId = transferencia.rows[0].id;

        // 2. Guardar detalles y descontar stock de origen
        for (const item of productos) {
            // Guardar detalle
            await client.query(
                `INSERT INTO detalle_transferencia (transferencia_id, producto_id, cantidad, precio)
                 VALUES ($1, $2, $3, $4)`,
                [transferenciaId, item.id, item.cantidad, item.precio || 0]
            );

            // Descontar stock de la sucursal origen
            await client.query(
                `UPDATE productos 
                 SET stock = stock - $1 
                 WHERE id = $2`,
                [item.cantidad, item.id]
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
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

// Confirmar recepción de transferencia
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
            return res.status(404).json({ success: false, message: 'Transferencia no encontrada' });
        }

        if (transferencia.rows[0].estado !== 'pendiente') {
            return res.status(400).json({ success: false, message: 'Esta transferencia ya fue procesada' });
        }

        // Obtener detalles
        const detalles = await client.query(
            'SELECT * FROM detalle_transferencia WHERE transferencia_id = $1',
            [id]
        );

        // Sumar stock a la sucursal destino
        for (const item of detalles.rows) {
            await client.query(
                `UPDATE productos 
                 SET stock = stock + $1 
                 WHERE id = $2`,
                [item.cantidad, item.producto_id]
            );
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
            message: 'Transferencia recibida correctamente'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

// Cancelar transferencia
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
            return res.status(404).json({ success: false, message: 'Transferencia no encontrada' });
        }

        if (transferencia.rows[0].estado !== 'pendiente') {
            return res.status(400).json({ success: false, message: 'Esta transferencia ya fue procesada' });
        }

        // Devolver stock a la sucursal origen
        const detalles = await client.query(
            'SELECT * FROM detalle_transferencia WHERE transferencia_id = $1',
            [id]
        );

        for (const item of detalles.rows) {
            await client.query(
                `UPDATE productos 
                 SET stock = stock + $1 
                 WHERE id = $2`,
                [item.cantidad, item.producto_id]
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
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

module.exports = router;