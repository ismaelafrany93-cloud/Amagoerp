const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /produccion - Obtener todos los registros de producción
// ============================================
router.get('/', async (req, res) => {
    try {
        const { sucursal_id, fecha } = req.query;
        
        let query = `
            SELECT 
                p.id,
                p.producto_id,
                p.operario_id,
                p.cantidad,
                p.fecha,
                p.observacion,
                p.created_at,
                p.updated_at,
                p.sucursal_id,
                prod.nombre as producto_nombre,
                u.nombre as operario_nombre,
                s.nombre as sucursal_nombre
            FROM produccion p
            LEFT JOIN productos prod ON p.producto_id = prod.id
            LEFT JOIN usuarios u ON p.operario_id = u.id
            LEFT JOIN sucursales s ON p.sucursal_id = s.id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (sucursal_id) {
            query += ` AND p.sucursal_id = $${paramIndex}`;
            params.push(sucursal_id);
            paramIndex++;
        }

        if (fecha) {
            query += ` AND DATE(p.fecha) = $${paramIndex}`;
            params.push(fecha);
            paramIndex++;
        }

        query += ` ORDER BY p.fecha DESC, p.id DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows || []);
        
    } catch (error) {
        console.error('❌ Error en GET /produccion:', error.message);
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
            operario_id, 
            cantidad, 
            observacion,
            sucursal_id,
            fecha
        } = req.body;

        if (!producto_id || !operario_id || !cantidad) {
            return res.status(400).json({
                success: false,
                error: 'Producto, operario y cantidad son requeridos'
            });
        }

        const fechaFinal = fecha || new Date().toISOString().split('T')[0];

        const result = await pool.query(
            `INSERT INTO produccion 
             (producto_id, operario_id, cantidad, observacion, sucursal_id, fecha)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                producto_id, 
                operario_id, 
                cantidad, 
                observacion || '', 
                sucursal_id || null,
                fechaFinal
            ]
        );

        // Actualizar stock en producto_inventario (sumar producción)
        if (sucursal_id) {
            const existeInventario = await pool.query(
                'SELECT id FROM producto_inventario WHERE producto_id = $1 AND sucursal_id = $2',
                [producto_id, sucursal_id]
            );

            if (existeInventario.rows.length > 0) {
                await pool.query(
                    `UPDATE producto_inventario 
                     SET stock = stock + $1
                     WHERE producto_id = $2 AND sucursal_id = $3`,
                    [cantidad, producto_id, sucursal_id]
                );
            } else {
                await pool.query(
                    `INSERT INTO producto_inventario (producto_id, sucursal_id, stock)
                     VALUES ($1, $2, $3)`,
                    [producto_id, sucursal_id, cantidad]
                );
            }
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
            operario_id, 
            cantidad, 
            observacion,
            sucursal_id,
            fecha
        } = req.body;

        // Verificar que el registro existe
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

        await client.query('BEGIN');

        // 1. Devolver stock anterior (restar)
        if (produccionAnterior.sucursal_id) {
            await client.query(
                `UPDATE producto_inventario 
                 SET stock = stock - $1
                 WHERE producto_id = $2 AND sucursal_id = $3`,
                [produccionAnterior.cantidad, produccionAnterior.producto_id, produccionAnterior.sucursal_id]
            );
        }

        // 2. Actualizar el registro
        const result = await client.query(
            `UPDATE produccion 
             SET producto_id = $1, 
                 operario_id = $2, 
                 cantidad = $3, 
                 observacion = $4,
                 sucursal_id = $5,
                 fecha = $6,
                 updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [
                producto_id, 
                operario_id, 
                cantidad, 
                observacion || '', 
                sucursal_id || null,
                fecha,
                id
            ]
        );

        // 3. Sumar nuevo stock
        if (sucursal_id) {
            const existeInventario = await client.query(
                'SELECT id FROM producto_inventario WHERE producto_id = $1 AND sucursal_id = $2',
                [producto_id, sucursal_id]
            );

            if (existeInventario.rows.length > 0) {
                await client.query(
                    `UPDATE producto_inventario 
                     SET stock = stock + $1
                     WHERE producto_id = $2 AND sucursal_id = $3`,
                    [cantidad, producto_id, sucursal_id]
                );
            } else {
                await client.query(
                    `INSERT INTO producto_inventario (producto_id, sucursal_id, stock)
                     VALUES ($1, $2, $3)`,
                    [producto_id, sucursal_id, cantidad]
                );
            }
        }

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

        // Verificar que el registro existe
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

        await client.query('BEGIN');

        // Devolver stock (restar la producción eliminada)
        if (produccion.sucursal_id) {
            await client.query(
                `UPDATE producto_inventario 
                 SET stock = stock - $1
                 WHERE producto_id = $2 AND sucursal_id = $3`,
                [produccion.cantidad, produccion.producto_id, produccion.sucursal_id]
            );
        }

        // Eliminar el registro
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