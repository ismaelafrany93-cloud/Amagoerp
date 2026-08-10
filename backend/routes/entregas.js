const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /entregas - Obtener todas las entregas con filtros
// ============================================
router.get('/', async (req, res) => {
    try {
        const { sucursal_id, codigo, estado } = req.query;
        
        let query = `
            SELECT 
                e.id,
                e.venta_id,
                e.direccion,
                e.estado,
                e.codigo,
                e.fecha_salida,
                e.fecha_entrega,
                e.created_at,
                e.chofer_id,
                e.comentario,
                v.cliente_nombre,
                v.cliente_telefono,
                v.total,
                v.sucursal_id,
                s.nombre as sucursal_nombre,
                u.nombre as chofer_nombre
            FROM entregas e
            JOIN ventas v ON e.venta_id = v.id
            LEFT JOIN sucursales s ON v.sucursal_id = s.id
            LEFT JOIN usuarios u ON e.chofer_id = u.id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (sucursal_id) {
            query += ` AND v.sucursal_id = $${paramIndex}`;
            params.push(sucursal_id);
            paramIndex++;
        }

        if (codigo) {
            query += ` AND e.codigo ILIKE $${paramIndex}`;
            params.push(`%${codigo}%`);
            paramIndex++;
        }

        if (estado) {
            query += ` AND e.estado = $${paramIndex}`;
            params.push(estado);
            paramIndex++;
        }

        query += ` ORDER BY e.id DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en GET /entregas:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// GET /entregas/pendientes - Obtener entregas pendientes
// ============================================
router.get('/pendientes', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                e.*, 
                v.cliente_nombre, 
                v.cliente_direccion, 
                v.cliente_telefono,
                v.total
             FROM entregas e
             JOIN ventas v ON e.venta_id = v.id
             WHERE e.estado = 'pendiente'
             ORDER BY e.created_at ASC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en GET /entregas/pendientes:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /entregas/codigo/:codigo - Buscar entrega por código (ALFANUMÉRICO)
// ============================================
router.get('/codigo/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;

        const result = await pool.query(
            `SELECT 
                e.*, 
                v.cliente_nombre, 
                v.cliente_direccion, 
                v.cliente_telefono, 
                v.cliente_referencia, 
                v.total,
                v.sucursal_id
             FROM entregas e
             JOIN ventas v ON e.venta_id = v.id
             WHERE e.codigo = $1 AND e.estado = 'pendiente'`,
            [codigo]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Código no válido o ya entregado'
            });
        }

        const entrega = result.rows[0];

        const detalles = await pool.query(
            `SELECT dv.*, p.nombre as producto_nombre
             FROM detalle_ventas dv
             JOIN productos p ON dv.producto_id = p.id
             WHERE dv.venta_id = $1`,
            [entrega.venta_id]
        );

        res.json({
            success: true,
            entrega: {
                ...entrega,
                detalles: detalles.rows
            }
        });

    } catch (error) {
        console.error('❌ Error en GET /entregas/codigo/:codigo:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// POST /entregas/confirmar - Confirmar entrega
// ============================================
router.post('/confirmar', async (req, res) => {
    try {
        const { codigo, entregado, motivo, recibido_por, chofer_id } = req.body;

        console.log('📝 Confirmando entrega:', { codigo, entregado, motivo, chofer_id });

        const entregaResult = await pool.query(
            'SELECT * FROM entregas WHERE codigo = $1 AND estado = $2',
            [codigo, 'pendiente']
        );

        if (entregaResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Código no encontrado o ya procesado'
            });
        }

        const entrega = entregaResult.rows[0];
        const ventaId = entrega.venta_id;

        const ventaData = await pool.query(
            `SELECT cliente_nombre, cliente_telefono, cliente_direccion, sucursal_id
             FROM ventas WHERE id = $1`,
            [ventaId]
        );

        if (entregado) {
            console.log('✅ Marcando como entregado:', codigo);

            await pool.query(
                `UPDATE entregas 
                 SET estado = 'entregada', 
                     fecha_entrega = NOW(), 
                     chofer_id = $1
                 WHERE codigo = $2`,
                [chofer_id, codigo]
            );

            await pool.query(
                `UPDATE ventas SET estado_entrega = 'entregado', fecha_entrega = NOW()
                 WHERE id = $1`,
                [ventaId]
            );

            const detalles = await pool.query(
                'SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = $1',
                [ventaId]
            );

            for (const item of detalles.rows) {
                await pool.query(
                    `UPDATE producto_inventario 
                     SET stock = stock - $1 
                     WHERE producto_id = $2 AND sucursal_id = $3`,
                    [item.cantidad, item.producto_id, ventaData.rows[0].sucursal_id || 3]
                );
            }

            res.json({
                success: true,
                message: '✅ Entrega confirmada y stock actualizado'
            });

        } else {
            console.log('❌ Marcando como NO entregado:', codigo);
            console.log('📝 Motivo:', motivo);

            const recibidoPorFinal = recibido_por || 'Chofer';

            await pool.query(
                `UPDATE entregas 
                 SET estado = 'cancelada', 
                     comentario = $1, 
                     chofer_id = $2,
                     fecha_entrega = NOW()
                 WHERE codigo = $3`,
                [motivo || 'No entregado', chofer_id, codigo]
            );

            await pool.query(
                `UPDATE ventas SET estado_entrega = 'fallido' 
                 WHERE id = $1`,
                [ventaId]
            );

            try {
                console.log('📝 Insertando en productos_no_entregados...');
                
                await pool.query(
                    `INSERT INTO productos_no_entregados (
                        entrega_id, 
                        venta_id, 
                        cliente_nombre, 
                        cliente_telefono, 
                        cliente_direccion, 
                        codigo, 
                        motivo, 
                        recibido_por,
                        fecha,
                        estado
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), 'pendiente')`,
                    [
                        entrega.id,
                        ventaId,
                        ventaData.rows[0]?.cliente_nombre || 'N/A',
                        ventaData.rows[0]?.cliente_telefono || 'N/A',
                        ventaData.rows[0]?.cliente_direccion || 'N/A',
                        codigo,
                        motivo || 'No entregado',
                        recibidoPorFinal
                    ]
                );
                
                console.log('✅ Registro en productos_no_entregados creado exitosamente');

            } catch (insertError) {
                console.error('❌ Error al insertar en productos_no_entregados:', insertError.message);
            }

            res.json({
                success: true,
                message: '❌ No entrega registrada'
            });
        }

    } catch (error) {
        console.error('❌ Error en POST /entregas/confirmar:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// PUT /entregas/:id/entregar - Marcar entrega como entregada (CON REGISTRO DE CHOFER)
// ============================================
router.put('/:id/entregar', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('🚚 PUT /entregas/:id/entregar - ID:', id);

        // Obtener el usuario de la sesión (chofer)
        const usuario = req.user || {};
        const choferId = usuario?.id || req.body.chofer_id || null;

        if (!choferId) {
            return res.status(400).json({
                success: false,
                message: 'ID de chofer requerido'
            });
        }

        // Verificar que la entrega existe
        const existe = await pool.query(
            'SELECT id, estado, venta_id, codigo FROM entregas WHERE id = $1',
            [id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Entrega no encontrada'
            });
        }

        if (existe.rows[0].estado === 'entregada') {
            return res.status(400).json({
                success: false,
                message: 'Esta entrega ya fue completada'
            });
        }

        // Verificar que el chofer existe
        const choferCheck = await pool.query(
            'SELECT id, nombre, rol FROM usuarios WHERE id = $1',
            [choferId]
        );

        if (choferCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Chofer no encontrado'
            });
        }

        const chofer = choferCheck.rows[0];
        console.log('✅ Chofer encontrado:', chofer.nombre, 'Rol:', chofer.rol);

        const ventaId = existe.rows[0].venta_id;
        const codigo = existe.rows[0].codigo;

        // ACTUALIZAR ENTREGA - GUARDANDO EL CHOFER_ID
        await pool.query(
            `UPDATE entregas 
             SET estado = 'entregada', 
                 fecha_entrega = NOW(), 
                 chofer_id = $1,
                 comentario = COALESCE(comentario, '') || ' | Entregado por: ' || $2
             WHERE id = $3`,
            [choferId, chofer.nombre, id]
        );

        // Actualizar venta
        await pool.query(
            `UPDATE ventas SET estado_entrega = 'entregado', fecha_entrega = NOW()
             WHERE id = $1`,
            [ventaId]
        );

        // Descontar inventario
        const detalles = await pool.query(
            'SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = $1',
            [ventaId]
        );

        const ventaData = await pool.query(
            'SELECT sucursal_id FROM ventas WHERE id = $1',
            [ventaId]
        );
        const sucursalId = ventaData.rows[0]?.sucursal_id || 3;

        for (const item of detalles.rows) {
            await pool.query(
                `UPDATE producto_inventario 
                 SET stock = stock - $1 
                 WHERE producto_id = $2 AND sucursal_id = $3`,
                [item.cantidad, item.producto_id, sucursalId]
            );
        }

        console.log('✅ Entrega marcada como entregada por:', chofer.nombre, '(ID:', choferId, ')');

        res.json({
            success: true,
            message: `✅ Entrega ${codigo} marcada como completada por ${chofer.nombre}`,
            entrega: {
                id: id,
                estado: 'entregada',
                chofer_id: choferId,
                chofer_nombre: chofer.nombre,
                codigo: codigo
            }
        });

    } catch (error) {
        console.error('❌ Error en PUT /entregas/:id/entregar:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// GET /entregas/no-entregados - Obtener productos no entregados
// ============================================
router.get('/no-entregados', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                id,
                entrega_id,
                venta_id,
                cliente_nombre,
                cliente_telefono,
                cliente_direccion,
                codigo,
                motivo,
                recibido_por,
                fecha,
                estado
             FROM productos_no_entregados 
             ORDER BY fecha DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en GET /entregas/no-entregados:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PUT /entregas/no-entregados/:id - Marcar como revisado
// ============================================
router.put('/no-entregados/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            `UPDATE productos_no_entregados SET estado = 'revisado' WHERE id = $1`,
            [id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error en PUT /entregas/no-entregados/:id:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /entregas/por-codigo/:codigo - Búsqueda rápida por código
// ============================================
router.get('/por-codigo/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;

        const result = await pool.query(
            `SELECT 
                e.*,
                v.cliente_nombre,
                v.cliente_telefono,
                v.cliente_direccion,
                v.total,
                v.sucursal_id,
                s.nombre as sucursal_nombre
             FROM entregas e
             JOIN ventas v ON e.venta_id = v.id
             LEFT JOIN sucursales s ON v.sucursal_id = s.id
             WHERE e.codigo ILIKE $1`,
            [`%${codigo}%`]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en GET /entregas/por-codigo/:codigo:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;