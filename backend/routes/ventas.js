const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /ventas - Obtener todas las ventas
// ============================================
router.get('/', async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        
        let query = `
            SELECT 
                v.id,
                v.usuario_id,
                v.sucursal_id,
                v.total,
                v.tipo_pago,
                v.tipo_venta,
                v.tipo_entrega,
                v.cliente_nombre,
                v.cliente_telefono,
                v.cliente_direccion,
                v.cliente_referencia,
                v.cliente_id,
                v.codigo_entrega,
                v.estado_entrega,
                v.detalles,
                v.costo_envio,
                v.descuento,
                v.codigo_autorizacion,
                v.autorizado,
                v.cliente_es_mayorista,
                v.estado,
                v.fecha,
                v.fecha_cancelacion,
                v.cancelado_por,
                v.motivo_cancelacion,
                c.nombre as cliente,
                u.nombre as vendedor,
                s.nombre as sucursal_nombre
            FROM ventas v
            LEFT JOIN clientes c ON v.cliente_id = c.id
            LEFT JOIN usuarios u ON v.usuario_id = u.id
            LEFT JOIN sucursales s ON v.sucursal_id = s.id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (sucursal_id) {
            query += ` AND v.sucursal_id = $${paramIndex}`;
            params.push(sucursal_id);
            paramIndex++;
        }

        query += ` ORDER BY v.id DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en GET /ventas:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// POST /ventas - Crear venta
// ============================================
router.post('/', async (req, res) => {
    try {
        const {
            usuario_id,
            carrito,
            total,
            tipo_pago,
            tipo_venta,
            tipo_entrega,
            cliente_nombre,
            cliente_telefono,
            cliente_direccion,
            cliente_referencia,
            cliente_id,
            detalles,
            costo_envio,
            descuento,
            codigo_autorizacion,
            cliente_es_mayorista
        } = req.body;

        const usuarioData = await pool.query(
            'SELECT sucursal_id, rol FROM usuarios WHERE id = $1',
            [usuario_id]
        );

        if (usuarioData.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const usuario = usuarioData.rows[0];

        let clienteId = cliente_id;

        if (cliente_nombre) {
            const clienteExistente = await pool.query(
                'SELECT id FROM clientes WHERE nombre ILIKE $1',
                [cliente_nombre]
            );

            if (clienteExistente.rows.length > 0) {
                clienteId = clienteExistente.rows[0].id;
                await pool.query(
                    'UPDATE clientes SET es_mayorista = $1 WHERE id = $2',
                    [cliente_es_mayorista || false, clienteId]
                );
            } else {
                const nuevoCliente = await pool.query(
                    `INSERT INTO clientes (nombre, telefono, direccion, es_mayorista) 
                     VALUES ($1, $2, $3, $4) 
                     RETURNING id`,
                    [cliente_nombre, cliente_telefono, cliente_direccion, cliente_es_mayorista || false]
                );
                clienteId = nuevoCliente.rows[0].id;
            }
        }

        // VERIFICAR AUTORIZACIÓN PARA DESCUENTO
        let autorizado = false;
        let descuentoAplicado = parseFloat(descuento) || 0;

        if (descuentoAplicado > 0) {
            const rolesPermitidos = ['dueno', 'dueño', 'subgerente', 'admin'];
            if (rolesPermitidos.includes(usuario.rol)) {
                autorizado = true;
            } else if (codigo_autorizacion) {
                const codigoValido = await pool.query(
                    'SELECT * FROM codigos_autorizacion WHERE codigo = $1 AND activo = true AND usado = false AND fecha_expiracion > NOW()',
                    [codigo_autorizacion]
                );
                if (codigoValido.rows.length > 0) {
                    autorizado = true;
                    await pool.query(
                        'UPDATE codigos_autorizacion SET usado = true WHERE codigo = $1',
                        [codigo_autorizacion]
                    );
                }
            }

            if (!autorizado) {
                return res.status(403).json({
                    success: false,
                    message: 'Descuento requiere autorización. Contacta al dueño o subgerente.'
                });
            }
        }

        let codigo = null;
        if (tipo_venta === 'credito' || tipo_entrega === 'domicilio') {
            let existe = true;
            while (existe) {
                codigo = generarCodigo();
                const check = await pool.query(
                    'SELECT id FROM ventas WHERE codigo_entrega = $1',
                    [codigo]
                );
                existe = check.rows.length > 0;
            }
        }

        const estadoEntrega = (tipo_venta === 'credito' || tipo_entrega === 'domicilio') ? 'pendiente' : 'retirado';
        const costoEnvioFinal = parseFloat(costo_envio) || 0;
        const totalFinal = parseFloat(total) + costoEnvioFinal - (parseFloat(total) * (descuentoAplicado / 100));

        const ventaResult = await pool.query(
            `INSERT INTO ventas (
                usuario_id, 
                sucursal_id,
                total, 
                tipo_pago, 
                tipo_venta, 
                tipo_entrega,
                cliente_nombre, 
                cliente_telefono, 
                cliente_direccion, 
                cliente_referencia,
                cliente_id, 
                codigo_entrega, 
                estado_entrega, 
                detalles,
                costo_envio, 
                descuento, 
                codigo_autorizacion, 
                autorizado,
                cliente_es_mayorista,
                estado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'completada')
            RETURNING *`,
            [
                usuario_id, 
                usuario.sucursal_id || 3,
                totalFinal, 
                tipo_pago, 
                tipo_venta, 
                tipo_entrega,
                cliente_nombre, 
                cliente_telefono, 
                cliente_direccion, 
                cliente_referencia,
                clienteId, 
                codigo, 
                estadoEntrega, 
                detalles,
                costoEnvioFinal, 
                descuentoAplicado, 
                codigo_autorizacion || null, 
                autorizado,
                cliente_es_mayorista || false
            ]
        );

        const ventaId = ventaResult.rows[0].id;

        for (const item of carrito) {
            await pool.query(
                `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio)
                 VALUES ($1, $2, $3, $4)`,
                [ventaId, item.id, item.cantidad || 1, item.precio]
            );
        }

        if (tipo_venta === 'contado' && tipo_entrega === 'retiro') {
            for (const item of carrito) {
                await pool.query(
                    `UPDATE producto_inventario 
                     SET stock = stock - $1 
                     WHERE producto_id = $2 AND sucursal_id = $3`,
                    [item.cantidad || 1, item.id, usuario.sucursal_id || 3]
                );
            }
        }

        if (tipo_venta === 'credito') {
            await pool.query(
                `INSERT INTO cuentas_por_cobrar (
                    cliente_id, venta_id, total_venta, abonado, saldo_pendiente, estado
                ) VALUES ($1, $2, $3, $4, $5, 'pendiente')`,
                [clienteId, ventaId, totalFinal, 0, totalFinal]
            );

            await pool.query(
                `UPDATE clientes 
                 SET saldo_pendiente = COALESCE(saldo_pendiente, 0) + $1 
                 WHERE id = $2`,
                [totalFinal, clienteId]
            );
        }

        if (tipo_entrega === 'domicilio') {
            await pool.query(
                `INSERT INTO entregas (venta_id, direccion, estado, codigo, fecha_salida)
                 VALUES ($1, $2, 'pendiente', $3, NOW())`,
                [ventaId, cliente_direccion, codigo]
            );
        }

        res.json({
            success: true,
            ventaId,
            clienteId,
            codigo: codigo,
            descuento_aplicado: descuentoAplicado,
            autorizado,
            total: totalFinal
        });

    } catch (error) {
        console.error('❌ Error en POST /ventas:', error.message);
        console.error('Detalles:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// GET /ventas/codigo/:codigo - Obtener venta por código
// ============================================
router.get('/codigo/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;

        const result = await pool.query(
            `SELECT v.*, u.nombre as vendedor
             FROM ventas v
             LEFT JOIN usuarios u ON v.usuario_id = u.id
             WHERE v.codigo_entrega = $1 AND v.estado_entrega = 'pendiente'`,
            [codigo]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Código no válido o ya entregado'
            });
        }

        const venta = result.rows[0];

        const detalles = await pool.query(
            `SELECT dv.*, p.nombre as producto_nombre
             FROM detalle_ventas dv
             JOIN productos p ON dv.producto_id = p.id
             WHERE dv.venta_id = $1`,
            [venta.id]
        );

        res.json({
            success: true,
            venta: {
                ...venta,
                detalles: detalles.rows
            }
        });

    } catch (error) {
        console.error('❌ Error en GET /ventas/codigo/:codigo:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /ventas/:id/reimprimir - Obtener datos para reimprimir
// ============================================
router.get('/:id/reimprimir', async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar la venta
        const ventaResult = await pool.query(
            `SELECT 
                v.*,
                u.nombre as vendedor_nombre,
                u.id as vendedor_id
            FROM ventas v
            LEFT JOIN usuarios u ON v.usuario_id = u.id
            WHERE v.id = $1`,
            [id]
        );

        if (ventaResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Venta no encontrada'
            });
        }

        const venta = ventaResult.rows[0];

        // Buscar los detalles de la venta
        const detallesResult = await pool.query(
            `SELECT 
                d.*,
                p.nombre as producto_nombre,
                p.precio as producto_precio
            FROM detalle_ventas d
            LEFT JOIN productos p ON d.producto_id = p.id
            WHERE d.venta_id = $1`,
            [id]
        );

        // Buscar la sucursal
        const sucursalResult = await pool.query(
            `SELECT nombre, direccion, telefono FROM sucursales WHERE id = $1`,
            [venta.sucursal_id || 3]
        );

        res.json({
            success: true,
            venta: venta,
            detalles: detallesResult.rows || [],
            sucursal: sucursalResult.rows[0] || { nombre: 'Sucursal Principal', direccion: '', telefono: '' }
        });
    } catch (error) {
        console.error('❌ Error en GET /ventas/:id/reimprimir:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// GET /ventas/usuario/:id - Obtener ventas de un usuario
// ============================================
router.get('/usuario/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT v.*, c.nombre as cliente
             FROM ventas v
             LEFT JOIN clientes c ON v.cliente_id = c.id
             WHERE v.usuario_id = $1
             ORDER BY v.fecha DESC`,
            [id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en GET /ventas/usuario/:id:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PUT /ventas/:id/cancelar - Cancelar una venta
// ============================================
router.put('/:id/cancelar', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { usuario_id, motivo } = req.body;

        const ventaResult = await pool.query(
            `SELECT v.*, u.sucursal_id as usuario_sucursal, u.rol as usuario_rol
             FROM ventas v
             JOIN usuarios u ON v.usuario_id = u.id
             WHERE v.id = $1`,
            [id]
        );

        if (ventaResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Venta no encontrada'
            });
        }

        const venta = ventaResult.rows[0];

        if (venta.estado === 'cancelada') {
            return res.status(400).json({
                success: false,
                message: 'Esta venta ya está cancelada'
            });
        }

        const usuario = await pool.query(
            'SELECT sucursal_id, rol FROM usuarios WHERE id = $1',
            [usuario_id]
        );

        if (usuario.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const usuarioData = usuario.rows[0];
        const esSubgerente = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuarioData.rol);
        const mismoVendedor = parseInt(venta.usuario_id) === parseInt(usuario_id);
        const mismaSucursal = parseInt(usuarioData.sucursal_id) === parseInt(venta.sucursal_id);

        if (!esSubgerente && !mismoVendedor && !mismaSucursal) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para cancelar esta venta.'
            });
        }

        await client.query('BEGIN');

        if (venta.tipo_venta === 'contado' && venta.tipo_entrega === 'retiro') {
            const detalles = await client.query(
                'SELECT * FROM detalle_ventas WHERE venta_id = $1',
                [id]
            );

            for (const item of detalles.rows) {
                await client.query(
                    `UPDATE producto_inventario 
                     SET stock = stock + $1, updated_at = NOW()
                     WHERE producto_id = $2 AND sucursal_id = $3`,
                    [item.cantidad, item.producto_id, venta.sucursal_id || 3]
                );

                await client.query(
                    `UPDATE productos SET stock = COALESCE(stock, 0) + $1 WHERE id = $2`,
                    [item.cantidad, item.producto_id]
                );
            }
        }

        if (venta.tipo_venta === 'credito') {
            await client.query(
                'UPDATE cuentas_por_cobrar SET estado = $1 WHERE venta_id = $2',
                ['cancelada', id]
            );
        }

        const entregaExiste = await client.query(
            'SELECT id FROM entregas WHERE venta_id = $1',
            [id]
        );

        if (entregaExiste.rows.length > 0) {
            await client.query(
                'UPDATE entregas SET estado = $1 WHERE venta_id = $2',
                ['cancelada', id]
            );
        }

        await client.query(
            `UPDATE ventas 
             SET estado = 'cancelada', 
                 fecha_cancelacion = NOW(), 
                 cancelado_por = $1,
                 motivo_cancelacion = $2
             WHERE id = $3`,
            [usuario_id, motivo || 'Cancelado por el usuario', id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: '✅ Venta cancelada correctamente. Stock devuelto al inventario.',
            venta_id: id
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en PUT /ventas/:id/cancelar:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

// ============================================
// FUNCIÓN PARA GENERAR CÓDIGO
// ============================================
function generarCodigo() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 8; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'AMG-' + codigo;
}

module.exports = router;