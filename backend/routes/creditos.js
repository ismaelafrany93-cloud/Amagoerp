const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /creditos - Obtener SOLO cuentas con saldo pendiente
// ============================================
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                c.id,
                c.cliente_id,
                c.venta_id,
                c.total_venta,
                c.abonado,
                c.saldo_pendiente,
                c.estado,
                c.created_at,
                cl.nombre as cliente_nombre,
                cl.telefono as cliente_telefono,
                cl.direccion as cliente_direccion,
                v.fecha as fecha_venta,
                v.cliente_nombre as cliente_venta
             FROM cuentas_por_cobrar c
             LEFT JOIN clientes cl ON c.cliente_id = cl.id
             LEFT JOIN ventas v ON c.venta_id = v.id
             WHERE (c.estado = 'pendiente' OR c.estado IS NULL)
               AND COALESCE(c.saldo_pendiente, 0) > 0.01
             ORDER BY c.created_at DESC`
        );

        res.json(result.rows || []);
    } catch (error) {
        console.error('❌ Error en GET /creditos:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// GET /creditos/clientes - Obtener SOLO clientes con deuda
// ============================================
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
            WHERE COALESCE(c.saldo_pendiente, 0) > 0.01
            ORDER BY c.nombre
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en GET /creditos/clientes:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// GET /creditos/resumen - Resumen de créditos
// ============================================
router.get('/resumen', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                COUNT(*) as total_cuentas,
                COALESCE(SUM(total_venta), 0) as total_adeudado,
                COALESCE(SUM(saldo_pendiente), 0) as saldo_total,
                COALESCE(SUM(abonado), 0) as total_abonado
             FROM cuentas_por_cobrar 
             WHERE (estado = 'pendiente' OR estado IS NULL)
               AND COALESCE(saldo_pendiente, 0) > 0.01`
        );

        res.json(result.rows[0] || {
            total_cuentas: 0,
            total_adeudado: 0,
            saldo_total: 0,
            total_abonado: 0
        });
    } catch (error) {
        console.error('❌ Error en GET /creditos/resumen:', error.message);
        res.status(200).json({
            total_cuentas: 0,
            total_adeudado: 0,
            saldo_total: 0,
            total_abonado: 0
        });
    }
});

// ============================================
// GET /creditos/abonos/:cliente_id - Historial de abonos de un cliente
// ============================================
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
        console.error('❌ Error en GET /creditos/abonos/:cliente_id:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// POST /creditos/abonos - Registrar un abono
// ============================================
router.post('/abonos', async (req, res) => {
    const client = await pool.connect();
    try {
        const { cliente_id, monto, usuario_id, observacion } = req.body;

        if (!cliente_id || !monto || monto <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Cliente y monto son requeridos'
            });
        }

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

        await client.query('BEGIN');

        // Registrar el abono
        await client.query(
            `INSERT INTO abonos (cliente_id, monto, usuario_id, observacion, fecha)
             VALUES ($1, $2, $3, $4, NOW())`,
            [cliente_id, monto, usuario_id, observacion || '']
        );

        // Actualizar el saldo pendiente del cliente
        const result = await client.query(
            `UPDATE clientes 
             SET saldo_pendiente = COALESCE(saldo_pendiente, 0) - $1 
             WHERE id = $2
             RETURNING saldo_pendiente`,
            [monto, cliente_id]
        );

        // Buscar la cuenta con saldo pendiente y actualizarla
        const cuenta = await client.query(
            `SELECT id, total_venta, abonado, saldo_pendiente 
             FROM cuentas_por_cobrar 
             WHERE cliente_id = $1 AND estado = 'pendiente'
             ORDER BY created_at ASC
             LIMIT 1`,
            [cliente_id]
        );

        if (cuenta.rows.length > 0) {
            const cuentaId = cuenta.rows[0].id;
            const nuevoAbonado = parseFloat(cuenta.rows[0].abonado) + parseFloat(monto);
            const nuevoSaldo = parseFloat(cuenta.rows[0].total_venta) - nuevoAbonado;

            await client.query(
                `UPDATE cuentas_por_cobrar 
                 SET abonado = $1, 
                     saldo_pendiente = $2,
                     estado = $3
                 WHERE id = $4`,
                [
                    nuevoAbonado,
                    nuevoSaldo,
                    nuevoSaldo <= 0.01 ? 'pagado' : 'pendiente',
                    cuentaId
                ]
            );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: '✅ Abono registrado correctamente',
            nuevo_saldo: result.rows[0]?.saldo_pendiente || 0
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en POST /creditos/abonos:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

// ============================================
// PUT /creditos/:id/abonar - Abonar a una cuenta específica
// ============================================
router.put('/:id/abonar', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { monto, observacion } = req.body;

        if (!monto || monto <= 0) {
            return res.status(400).json({
                success: false,
                error: 'El monto debe ser mayor a 0'
            });
        }

        await client.query('BEGIN');

        const cuenta = await client.query(
            'SELECT * FROM cuentas_por_cobrar WHERE id = $1',
            [id]
        );

        if (cuenta.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Cuenta no encontrada'
            });
        }

        const cuentaActual = cuenta.rows[0];
        const nuevoAbonado = parseFloat(cuentaActual.abonado) + parseFloat(monto);
        const nuevoSaldo = parseFloat(cuentaActual.total_venta) - nuevoAbonado;

        await client.query(
            `UPDATE cuentas_por_cobrar 
             SET abonado = $1, 
                 saldo_pendiente = $2,
                 estado = $3
             WHERE id = $4`,
            [
                nuevoAbonado,
                nuevoSaldo,
                nuevoSaldo <= 0.01 ? 'pagado' : 'pendiente',
                id
            ]
        );

        await client.query(
            `INSERT INTO abonos (cliente_id, monto, usuario_id, observacion, fecha)
             VALUES ($1, $2, $3, $4, NOW())`,
            [cuentaActual.cliente_id, monto, null, observacion || '']
        );

        await client.query(
            `UPDATE clientes 
             SET saldo_pendiente = $1
             WHERE id = $2`,
            [nuevoSaldo, cuentaActual.cliente_id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: '✅ Abono registrado correctamente',
            nuevo_saldo: nuevoSaldo
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en PUT /creditos/:id/abonar:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

module.exports = router;