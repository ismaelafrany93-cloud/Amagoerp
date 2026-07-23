const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /produccion - Obtener todos los registros de producción
// ============================================
router.get('/', async (req, res) => {
    try {
        const { area_id, fecha } = req.query;
        
        let query = `
            SELECT 
                p.id,
                p.producto_id,
                p.operario,
                p.cantidad,
                p.fecha,
                p.observacion,
                p.foto,
                p.created_at,
                p.supervisor_id,
                p.area_id,
                p.sucursal_id,
                prod.nombre as producto_nombre,
                u.nombre as supervisor_nombre,
                a.nombre as area_nombre,
                a.icono as area_icono,
                a.color as area_color
            FROM produccion p
            LEFT JOIN productos prod ON p.producto_id = prod.id
            LEFT JOIN usuarios u ON p.supervisor_id = u.id
            LEFT JOIN areas a ON p.area_id = a.id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (area_id) {
            query += ` AND p.area_id = $${paramIndex}`;
            params.push(area_id);
            paramIndex++;
        }

        if (fecha) {
            query += ` AND DATE(p.fecha) = $${paramIndex}`;
            params.push(fecha);
            paramIndex++;
        }

        query += ` ORDER BY p.fecha DESC, p.id DESC LIMIT 200`;

        const result = await pool.query(query, params);
        res.json(result.rows || []);
    } catch (error) {
        console.error('❌ Error en GET /produccion:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// GET /produccion/areas - Obtener todas las áreas
// ============================================
router.get('/areas', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                a.*,
                COUNT(DISTINCT u.id) as total_supervisores,
                COUNT(DISTINCT p.id) as total_producciones,
                COALESCE(SUM(p.cantidad), 0) as total_unidades
             FROM areas a
             LEFT JOIN usuarios u ON u.area_id = a.id AND u.rol = 'supervisor'
             LEFT JOIN produccion p ON p.area_id = a.id
             GROUP BY a.id
             ORDER BY a.nombre`
        );
        res.json(result.rows || []);
    } catch (error) {
        console.error('❌ Error en GET /produccion/areas:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// GET /produccion/detalle-por-operario - Con filtro por área
// ============================================
router.get('/detalle-por-operario', async (req, res) => {
    try {
        const { fecha, area_id } = req.query;
        const fechaFinal = fecha || new Date().toISOString().split('T')[0];

        let query = `
            SELECT 
                p.operario,
                p.producto_id,
                prod.nombre as producto_nombre,
                COALESCE(SUM(p.cantidad), 0) as total_cantidad,
                COUNT(p.id) as numero_registros,
                a.nombre as area_nombre,
                a.id as area_id,
                a.icono as area_icono,
                a.color as area_color
            FROM produccion p
            LEFT JOIN productos prod ON p.producto_id = prod.id
            LEFT JOIN areas a ON p.area_id = a.id
            WHERE DATE(p.fecha) = $1
        `;
        let params = [fechaFinal];
        let paramIndex = 2;

        if (area_id) {
            query += ` AND p.area_id = $${paramIndex}`;
            params.push(area_id);
            paramIndex++;
        }

        query += ` GROUP BY p.operario, p.producto_id, prod.nombre, a.nombre, a.id, a.icono, a.color
                   ORDER BY p.operario, total_cantidad DESC`;

        const result = await pool.query(query, params);

        // Agrupar por operario
        const operariosMap = {};
        result.rows.forEach(row => {
            if (!operariosMap[row.operario]) {
                operariosMap[row.operario] = {
                    operario: row.operario,
                    total_general: 0,
                    area: row.area_nombre || 'Sin área',
                    area_id: row.area_id,
                    area_icono: row.area_icono || '🏭',
                    area_color: row.area_color || '#757575',
                    productos: []
                };
            }
            operariosMap[row.operario].productos.push({
                producto_id: row.producto_id,
                producto_nombre: row.producto_nombre || 'Producto sin nombre',
                cantidad: parseInt(row.total_cantidad),
                numero_registros: parseInt(row.numero_registros)
            });
            operariosMap[row.operario].total_general += parseInt(row.total_cantidad);
        });

        const resultado = Object.values(operariosMap).map(op => ({
            ...op,
            productos: op.productos.sort((a, b) => b.cantidad - a.cantidad)
        }));

        res.json(resultado || []);
    } catch (error) {
        console.error('❌ Error en GET /produccion/detalle-por-operario:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// GET /produccion/detalle-por-operario/fecha/:fecha - Detalle por fecha específica
// ============================================
router.get('/detalle-por-operario/fecha/:fecha', async (req, res) => {
    try {
        const { fecha } = req.params;
        const { area_id } = req.query;

        let query = `
            SELECT 
                p.operario,
                p.producto_id,
                prod.nombre as producto_nombre,
                COALESCE(SUM(p.cantidad), 0) as total_cantidad,
                COUNT(p.id) as numero_registros,
                a.nombre as area_nombre,
                a.id as area_id,
                a.icono as area_icono,
                a.color as area_color
            FROM produccion p
            LEFT JOIN productos prod ON p.producto_id = prod.id
            LEFT JOIN areas a ON p.area_id = a.id
            WHERE DATE(p.fecha) = $1
        `;
        let params = [fecha];
        let paramIndex = 2;

        if (area_id) {
            query += ` AND p.area_id = $${paramIndex}`;
            params.push(area_id);
            paramIndex++;
        }

        query += ` GROUP BY p.operario, p.producto_id, prod.nombre, a.nombre, a.id, a.icono, a.color
                   ORDER BY p.operario, total_cantidad DESC`;

        const result = await pool.query(query, params);

        // Agrupar por operario
        const operariosMap = {};
        result.rows.forEach(row => {
            if (!operariosMap[row.operario]) {
                operariosMap[row.operario] = {
                    operario: row.operario,
                    total_general: 0,
                    area: row.area_nombre || 'Sin área',
                    area_id: row.area_id,
                    area_icono: row.area_icono || '🏭',
                    area_color: row.area_color || '#757575',
                    productos: []
                };
            }
            operariosMap[row.operario].productos.push({
                producto_id: row.producto_id,
                producto_nombre: row.producto_nombre || 'Producto sin nombre',
                cantidad: parseInt(row.total_cantidad),
                numero_registros: parseInt(row.numero_registros)
            });
            operariosMap[row.operario].total_general += parseInt(row.total_cantidad);
        });

        const resultado = Object.values(operariosMap).map(op => ({
            ...op,
            productos: op.productos.sort((a, b) => b.cantidad - a.cantidad)
        }));

        res.json(resultado || []);
    } catch (error) {
        console.error('❌ Error en GET /produccion/detalle-por-operario/fecha/:fecha:', error.message);
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
            sucursal_id,
            area_id
        } = req.body;

        if (!operario || !productos || productos.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Operario y al menos un producto son requeridos'
            });
        }

        if (!area_id) {
            return res.status(400).json({
                success: false,
                error: 'Debes seleccionar un área de producción'
            });
        }

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

        // Verificar que el área existe
        const areaCheck = await client.query(
            'SELECT id, nombre, icono FROM areas WHERE id = $1',
            [area_id]
        );

        if (areaCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Área de producción no encontrada'
            });
        }

        for (const item of productos) {
            const result = await client.query(
                `INSERT INTO produccion 
                 (producto_id, operario, cantidad, observacion, supervisor_id, sucursal_id, fecha, area_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [
                    item.producto_id,
                    operario,
                    item.cantidad,
                    item.observacion || observacion_general || '',
                    supervisor_id || null,
                    sucursalFinal,
                    fechaFinal,
                    area_id
                ]
            );

            registrosCreados.push(result.rows[0]);

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
            message: `✅ ${registrosCreados.length} registros de producción creados en ${areaCheck.rows[0].nombre}`,
            registros: registrosCreados,
            total_productos: registrosCreados.reduce((acc, r) => acc + r.cantidad, 0),
            area: areaCheck.rows[0].nombre,
            area_icono: areaCheck.rows[0].icono || '🏭'
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
// POST /produccion - Crear registro único
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
            fecha,
            area_id
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
             (producto_id, operario, cantidad, observacion, supervisor_id, sucursal_id, fecha, area_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                producto_id, 
                operario, 
                cantidad, 
                observacion || '', 
                supervisor_id || null,
                sucursalFinal,
                fechaFinal,
                area_id || null
            ]
        );

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
            fecha,
            area_id
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

        await client.query(
            `UPDATE producto_inventario 
             SET stock = stock - $1
             WHERE producto_id = $2 AND sucursal_id = $3`,
            [produccionAnterior.cantidad, produccionAnterior.producto_id, sucursalFinal]
        );

        const result = await client.query(
            `UPDATE produccion 
             SET producto_id = $1, 
                 operario = $2, 
                 cantidad = $3, 
                 observacion = $4,
                 supervisor_id = $5,
                 sucursal_id = $6,
                 fecha = $7,
                 area_id = $8
             WHERE id = $9
             RETURNING *`,
            [
                producto_id, 
                operario, 
                cantidad, 
                observacion || '', 
                supervisor_id || null,
                sucursalFinal,
                fecha,
                area_id || null,
                id
            ]
        );

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

        await client.query(
            `UPDATE producto_inventario 
             SET stock = stock - $1
             WHERE producto_id = $2 AND sucursal_id = $3`,
            [produccion.cantidad, produccion.producto_id, sucursalFinal]
        );

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
        const { fecha, area_id } = req.query;
        const fechaFinal = fecha || new Date().toISOString().split('T')[0];

        let query = `
            SELECT 
                p.operario,
                a.nombre as area_nombre,
                a.icono as area_icono,
                a.color as area_color,
                COALESCE(SUM(p.cantidad), 0) as total_producido,
                COUNT(p.id) as numero_registros
            FROM produccion p
            LEFT JOIN areas a ON p.area_id = a.id
            WHERE DATE(p.fecha) = $1
        `;
        let params = [fechaFinal];
        let paramIndex = 2;

        if (area_id) {
            query += ` AND p.area_id = $${paramIndex}`;
            params.push(area_id);
            paramIndex++;
        }

        query += ` GROUP BY p.operario, a.nombre, a.icono, a.color
                   ORDER BY a.nombre, total_producido DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows || []);
    } catch (error) {
        console.error('❌ Error en GET /produccion/resumen:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// GET /produccion/operarios - Obtener SOLO OPERARIOS (CORREGIDO)
// ============================================
router.get('/operarios', async (req, res) => {
    try {
        const { area_id } = req.query;
        
        let query = `
            SELECT 
                u.id, 
                u.nombre, 
                u.rol, 
                u.sucursal_id, 
                u.area_id,
                a.nombre as area_nombre,
                a.icono as area_icono,
                a.color as area_color
            FROM usuarios u
            LEFT JOIN areas a ON u.area_id = a.id
            WHERE u.rol = 'operario'
        `;
        let params = [];
        
        if (area_id) {
            query += ` AND u.area_id = $1`;
            params.push(area_id);
        }
        
        query += ` ORDER BY u.nombre`;

        const result = await pool.query(query, params);
        res.json(result.rows || []);
    } catch (error) {
        console.error('❌ Error en GET /produccion/operarios:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// GET /produccion/estadisticas - Estadísticas por área
// ============================================
router.get('/estadisticas', async (req, res) => {
    try {
        const { area_id } = req.query;
        
        let query = `
            SELECT 
                a.id as area_id,
                a.nombre as area_nombre,
                a.icono as area_icono,
                a.color as area_color,
                COUNT(DISTINCT u.id) as total_supervisores,
                COUNT(DISTINCT p.operario) as total_operarios,
                COUNT(p.id) as total_registros,
                COALESCE(SUM(p.cantidad), 0) as total_unidades
             FROM areas a
             LEFT JOIN usuarios u ON u.area_id = a.id AND u.rol = 'supervisor'
             LEFT JOIN produccion p ON p.area_id = a.id
             WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (area_id) {
            query += ` AND a.id = $${paramIndex}`;
            params.push(area_id);
            paramIndex++;
        }

        query += ` GROUP BY a.id, a.nombre, a.icono, a.color
                   ORDER BY total_unidades DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows || []);
    } catch (error) {
        console.error('❌ Error en GET /produccion/estadisticas:', error.message);
        res.status(200).json([]);
    }
});

module.exports = router;