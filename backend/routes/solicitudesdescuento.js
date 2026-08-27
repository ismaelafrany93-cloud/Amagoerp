const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /solicitudes-descuento - Listar solicitudes
// ============================================
router.get('/', async (req, res) => {
    try {
        const { estado, sucursal_id } = req.query;
        
        let query = `
            SELECT 
                s.*,
                u_solicitante.nombre as solicitante_nombre,
                u_autorizador.nombre as autorizador_nombre,
                v.total as venta_total,
                v.cliente_nombre,
                v.codigo_entrega
            FROM solicitudes_descuento s
            LEFT JOIN usuarios u_solicitante ON s.usuario_solicitante = u_solicitante.id
            LEFT JOIN usuarios u_autorizador ON s.usuario_autorizador = u_autorizador.id
            LEFT JOIN ventas v ON s.venta_id = v.id
            WHERE 1=1
        `;
        let params = [];
        let paramCount = 1;
        
        if (estado) {
            query += ` AND s.estado = $${paramCount}`;
            params.push(estado);
            paramCount++;
        }
        
        if (sucursal_id) {
            query += ` AND v.sucursal_id = $${paramCount}`;
            params.push(sucursal_id);
            paramCount++;
        }
        
        query += ` ORDER BY s.fecha_solicitud DESC`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
        
    } catch (error) {
        console.error('❌ Error en GET /solicitudes-descuento:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /solicitudes-descuento/:id - Obtener una solicitud
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            `SELECT 
                s.*,
                u_solicitante.nombre as solicitante_nombre,
                u_autorizador.nombre as autorizador_nombre,
                v.total as venta_total,
                v.cliente_nombre
            FROM solicitudes_descuento s
            LEFT JOIN usuarios u_solicitante ON s.usuario_solicitante = u_solicitante.id
            LEFT JOIN usuarios u_autorizador ON s.usuario_autorizador = u_autorizador.id
            LEFT JOIN ventas v ON s.venta_id = v.id
            WHERE s.id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Solicitud no encontrada'
            });
        }
        
        res.json({
            success: true,
            solicitud: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error en GET /solicitudes-descuento/:id:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /solicitudes-descuento/pendientes - Obtener pendientes
// ============================================
router.get('/pendientes', async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        
        let query = `
            SELECT 
                s.*,
                u_solicitante.nombre as solicitante_nombre,
                v.total as venta_total,
                v.cliente_nombre,
                v.codigo_entrega
            FROM solicitudes_descuento s
            LEFT JOIN usuarios u_solicitante ON s.usuario_solicitante = u_solicitante.id
            LEFT JOIN ventas v ON s.venta_id = v.id
            WHERE s.estado = 'pendiente'
        `;
        let params = [];
        let paramCount = 1;
        
        if (sucursal_id) {
            query += ` AND v.sucursal_id = $${paramCount}`;
            params.push(sucursal_id);
            paramCount++;
        }
        
        query += ` ORDER BY s.fecha_solicitud ASC`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
        
    } catch (error) {
        console.error('❌ Error en GET /solicitudes-descuento/pendientes:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// POST /solicitudes-descuento - Crear solicitud de descuento
// ============================================
router.post('/', async (req, res) => {
    try {
        const { 
            venta_id, 
            monto_solicitado, 
            motivo,
            usuario_solicitante
        } = req.body;
        
        if (!venta_id || !monto_solicitado || !usuario_solicitante) {
            return res.status(400).json({
                success: false,
                error: 'Venta, monto y usuario solicitante son requeridos'
            });
        }
        
        // Verificar que la venta existe
        const ventaCheck = await pool.query(
            'SELECT id, total, cliente_nombre FROM ventas WHERE id = $1',
            [venta_id]
        );
        
        if (ventaCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Venta no encontrada'
            });
        }
        
        const venta = ventaCheck.rows[0];
        
        // Verificar que el monto no exceda el total de la venta
        if (parseFloat(monto_solicitado) > parseFloat(venta.total)) {
            return res.status(400).json({
                success: false,
                error: 'El descuento no puede ser mayor al total de la venta'
            });
        }
        
        // Generar código de autorización
        const codigo = `DESC-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        const result = await pool.query(
            `INSERT INTO solicitudes_descuento (
                venta_id,
                usuario_solicitante,
                monto_solicitado,
                motivo,
                codigo_autorizacion,
                estado
            ) VALUES ($1, $2, $3, $4, $5, 'pendiente')
            RETURNING *`,
            [venta_id, usuario_solicitante, monto_solicitado, motivo || '', codigo]
        );
        
        // Actualizar la venta con la referencia a la solicitud
        await pool.query(
            `UPDATE ventas 
             SET solicitud_descuento_id = $1,
                 descuento_monto = 0,
                 descuento_aprobado = false
             WHERE id = $2`,
            [result.rows[0].id, venta_id]
        );
        
        res.json({
            success: true,
            message: '✅ Solicitud de descuento enviada correctamente',
            solicitud: result.rows[0],
            codigo: codigo
        });
        
    } catch (error) {
        console.error('❌ Error en POST /solicitudes-descuento:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PUT /solicitudes-descuento/:id - Aprobar/Rechazar solicitud
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            estado, 
            usuario_autorizador,
            monto_aprobado
        } = req.body;
        
        if (!estado || !usuario_autorizador) {
            return res.status(400).json({
                success: false,
                error: 'Estado y usuario autorizador son requeridos'
            });
        }
        
        if (!['aprobado', 'rechazado'].includes(estado)) {
            return res.status(400).json({
                success: false,
                error: 'Estado no válido. Use "aprobado" o "rechazado"'
            });
        }
        
        // Verificar que la solicitud existe y está pendiente
        const solicitudCheck = await pool.query(
            'SELECT * FROM solicitudes_descuento WHERE id = $1',
            [id]
        );
        
        if (solicitudCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Solicitud no encontrada'
            });
        }
        
        const solicitud = solicitudCheck.rows[0];
        
        if (solicitud.estado !== 'pendiente') {
            return res.status(400).json({
                success: false,
                error: 'Esta solicitud ya fue procesada'
            });
        }
        
        // Actualizar solicitud
        const montoFinal = estado === 'aprobado' ? (monto_aprobado || solicitud.monto_solicitado) : 0;
        
        const result = await pool.query(
            `UPDATE solicitudes_descuento 
             SET estado = $1,
                 usuario_autorizador = $2,
                 monto_aprobado = $3,
                 fecha_respuesta = NOW(),
                 updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [estado, usuario_autorizador, montoFinal, id]
        );
        
        // Si fue aprobado, actualizar la venta con el descuento
        if (estado === 'aprobado') {
            await pool.query(
                `UPDATE ventas 
                 SET descuento_monto = $1,
                     descuento_aprobado = true,
                     descuento = CASE 
                         WHEN total > 0 THEN (($1 / total) * 100)
                         ELSE 0
                     END,
                     codigo_autorizacion = $2
                 WHERE id = $3`,
                [montoFinal, solicitud.codigo_autorizacion, solicitud.venta_id]
            );
        }
        
        res.json({
            success: true,
            message: estado === 'aprobado' ? '✅ Descuento aprobado' : '❌ Descuento rechazado',
            solicitud: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error en PUT /solicitudes-descuento:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /solicitudes-descuento/contador - Contador de pendientes
// ============================================
router.get('/contador', async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        
        let query = `
            SELECT COUNT(*) as pendientes
            FROM solicitudes_descuento s
            LEFT JOIN ventas v ON s.venta_id = v.id
            WHERE s.estado = 'pendiente'
        `;
        let params = [];
        let paramCount = 1;
        
        if (sucursal_id) {
            query += ` AND v.sucursal_id = $${paramCount}`;
            params.push(sucursal_id);
            paramCount++;
        }
        
        const result = await pool.query(query, params);
        res.json({ pendientes: parseInt(result.rows[0]?.pendientes || 0) });
        
    } catch (error) {
        console.error('❌ Error en GET /solicitudes-descuento/contador:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;