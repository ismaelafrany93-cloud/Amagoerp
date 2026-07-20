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
        
        res.json(result.rows || []);
    } catch (error) {
        console.error('❌ Error en GET /produccion:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// POST /produccion/multiple - Registrar producción múltiple
// ============================================
router.post('/multiple', async (req, res) => {
    const client = await pool.connect();
    try {
        const { 
            operario, 
            supervisor_id, 
            productos,
            fecha,
            observacion_general,
            sucursal_id
        } = req.body;

        if (!operario || !productos || productos.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Operario y al menos un producto son requeridos'
            });
        }

        // Validar que cada producto tenga cantidad
        for (const item of productos) {
            if (!item.producto_id || !item.cantidad || item.cantidad <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Cada producto debe tener una cantidad válida'
                });
            }
        }

        const fechaFinal = fecha || new Date().toISOString().split('T')[0];
        const sucursalFinal = sucursal_id || 3;
        const registrosCreados = [];

        await client.query('BEGIN');

        // Insertar cada producto como un registro separado
        for (const item of productos) {
            const result = await client.query(
                `INSERT INTO produccion 
                 (producto_id, operario, cantidad, observacion, supervisor_id, sucursal_id, fecha)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [
                    item.producto_id,
                    operario,
                    item.cantidad,
                    item.observacion || observacion_general || '',
                    supervisor_id || null,
                    sucursalFinal,
                    fechaFinal
                ]
            );

            registrosCreados.push(result.rows[0]);

            // Actualizar stock en producto_inventario
            const existeInventario = await client.query(
                'SELECT id FROM producto_inventario WHERE producto_id = $1 AND sucursal_id = $2',
                [item.producto_id, sucursalFinal]
            );

            if (existeInventario.rows.length > 0) {
                await client.query(
                    `UPDATE producto_inventario 
                     SET stock = stock + $1
                     WHERE producto_id = $2 AND sucursal_id = $3`,
                    [item.cantidad, item.producto_id, sucursalFinal]
                );
            } else {
                await client.query(
                    `INSERT INTO producto_inventario (producto_id, sucursal_id, stock)
                     VALUES ($1, $2, $3)`,
                    [item.producto_id, sucursalFinal, item.cantidad]
                );
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `✅ ${registrosCreados.length} registros de producción creados correctamente`,
            registros: registrosCreados,
            total_productos: registrosCreados.reduce((acc, r) => acc + r.cantidad, 0)
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en POST /produccion/multiple:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

// ============================================
// POST /produccion - Crear registro único (mantener compatibilidad)
// ============================================
router.post('/', async (req, res) => {
    try {
        const { 
            producto_id, 
            operario, 
            cantidad, 
            observacion,
            supervisor_id,
            sucursal_id,
            fecha
        } = req.body;

        if (!producto_id || !operario || !cantidad) {
            return res.status(400).json({
                success: false,
                error: 'Producto, operario y cantidad son requeridos'
            });
        }

        const fechaFinal = fecha || new Date().toISOString().split('T')[0];
        const sucursalFinal = sucursal_id || 3;

        const result = await pool.query(
            `INSERT INTO produccion 
             (producto_id, operario, cantidad, observacion, supervisor_id, sucursal_id, fecha)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                producto_id, 
                operario, 
                cantidad, 
                observacion || '', 
                supervisor_id || null,
                sucursalFinal,
                fechaFinal
            ]
        );

        // Actualizar stock
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
// PUT /produccion/:id - Editar registro
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
            sucursal_id,
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
        const sucursalFinal = sucursal_id || 3;

        await client.query('BEGIN');

        // Devolver stock anterior
        await client.query(
            `UPDATE producto_inventario 
             SET stock = stock - $1
             WHERE producto_id = $2 AND sucursal_id = $3`,
            [produccionAnterior.cantidad, produccionAnterior.producto_id, sucursalFinal]
        );

        // Actualizar registro
        const result = await client.query(
            `UPDATE produccion 
             SET producto_id = $1, 
                 operario = $2, 
                 cantidad = $3, 
                 observacion = $4,
                 supervisor_id = $5,
                 sucursal_id = $6,
                 fecha = $7
             WHERE id = $8
             RETURNING *`,
            [
                producto_id, 
                operario, 
                cantidad, 
                observacion || '', 
                supervisor_id || null,
                sucursalFinal,
                fecha,
                id
            ]
        );

        // Sumar nuevo stock
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
// DELETE /produccion/:id - Eliminar registro
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
        const sucursalFinal = produccion.sucursal_id || 3;

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

// ============================================
// GET /produccion/resumen - Resumen por operario
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
// GET /produccion/operarios - Obtener operarios
// ============================================
router.get('/operarios', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, nombre, rol, sucursal_id 
             FROM usuarios 
             WHERE rol = 'operario' OR rol = 'supervisor'
             ORDER BY nombre`
        );
        res.json(result.rows || []);
    } catch (error) {
        console.error('❌ Error en GET /produccion/operarios:', error.message);
        res.status(200).json([]);
    }
});

module.exports = router;