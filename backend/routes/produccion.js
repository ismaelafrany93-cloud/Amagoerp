const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /produccion - Obtener todos los registros de producción
// ============================================
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                p.id,
                p.producto_id,
                p.operario,
                p.cantidad,
                p.fecha,
                p.observacion,
                p.foto,
                p.created_at,
                p.supervisor_id,
                prod.nombre as producto_nombre,
                u.nombre as supervisor_nombre
            FROM produccion p
            LEFT JOIN productos prod ON p.producto_id = prod.id
            LEFT JOIN usuarios u ON p.supervisor_id = u.id
            ORDER BY p.fecha DESC, p.id DESC
            LIMIT 100`
        );
        
        console.log('📦 Producción encontrada:', result.rows.length);
        res.json(result.rows || []);
        
    } catch (error) {
        console.error('❌ Error en GET /produccion:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// GET /produccion/resumen - Resumen de producción por operario (hoy)
// ============================================
router.get('/resumen', async (req, res) => {
    try {
        const { fecha } = req.query;
        const fechaFinal = fecha || new Date().toISOString().split('T')[0];

        const result = await pool.query(
            `SELECT 
                p.operario,
                COALESCE(SUM(p.cantidad), 0) as total_producido
             FROM produccion p
             WHERE DATE(p.fecha) = $1
             GROUP BY p.operario
             ORDER BY total_producido DESC`,
            [fechaFinal]
        );

        res.json(result.rows || []);
    } catch (error) {
        console.error('❌ Error en GET /produccion/resumen:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// POST /produccion - Crear registro de producción
// ============================================
router.post('/', async (req, res) => {
    try {
        const { 
            producto_id, 
            operario, 
            cantidad, 
            observacion,
            supervisor_id,
            fecha
        } = req.body;

        if (!producto_id || !operario || !cantidad) {
            return res.status(400).json({
                success: false,
                error: 'Producto, operario y cantidad son requeridos'
            });
        }

        const fechaFinal = fecha || new Date().toISOString().split('T')[0];
        const sucursalFinal = 3;

        const result = await pool.query(
            `INSERT INTO produccion 
             (producto_id, operario, cantidad, observacion, supervisor_id, fecha)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                producto_id, 
                operario, 
                cantidad, 
                observacion || '', 
                supervisor_id || null,
                fechaFinal
            ]
        );

        // Actualizar stock en producto_inventario
        const existeInventario = await pool.query(
            'SELECT id FROM producto_inventario WHERE producto_id = $1 AND sucursal_id = $2',
            [producto_id, sucursalFinal]
        );

        if (existeInventario.rows.length > 0) {
            await pool.query(
                `UPDATE producto_inventario 
                 SET stock = stock + $1
                 WHERE producto_id = $2 AND sucursal_id = $3`,
                [cantidad, producto_id, sucursalFinal]
            );
        } else {
            await pool.query(
                `INSERT INTO producto_inventario (producto_id, sucursal_id, stock)
                 VALUES ($1, $2, $3)`,
                [producto_id, sucursalFinal, cantidad]
            );
        }

        res.json({
            success: true,
            produccion: result.rows[0],
            message: '✅ Producción registrada correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error en POST /produccion:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// PUT /produccion/:id - Editar registro de producción
// ============================================
router.put('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { 
            producto_id, 
            operario, 
            cantidad, 
            observacion,
            supervisor_id,
            fecha
        } = req.body;

        const existe = await client.query(
            'SELECT * FROM produccion WHERE id = $1',
            [id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Registro de producción no encontrado'
            });
        }

        const produccionAnterior = existe.rows[0];
        const sucursalFinal = 3;

        await client.query('BEGIN');

        // 1. Devolver stock anterior
        await client.query(
            `UPDATE producto_inventario 
             SET stock = stock - $1
             WHERE producto_id = $2 AND sucursal_id = $3`,
            [produccionAnterior.cantidad, produccionAnterior.producto_id, sucursalFinal]
        );

        // 2. Actualizar registro (SIN updated_at)
        const result = await client.query(
            `UPDATE produccion 
             SET producto_id = $1, 
                 operario = $2, 
                 cantidad = $3, 
                 observacion = $4,
                 supervisor_id = $5,
                 fecha = $6
             WHERE id = $7
             RETURNING *`,
            [
                producto_id, 
                operario, 
                cantidad, 
                observacion || '', 
                supervisor_id || null,
                fecha,
                id
            ]
        );

        // 3. Sumar nuevo stock
        await client.query(
            `UPDATE producto_inventario 
             SET stock = stock + $1
             WHERE producto_id = $2 AND sucursal_id = $3`,
            [cantidad, producto_id, sucursalFinal]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            produccion: result.rows[0],
            message: '✅ Producción actualizada correctamente'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en PUT /produccion/:id:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

// ============================================
// DELETE /produccion/:id - Eliminar registro de producción
// ============================================
router.delete('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        const existe = await client.query(
            'SELECT * FROM produccion WHERE id = $1',
            [id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Registro de producción no encontrado'
            });
        }

        const produccion = existe.rows[0];
        const sucursalFinal = 3;

        await client.query('BEGIN');

        // Devolver stock
        await client.query(
            `UPDATE producto_inventario 
             SET stock = stock - $1
             WHERE producto_id = $2 AND sucursal_id = $3`,
            [produccion.cantidad, produccion.producto_id, sucursalFinal]
        );

        // Eliminar registro
        await client.query('DELETE FROM produccion WHERE id = $1', [id]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: '✅ Registro de producción eliminado correctamente'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en DELETE /produccion/:id:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

module.exports = router;