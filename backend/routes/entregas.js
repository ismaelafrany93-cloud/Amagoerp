const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener entregas pendientes
router.get('/pendientes', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT e.*, v.cliente_nombre, v.cliente_direccion, v.cliente_telefono
             FROM entregas e
             JOIN ventas v ON e.venta_id = v.id
             WHERE e.estado = 'pendiente'
             ORDER BY e.created_at ASC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener entrega por código numérico
router.get('/codigo/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        const codigoNumero = parseInt(codigo);

        if (isNaN(codigoNumero)) {
            return res.status(400).json({
                success: false,
                message: 'Código inválido. Debe ser un número.'
            });
        }

        const result = await pool.query(
            `SELECT e.*, v.cliente_nombre, v.cliente_direccion, v.cliente_telefono, v.cliente_referencia, v.total
             FROM entregas e
             JOIN ventas v ON e.venta_id = v.id
             WHERE e.codigo_numero = $1 AND e.estado = 'pendiente'`,
            [codigoNumero]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Código no válido o ya entregado'
            });
        }

        const entrega = result.rows[0];

        const detalles = await pool.query(
            `SELECT dv.*, p.nombre as producto_nombre
             FROM detalle_ventas dv
             JOIN productos p ON dv.producto_id = p.id
             WHERE dv.venta_id = $1`,
            [entrega.venta_id]
        );

        res.json({
            success: true,
            entrega: {
                ...entrega,
                detalles: detalles.rows
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Confirmar entrega
router.post('/confirmar', async (req, res) => {
    try {
        const { codigo, entregado, motivo, recibido_por, chofer_id } = req.body;

        const codigoNumero = parseInt(codigo);
        if (isNaN(codigoNumero)) {
            return res.status(400).json({
                success: false,
                message: 'Código inválido. Debe ser un número.'
            });
        }

        const entregaResult = await pool.query(
            'SELECT * FROM entregas WHERE codigo_numero = $1',
            [codigoNumero]
        );

        if (entregaResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Código no encontrado'
            });
        }

        const entrega = entregaResult.rows[0];
        const ventaId = entrega.venta_id;

        // Obtener datos de la venta
        const ventaData = await pool.query(
            `SELECT cliente_nombre, cliente_telefono, cliente_direccion 
             FROM ventas WHERE id = $1`,
            [ventaId]
        );

        if (entregado) {
            // ✅ ENTREGADO
            await pool.query(
                `UPDATE entregas 
                 SET estado = 'entregado', fecha_entrega = NOW(), chofer_id = $1
                 WHERE codigo_numero = $2`,
                [chofer_id, codigoNumero]
            );

            await pool.query(
                `UPDATE ventas SET estado_entrega = 'entregado', fecha_entrega = NOW()
                 WHERE id = $1`,
                [ventaId]
            );

            // Descontar inventario
            const detalles = await pool.query(
                'SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = $1',
                [ventaId]
            );

            for (const item of detalles.rows) {
                await pool.query(
                    `UPDATE productos SET stock = stock - $1 WHERE id = $2`,
                    [item.cantidad, item.producto_id]
                );
            }

            res.json({
                success: true,
                message: '✅ Entrega confirmada'
            });

        } else {
            // ❌ NO ENTREGADO
            const recibidoPorFinal = recibido_por || 'Chofer';

            // Actualizar entrega
            await pool.query(
                `UPDATE entregas 
                 SET estado = 'fallido', comentario = $1, chofer_id = $2
                 WHERE codigo_numero = $3`,
                [motivo, chofer_id, codigoNumero]
            );

            // Actualizar venta
            await pool.query(
                `UPDATE ventas SET estado_entrega = 'fallido' 
                 WHERE id = $1`,
                [ventaId]
            );

            // Insertar en productos_no_entregados
            await pool.query(
                `INSERT INTO productos_no_entregados (
                    entrega_id, venta_id, cliente_nombre, cliente_telefono, 
                    cliente_direccion, codigo_numero, motivo, recibido_por
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    entrega.id,
                    ventaId,
                    ventaData.rows[0]?.cliente_nombre || 'N/A',
                    ventaData.rows[0]?.cliente_telefono || 'N/A',
                    ventaData.rows[0]?.cliente_direccion || 'N/A',
                    codigoNumero,
                    motivo,
                    recibidoPorFinal
                ]
            );

            res.json({
                success: true,
                message: '❌ No entrega registrada'
            });
        }

    } catch (error) {
        console.error('Error en /confirmar:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obtener productos no entregados
router.get('/no-entregados', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM productos_no_entregados 
             ORDER BY fecha DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Marcar como revisado
router.put('/no-entregados/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            `UPDATE productos_no_entregados SET estado = 'revisado' WHERE id = $1`,
            [id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;