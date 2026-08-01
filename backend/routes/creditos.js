const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /creditos - Obtener créditos
// ============================================
router.get('/', async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        
        let query = `
            SELECT 
                c.*,
                cl.nombre as cliente_nombre,
                cl.telefono as cliente_telefono
            FROM creditos c
            LEFT JOIN clientes cl ON c.cliente_id = cl.id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (sucursal_id) {
            query += ` AND c.sucursal_id = $${paramIndex}`;
            params.push(sucursal_id);
            paramIndex++;
        }

        query += ` ORDER BY c.id DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows || []);
        
    } catch (error) {
        console.error('❌ Error en GET /creditos:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// POST /creditos - Crear crédito
// ============================================
router.post('/', async (req, res) => {
    try {
        const { 
            cliente_id, 
            monto, 
            descripcion, 
            fecha_vencimiento,
            sucursal_id
        } = req.body;

        if (!cliente_id || !monto || monto <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Cliente y monto son requeridos'
            });
        }

        const result = await pool.query(
            `INSERT INTO creditos (
                cliente_id, monto, saldo, descripcion, 
                fecha_vencimiento, sucursal_id, estado, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'pendiente', NOW())
            RETURNING *`,
            [cliente_id, monto, monto, descripcion || '', fecha_vencimiento || null, sucursal_id || 3]
        );

        // Actualizar saldo del cliente
        await pool.query(
            `UPDATE clientes 
             SET saldo_pendiente = COALESCE(saldo_pendiente, 0) + $1 
             WHERE id = $2`,
            [monto, cliente_id]
        );

        res.json({
            success: true,
            message: '✅ Crédito registrado correctamente',
            credito: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error en POST /creditos:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// PUT /creditos/:id - Editar crédito
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            monto, 
            descripcion, 
            fecha_vencimiento,
            cliente_id
        } = req.body;

        // Obtener el crédito actual
        const creditoActual = await pool.query(
            'SELECT * FROM creditos WHERE id = $1',
            [id]
        );

        if (creditoActual.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Crédito no encontrado'
            });
        }

        const credito = creditoActual.rows[0];

        // Si cambió el monto, ajustar saldo del cliente
        if (monto && monto !== credito.monto) {
            const diferencia = monto - credito.monto;
            await pool.query(
                `UPDATE clientes 
                 SET saldo_pendiente = COALESCE(saldo_pendiente, 0) + $1 
                 WHERE id = $2`,
                [diferencia, cliente_id || credito.cliente_id]
            );
        }

        const result = await pool.query(
            `UPDATE creditos 
             SET monto = $1,
                 saldo = $1 - COALESCE(abonado, 0),
                 descripcion = $2,
                 fecha_vencimiento = $3,
                 cliente_id = $4,
                 updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [
                monto || credito.monto,
                descripcion || credito.descripcion,
                fecha_vencimiento || credito.fecha_vencimiento,
                cliente_id || credito.cliente_id,
                id
            ]
        );

        res.json({
            success: true,
            message: '✅ Crédito actualizado correctamente',
            credito: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error en PUT /creditos/:id:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// PUT /creditos/:id/pagar - Abonar a crédito
// ============================================
router.put('/:id/pagar', async (req, res) => {
    try {
        const { id } = req.params;
        const { monto } = req.body;

        if (!monto || monto <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Monto de abono es requerido'
            });
        }

        const creditoActual = await pool.query(
            'SELECT * FROM creditos WHERE id = $1 AND estado != $2',
            [id, 'cancelado']
        );

        if (creditoActual.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Crédito no encontrado o cancelado'
            });
        }

        const credito = creditoActual.rows[0];
        const nuevoAbonado = (credito.abonado || 0) + monto;
        const nuevoSaldo = credito.monto - nuevoAbonado;
        const nuevoEstado = nuevoSaldo <= 0 ? 'pagado' : 'pendiente';

        const result = await pool.query(
            `UPDATE creditos 
             SET abonado = $1,
                 saldo = $2,
                 estado = $3,
                 updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [nuevoAbonado, nuevoSaldo, nuevoEstado, id]
        );

        // Actualizar saldo del cliente
        await pool.query(
            `UPDATE clientes 
             SET saldo_pendiente = COALESCE(saldo_pendiente, 0) - $1 
             WHERE id = $2`,
            [monto, credito.cliente_id]
        );

        res.json({
            success: true,
            message: `✅ Abono de RD$ ${monto.toFixed(2)} registrado`,
            credito: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error en PUT /creditos/:id/pagar:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// DELETE /creditos/:id - Cancelar crédito (con historial)
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const creditoActual = await pool.query(
            'SELECT * FROM creditos WHERE id = $1',
            [id]
        );

        if (creditoActual.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Crédito no encontrado'
            });
        }

        const credito = creditoActual.rows[0];

        // Si ya está pagado o cancelado, no permitir
        if (credito.estado === 'pagado') {
            return res.status(400).json({
                success: false,
                error: 'No se puede cancelar un crédito ya pagado'
            });
        }

        // 👇 CANCELAR (no eliminar físicamente) - queda en el historial
        const result = await pool.query(
            `UPDATE creditos 
             SET estado = 'cancelado',
                 motivo_cancelacion = 'Cancelado por el usuario',
                 updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        // Devolver saldo al cliente
        await pool.query(
            `UPDATE clientes 
             SET saldo_pendiente = COALESCE(saldo_pendiente, 0) - $1 
             WHERE id = $2`,
            [credito.saldo || credito.monto, credito.cliente_id]
        );

        res.json({
            success: true,
            message: '✅ Crédito cancelado correctamente (queda en el historial)',
            credito: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error en DELETE /creditos/:id:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;