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
                s.nombre as sucursal_nombre
            FROM cuentas_por_pagar c
            LEFT JOIN sucursales s ON c.sucursal_id = s.id
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
                COALESCE(SUM(c.monto), 0) as total_adeudado,
                COUNT(CASE WHEN c.estado = 'pendiente' THEN 1 END) as pendientes,
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
        
        const result = await pool.query(query, params);
        
        // Calcular total_pendiente y total_pagado
        const totalAdeudado = parseFloat(result.rows[0]?.total_adeudado || 0);
        
        res.json({
            total_cuentas: parseInt(result.rows[0]?.total_cuentas || 0),
            total_adeudado: totalAdeudado,
            total_pagado: 0, // No tenemos esta columna
            total_pendiente: totalAdeudado,
            pendientes: parseInt(result.rows[0]?.pendientes || 0),
            parciales: 0,
            pagados: parseInt(result.rows[0]?.pagados || 0)
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
            proveedor,
            monto,
            descripcion,
            fecha_vencimiento,
            sucursal_id,
            estado
        } = req.body;
        
        if (!proveedor || !monto) {
            return res.status(400).json({
                success: false,
                error: 'Proveedor y monto son requeridos'
            });
        }
        
        const result = await pool.query(
            `INSERT INTO cuentas_por_pagar (
                proveedor, monto, descripcion, fecha_vencimiento, 
                sucursal_id, estado
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                proveedor,
                parseFloat(monto),
                descripcion || '',
                fecha_vencimiento,
                parseInt(sucursal_id) || 3,
                estado || 'pendiente'
            ]
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
        const { proveedor, monto, descripcion, fecha_vencimiento, estado } = req.body;
        
        const result = await pool.query(
            `UPDATE cuentas_por_pagar 
             SET proveedor = COALESCE($1, proveedor),
                 monto = COALESCE($2, monto),
                 descripcion = COALESCE($3, descripcion),
                 fecha_vencimiento = COALESCE($4, fecha_vencimiento),
                 estado = COALESCE($5, estado),
                 updated_at = NOW()
             WHERE id = $6
             RETURNING *`,
            [proveedor, monto, descripcion, fecha_vencimiento, estado, parseInt(id)]
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