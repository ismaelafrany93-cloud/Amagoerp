const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /cuentas-pagar - Listar cuentas por pagar
// ============================================
router.get('/', async (req, res) => {
    try {
        const { sucursal_id, estado, fecha_inicio, fecha_fin } = req.query;
        
        let query = `
            SELECT 
                c.*,
                s.nombre as sucursal_nombre,
                u.nombre as creador_nombre
            FROM cuentas_por_pagar c
            LEFT JOIN sucursales s ON c.sucursal_id = s.id
            LEFT JOIN usuarios u ON c.created_by = u.id
            WHERE 1=1
        `;
        let params = [];
        let paramCount = 1;
        
        if (sucursal_id) {
            query += ` AND c.sucursal_id = $${paramCount}`;
            params.push(parseInt(sucursal_id));
            paramCount++;
        }
        
        if (estado) {
            query += ` AND c.estado = $${paramCount}`;
            params.push(estado);
            paramCount++;
        }
        
        if (fecha_inicio) {
            query += ` AND c.fecha_vencimiento >= $${paramCount}`;
            params.push(fecha_inicio);
            paramCount++;
        }
        
        if (fecha_fin) {
            query += ` AND c.fecha_vencimiento <= $${paramCount}`;
            params.push(fecha_fin);
            paramCount++;
        }
        
        query += ` ORDER BY c.fecha_vencimiento ASC, c.created_at DESC`;
        
        console.log('📝 Query cuentas-pagar:', query);
        console.log('📊 Params:', params);
        
        const result = await pool.query(query, params);
        res.json(result.rows);
        
    } catch (error) {
        console.error('❌ Error en GET /cuentas-pagar:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /cuentas-pagar/resumen - Resumen de cuentas
// ============================================
router.get('/resumen', async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        
        let query = `
            SELECT 
                COUNT(*) as total_cuentas,
                COALESCE(SUM(c.monto_total), 0) as total_adeudado,
                COALESCE(SUM(c.monto_pagado), 0) as total_pagado,
                COALESCE(SUM(c.monto_total - c.monto_pagado), 0) as total_pendiente,
                COUNT(CASE WHEN c.estado = 'pendiente' THEN 1 END) as pendientes,
                COUNT(CASE WHEN c.estado = 'parcial' THEN 1 END) as parciales,
                COUNT(CASE WHEN c.estado = 'pagado' THEN 1 END) as pagados
            FROM cuentas_por_pagar c
            WHERE 1=1
        `;
        let params = [];
        let paramCount = 1;
        
        if (sucursal_id) {
            query += ` AND c.sucursal_id = $${paramCount}`;
            params.push(parseInt(sucursal_id));
            paramCount++;
        }
        
        console.log('📝 Query resumen cuentas:', query);
        console.log('📊 Params:', params);
        
        const result = await pool.query(query, params);
        res.json(result.rows[0] || {
            total_cuentas: 0,
            total_adeudado: 0,
            total_pagado: 0,
            total_pendiente: 0,
            pendientes: 0,
            parciales: 0,
            pagados: 0
        });
        
    } catch (error) {
        console.error('❌ Error en GET /cuentas-pagar/resumen:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// POST /cuentas-pagar - Crear cuenta por pagar
// ============================================
router.post('/', async (req, res) => {
    try {
        const {
            proveedor, concepto, monto_total, fecha_emision,
            fecha_vencimiento, tipo, factura_numero, observaciones,
            sucursal_id, created_by
        } = req.body;
        
        const result = await pool.query(
            `INSERT INTO cuentas_por_pagar (
                proveedor, concepto, monto_total, monto_pagado,
                fecha_emision, fecha_vencimiento, tipo,
                factura_numero, observaciones, sucursal_id, created_by,
                estado
            ) VALUES ($1, $2, $3, 0, $4, $5, $6, $7, $8, $9, $10, 'pendiente')
            RETURNING *`,
            [proveedor, concepto, monto_total, fecha_emision, fecha_vencimiento, tipo, factura_numero, observaciones, parseInt(sucursal_id) || 3, created_by]
        );
        
        res.json({
            success: true,
            cuenta: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error en POST /cuentas-pagar:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PUT /cuentas-pagar/:id - Actualizar cuenta por pagar
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { monto_pagado, fecha_pago, estado, observaciones } = req.body;
        
        const result = await pool.query(
            `UPDATE cuentas_por_pagar 
             SET monto_pagado = COALESCE($1, monto_pagado),
                 fecha_pago = COALESCE($2, fecha_pago),
                 estado = COALESCE($3, 
                     CASE 
                         WHEN COALESCE($1, monto_pagado) >= monto_total THEN 'pagado'
                         WHEN COALESCE($1, monto_pagado) > 0 THEN 'parcial'
                         ELSE 'pendiente'
                     END
                 ),
                 observaciones = COALESCE($4, observaciones),
                 updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [monto_pagado, fecha_pago, estado, observaciones, parseInt(id)]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cuenta no encontrada' });
        }
        
        res.json({
            success: true,
            cuenta: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error en PUT /cuentas-pagar:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// DELETE /cuentas-pagar/:id - Eliminar cuenta por pagar
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM cuentas_por_pagar WHERE id = $1 RETURNING *',
            [parseInt(id)]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cuenta no encontrada' });
        }
        
        res.json({
            success: true,
            message: 'Cuenta eliminada correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error en DELETE /cuentas-pagar:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;