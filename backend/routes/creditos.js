const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener todos los clientes con deuda (crédito)
router.get('/clientes', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.id,
                c.nombre,
                c.telefono,
                c.direccion,
                COALESCE(c.saldo_pendiente, 0) as saldo_pendiente
            FROM clientes c
            WHERE COALESCE(c.saldo_pendiente, 0) > 0
            ORDER BY c.nombre
        `);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener historial de abonos de un cliente
router.get('/abonos/:cliente_id', async (req, res) => {
    try {
        const { cliente_id } = req.params;

        const result = await pool.query(`
            SELECT a.*, u.nombre as usuario_nombre
            FROM abonos a
            LEFT JOIN usuarios u ON a.usuario_id = u.id
            WHERE a.cliente_id = $1
            ORDER BY a.fecha DESC
        `, [cliente_id]);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Registrar un abono
router.post('/abonos', async (req, res) => {
    try {
        const { cliente_id, monto, usuario_id, observacion } = req.body;

        // Verificar que el cliente existe
        const cliente = await pool.query(
            'SELECT * FROM clientes WHERE id = $1',
            [cliente_id]
        );

        if (cliente.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }

        // Registrar el abono
        await pool.query(
            `INSERT INTO abonos (cliente_id, monto, usuario_id, observacion)
             VALUES ($1, $2, $3, $4)`,
            [cliente_id, monto, usuario_id, observacion || '']
        );

        // Actualizar el saldo pendiente del cliente
        await pool.query(
            `UPDATE clientes 
             SET saldo_pendiente = saldo_pendiente - $1 
             WHERE id = $2`,
            [monto, cliente_id]
        );

        res.json({
            success: true,
            message: 'Abono registrado correctamente'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;