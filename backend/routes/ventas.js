const express = require('express');
const router = express.Router();
const pool = require('../db');

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

// ============================================
// GET /ventas - Obtener todas las ventas
// ============================================
router.get('/', async (req, res) => {
    try {
        const { sucursal_id, limite } = req.query;
        
        console.log('📡 GET /ventas - Params:', { sucursal_id, limite });
        
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
                v.descuento_monto,
                v.descuento_aprobado,
                v.codigo_autorizacion,
                v.autorizado,
                v.cliente_es_mayorista,
                v.estado,
                v.fecha,
                v.fecha_cancelacion,
                v.cancelado_por,
                v.motivo_cancelacion,
                v.solicitud_descuento_id,
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

        if (limite) {
            query += ` LIMIT $${paramIndex}`;
            params.push(limite);
            paramIndex++;
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en GET /ventas:', error.message);
        res.json([]);
    }
});

// ============================================
// GET /ventas/recientes - Obtener ventas recientes
// ============================================
router.get('/recientes', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        console.log('📡 GET /ventas/recientes - Limit:', limit);
        
        const tableCheck = await pool.query(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas')"
        );
        
        if (!tableCheck.rows[0].exists) {
            console.log('⚠️ Tabla ventas no existe');
            return res.json([]);
        }
        
        // ✅ CORREGIDO: Usar v.id en lugar de v.created_at
        const query = `
            SELECT 
                v.id,
                v.total,
                v.cliente_nombre,
                v.fecha,
                v.tipo_pago,
                v.tipo_entrega,
                v.estado,
                v.codigo_entrega,
                u.nombre as vendedor_nombre,
                v.sucursal_id
            FROM ventas v
            LEFT JOIN usuarios u ON v.usuario_id = u.id
            ORDER BY v.id DESC
            LIMIT $1
        `;
        
        const result = await pool.query(query, [parseInt(limit)]);
        
        console.log(`✅ Encontradas ${result.rows.length} ventas recientes`);
        res.json(result.rows);
        
    } catch (error) {
        console.error('❌ Error en GET /ventas/recientes:', error.message);
        res.json([]);
    }
});

// ============================================
// GET /ventas/:id - Obtener venta por ID
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const ventaResult = await pool.query(
            `SELECT 
                v.*,
                u.nombre as vendedor_nombre,
                s.nombre as sucursal_nombre
            FROM ventas v
            LEFT JOIN usuarios u ON v.usuario_id = u.id
            LEFT JOIN sucursales s ON v.sucursal_id = s.id
            WHERE v.id = $1`,
            [id]
        );

        if (ventaResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Venta no encontrada'
            });
        }

        const detallesResult = await pool.query(
            `SELECT 
                dv.*,
                p.nombre as producto_nombre
            FROM detalle_ventas dv
            JOIN productos p ON dv.producto_id = p.id
            WHERE dv.venta_id = $1`,
            [id]
        );

        res.json({
            success: true,
            venta: ventaResult.rows[0],
            detalles: detallesResult.rows
        });
    } catch (error) {
        console.error('❌ Error en GET /ventas/:id:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// POST /ventas - Crear venta (CON BLOQUEO DE SOLICITUD PENDIENTE)
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
            descuento_monto,
            descuento_aprobado,
            codigo_autorizacion,
            cliente_es_mayorista,
            estado,
            solicitud_descuento_id
        } = req.body;

        console.log('📝 Creando venta:', { 
            cliente_nombre, 
            total, 
            tipo_pago, 
            descuento_monto: descuento_monto || 0,
            descuento_aprobado: descuento_aprobado || false,
            solicitud_descuento_id: solicitud_descuento_id || null
        });

        // 👇 VERIFICAR SI HAY UNA SOLICITUD PENDIENTE - BLOQUEO
        if (solicitud_descuento_id && !descuento_aprobado) {
            const solicitudCheck = await pool.query(
                'SELECT estado FROM solicitudes_descuento WHERE id = $1',
                [solicitud_descuento_id]
            );
            
            if (solicitudCheck.rows.length > 0 && solicitudCheck.rows[0].estado === 'pendiente') {
                return res.status(403).json({
                    success: false,
                    error: 'Esta venta tiene una solicitud de descuento pendiente de aprobación. Espera la autorización del administrador.'
                });
            }
        }

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
        const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario.rol);

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

        // Validar descuento
        let descuentoAplicado = 0;
        let autorizado = false;
        let descuentoPorcentaje = 0;
        const montoDescuento = parseFloat(descuento_monto) || 0;

        if (montoDescuento > 0) {
            // Si hay una solicitud de descuento aprobada
            if (solicitud_descuento_id && descuento_aprobado) {
                const solicitudCheck = await pool.query(
                    'SELECT estado, monto_aprobado FROM solicitudes_descuento WHERE id = $1',
                    [solicitud_descuento_id]
                );
                
                if (solicitudCheck.rows.length > 0 && solicitudCheck.rows[0].estado === 'aprobado') {
                    autorizado = true;
                    descuentoAplicado = parseFloat(solicitudCheck.rows[0].monto_aprobado) || montoDescuento;
                } else {
                    return res.status(403).json({
                        success: false,
                        message: 'La solicitud de descuento no está aprobada'
                    });
                }
            } 
            // Si es admin, puede aplicar descuento directo
            else if (esAdmin) {
                autorizado = true;
                descuentoAplicado = montoDescuento;
            } 
            // Si hay código de autorización válido
            else if (codigo_autorizacion) {
                const codigoValido = await pool.query(
                    'SELECT * FROM codigos_autorizacion WHERE codigo = $1 AND activo = true AND usado = false AND fecha_expiracion > NOW()',
                    [codigo_autorizacion]
                );
                if (codigoValido.rows.length > 0) {
                    autorizado = true;
                    descuentoAplicado = montoDescuento;
                    await pool.query(
                        'UPDATE codigos_autorizacion SET usado = true WHERE codigo = $1',
                        [codigo_autorizacion]
                    );
                }
            }

            if (autorizado && total > 0) {
                descuentoPorcentaje = (descuentoAplicado / (parseFloat(total) + parseFloat(costo_envio || 0))) * 100;
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
        const totalFinal = (parseFloat(total) + costoEnvioFinal) - descuentoAplicado;

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
                descuento_monto,
                descuento_aprobado,
                codigo_autorizacion, 
                autorizado,
                cliente_es_mayorista,
                estado,
                solicitud_descuento_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
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
                descuentoPorcentaje || 0,
                descuentoAplicado || 0,
                descuento_aprobado || false,
                codigo_autorizacion || null, 
                autorizado || false,
                cliente_es_mayorista || false,
                estado || 'completada',
                solicitud_descuento_id || null
            ]
        );

        const ventaId = ventaResult.rows[0].id;

        // Insertar detalles de la venta
        for (const item of carrito) {
            await pool.query(
                `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio)
                 VALUES ($1, $2, $3, $4)`,
                [ventaId, item.id, item.cantidad || 1, item.precio]
            );

            // Descontar stock
            if (tipo_venta === 'contado' && tipo_entrega === 'retiro') {
                await pool.query(
                    `UPDATE producto_inventario 
                     SET stock = stock - $1 
                     WHERE producto_id = $2 AND sucursal_id = $3`,
                    [item.cantidad || 1, item.id, usuario.sucursal_id || 3]
                );
            }
        }

        // Si es crédito, crear la cuenta de crédito
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

        // Si es domicilio, crear la entrega
        if (tipo_entrega === 'domicilio') {
            await pool.query(
                `INSERT INTO entregas (venta_id, direccion, estado, codigo, fecha_salida)
                 VALUES ($1, $2, 'pendiente', $3, NOW())`,
                [ventaId, cliente_direccion, codigo]
            );
        }

        // 👇 ACTUALIZAR SOLICITUD DE DESCUENTO SI EXISTE
        if (solicitud_descuento_id && descuento_aprobado && autorizado) {
            await pool.query(
                `UPDATE solicitudes_descuento 
                 SET estado = 'aprobado',
                     monto_aprobado = $1,
                     fecha_respuesta = NOW()
                 WHERE id = $2`,
                [descuentoAplicado, solicitud_descuento_id]
            );
        }

        console.log(`✅ Venta #${ventaId} creada exitosamente`);

        res.json({
            success: true,
            ventaId: ventaId,
            clienteId,
            codigo: codigo,
            descuento_aplicado: descuentoPorcentaje,
            descuento_monto_aplicado: descuentoAplicado,
            autorizado: autorizado,
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

        const sucursalResult = await pool.query(
            `SELECT id, nombre, direccion, telefono FROM sucursales WHERE id = $1`,
            [venta.sucursal_id || 3]
        );

        const sucursal = sucursalResult.rows[0] || { 
            id: 3, 
            nombre: 'Sucursal Principal', 
            direccion: '', 
            telefono: '' 
        };

        const esSabana = sucursal.id === 2 || 
                         (sucursal.nombre && sucursal.nombre.toLowerCase().includes('sabana'));

        res.json({
            success: true,
            venta: venta,
            detalles: detallesResult.rows || [],
            sucursal: {
                ...sucursal,
                nombre_mostrar: esSabana ? 'Lizhomedecore' : 'AMAGO MUEBLES',
                es_sabana: esSabana
            }
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
// PUT /ventas/:id - Editar venta (SOLO ADMIN/SUBGERENTE)
// ============================================
router.put('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const {
            usuario_id,
            tipo_entrega,
            cliente_nombre,
            cliente_telefono,
            cliente_direccion,
            cliente_referencia,
            detalles
        } = req.body;

        const ventaExistente = await client.query(
            'SELECT * FROM ventas WHERE id = $1 AND estado != $2',
            [id, 'cancelada']
        );

        if (ventaExistente.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Venta no encontrada o ya cancelada'
            });
        }

        const venta = ventaExistente.rows[0];

        const usuario = await client.query(
            'SELECT rol, sucursal_id FROM usuarios WHERE id = $1',
            [usuario_id]
        );

        if (usuario.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario.rows[0].rol);
        if (!esAdmin) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permisos para editar esta venta'
            });
        }

        await client.query('BEGIN');

        let codigo = venta.codigo_entrega;
        if (tipo_entrega === 'domicilio' && venta.tipo_entrega !== 'domicilio') {
            let existe = true;
            while (existe) {
                codigo = generarCodigo();
                const check = await client.query(
                    'SELECT id FROM ventas WHERE codigo_entrega = $1',
                    [codigo]
                );
                existe = check.rows.length > 0;
            }
            
            await client.query(
                `UPDATE ventas SET codigo_entrega = $1 WHERE id = $2`,
                [codigo, id]
            );

            await client.query(
                `INSERT INTO entregas (venta_id, direccion, estado, codigo, fecha_salida)
                 VALUES ($1, $2, 'pendiente', $3, NOW())`,
                [id, cliente_direccion || venta.cliente_direccion, codigo]
            );
        }

        if (tipo_entrega === 'retiro' && venta.tipo_entrega === 'domicilio') {
            await client.query(
                `UPDATE ventas SET codigo_entrega = NULL WHERE id = $1`,
                [id]
            );

            await client.query(
                `UPDATE entregas SET estado = 'cancelada' WHERE venta_id = $1`,
                [id]
            );
        }

        const result = await client.query(
            `UPDATE ventas 
             SET tipo_entrega = $1,
                 cliente_nombre = $2,
                 cliente_telefono = $3,
                 cliente_direccion = $4,
                 cliente_referencia = $5,
                 detalles = $6,
                 updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [
                tipo_entrega || venta.tipo_entrega,
                cliente_nombre || venta.cliente_nombre,
                cliente_telefono || venta.cliente_telefono,
                cliente_direccion || venta.cliente_direccion,
                cliente_referencia || venta.cliente_referencia,
                detalles || venta.detalles,
                id
            ]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: '✅ Venta actualizada correctamente',
            venta: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en PUT /ventas/:id:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

// ============================================
// DELETE /ventas/:id - Eliminar venta (SOLO ADMIN/SUBGERENTE)
// ============================================
router.delete('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { usuario_id } = req.body;

        const ventaExistente = await client.query(
            'SELECT * FROM ventas WHERE id = $1 AND estado != $2',
            [id, 'cancelada']
        );

        if (ventaExistente.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Venta no encontrada o ya cancelada'
            });
        }

        const venta = ventaExistente.rows[0];

        const usuario = await client.query(
            'SELECT rol FROM usuarios WHERE id = $1',
            [usuario_id]
        );

        if (usuario.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        const esAdmin = ['dueno', 'dueño', 'subgerente', 'admin'].includes(usuario.rows[0].rol);
        if (!esAdmin) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permisos para eliminar esta venta'
            });
        }

        await client.query('BEGIN');

        if (venta.tipo_venta === 'credito') {
            await client.query(
                `UPDATE cuentas_por_cobrar 
                 SET estado = 'cancelado' 
                 WHERE venta_id = $1`,
                [id]
            );
        }

        await client.query(
            `UPDATE entregas SET estado = 'cancelada' WHERE venta_id = $1`,
            [id]
        );

        const detalles = await client.query(
            'SELECT * FROM detalle_ventas WHERE venta_id = $1',
            [id]
        );

        for (const item of detalles.rows) {
            await client.query(
                `UPDATE producto_inventario 
                 SET stock = stock + $1
                 WHERE producto_id = $2 AND sucursal_id = $3`,
                [item.cantidad, item.producto_id, venta.sucursal_id || 3]
            );

            await client.query(
                `UPDATE productos SET stock = stock + $1 WHERE id = $2`,
                [item.cantidad, item.producto_id]
            );
        }

        await client.query(
            `UPDATE ventas 
             SET estado = 'cancelada',
                 motivo_cancelacion = 'Eliminada por el usuario',
                 fecha_cancelacion = NOW(),
                 cancelado_por = $1
             WHERE id = $2`,
            [usuario_id, id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: '✅ Venta cancelada correctamente'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en DELETE /ventas/:id:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

module.exports = router;