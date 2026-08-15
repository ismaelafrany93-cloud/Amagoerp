const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /gastos - Listar gastos
// ============================================
router.get('/', async (req, res) => {
    try {
        const { sucursal_id, categoria, fecha_inicio, fecha_fin } = req.query;
        
        let query = `
            SELECT 
                g.*,
                s.nombre as sucursal_nombre,
                u.nombre as creador_nombre
            FROM gastos_operativos g
            LEFT JOIN sucursales s ON g.sucursal_id = s.id
            LEFT JOIN usuarios u ON g.created_by = u.id
            WHERE 1=1
        `;
        let params = [];
        let paramCount = 1;
        
        if (sucursal_id) {
            query += ` AND g.sucursal_id = $${paramCount}`;
            params.push(parseInt(sucursal_id));
            paramCount++;
        }
        
        if (categoria) {
            query += ` AND g.categoria = $${paramCount}`;
            params.push(categoria);
            paramCount++;
        }
        
        if (fecha_inicio) {
            query += ` AND g.fecha >= $${paramCount}`;
            params.push(fecha_inicio);
            paramCount++;
        }
        
        if (fecha_fin) {
            query += ` AND g.fecha <= $${paramCount}`;
            params.push(fecha_fin);
            paramCount++;
        }
        
        query += ` ORDER BY g.fecha DESC, g.created_at DESC`;
        
        console.log('📝 Query gastos:', query);
        console.log('📊 Params:', params);
        
        const result = await pool.query(query, params);
        res.json(result.rows);
        
    } catch (error) {
        console.error('❌ Error en GET /gastos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// POST /gastos - Crear gasto
// ============================================
router.post('/', async (req, res) => {
    try {
        const {
            concepto, categoria, monto, fecha,
            metodo_pago, referencia, descripcion,
            sucursal_id, created_by
        } = req.body;
        
        const result = await pool.query(
            `INSERT INTO gastos_operativos (
                concepto, categoria, monto, fecha,
                metodo_pago, referencia, descripcion,
                sucursal_id, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [concepto, categoria, monto, fecha, metodo_pago, referencia, descripcion, parseInt(sucursal_id) || 3, created_by]
        );
        
        res.json({
            success: true,
            gasto: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error en POST /gastos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /gastos/resumen - Resumen de gastos (CORREGIDO)
// ============================================
router.get('/resumen', async (req, res) => {
    try {
        const { sucursal_id, periodo } = req.query;
        
        let fechaInicio;
        const hoy = new Date();
        
        switch(periodo) {
            case 'dia':
                fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
                break;
            case 'semana':
                const diaSemana = hoy.getDay();
                fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - diaSemana);
                break;
            case 'mes':
                fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                break;
            case 'ano':
                fechaInicio = new Date(hoy.getFullYear(), 0, 1);
                break;
            default:
                fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        }
        
        console.log('📊 Resumen gastos - Periodo:', periodo, 'Fecha inicio:', fechaInicio);
        
        // 👇 RESUMEN GENERAL - SIMPLIFICADO
        const resumenGeneral = await pool.query(
            `SELECT 
                COALESCE(SUM(g.monto), 0) as total_gastos,
                COUNT(*) as total_registros
            FROM gastos_operativos g
            WHERE g.fecha >= $1
            ${sucursal_id ? `AND g.sucursal_id = $2` : ''}`,
            [fechaInicio, ...(sucursal_id ? [parseInt(sucursal_id)] : [])]
        );
        
        // 👇 RESUMEN POR CATEGORÍA - SIMPLIFICADO
        const porCategoria = await pool.query(
            `SELECT 
                g.categoria,
                COALESCE(SUM(g.monto), 0) as total,
                COUNT(*) as cantidad
            FROM gastos_operativos g
            WHERE g.fecha >= $1
            ${sucursal_id ? `AND g.sucursal_id = $2` : ''}
            GROUP BY g.categoria
            ORDER BY g.categoria`,
            [fechaInicio, ...(sucursal_id ? [parseInt(sucursal_id)] : [])]
        );
        
        res.json({
            success: true,
            periodo: periodo,
            fecha_inicio: fechaInicio,
            total_gastos: resumenGeneral.rows[0]?.total_gastos || 0,
            total_registros: resumenGeneral.rows[0]?.total_registros || 0,
            por_categoria: porCategoria.rows || []
        });
        
    } catch (error) {
        console.error('❌ Error en GET /gastos/resumen:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PUT /gastos/:id - Actualizar gasto
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { concepto, categoria, monto, fecha, metodo_pago, referencia, descripcion } = req.body;
        
        const result = await pool.query(
            `UPDATE gastos_operativos 
             SET concepto = COALESCE($1, concepto),
                 categoria = COALESCE($2, categoria),
                 monto = COALESCE($3, monto),
                 fecha = COALESCE($4, fecha),
                 metodo_pago = COALESCE($5, metodo_pago),
                 referencia = COALESCE($6, referencia),
                 descripcion = COALESCE($7, descripcion),
                 updated_at = NOW()
             WHERE id = $8
             RETURNING *`,
            [concepto, categoria, monto, fecha, metodo_pago, referencia, descripcion, parseInt(id)]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }
        
        res.json({
            success: true,
            gasto: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error en PUT /gastos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// DELETE /gastos/:id - Eliminar gasto
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM gastos_operativos WHERE id = $1 RETURNING *',
            [parseInt(id)]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }
        
        res.json({
            success: true,
            message: 'Gasto eliminado correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error en DELETE /gastos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /gastos/categorias - Categorías de gastos
// ============================================
router.get('/categorias', async (req, res) => {
    res.json([
        { value: 'transporte', label: '🚚 Transporte' },
        { value: 'materiales', label: '🔧 Materiales' },
        { value: 'servicios', label: '⚡ Servicios' },
        { value: 'personal', label: '👤 Personal' },
        { value: 'administrativo', label: '📋 Administrativo' },
        { value: 'otros', label: '📦 Otros' }
    ]);
});

module.exports = router;