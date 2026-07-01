const express = require('express');
const router = express.Router();
const pool = require('../db');

// Generar código de entrega
function generarCodigo() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 8; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'AMG-' + codigo;
}

// Crear venta
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
            costo_envio,        // 👈 NUEVO
            descuento,          // 👈 NUEVO
            codigo_autorizacion // 👈 NUEVO
        } = req.body;

        // 1. Verificar si el cliente existe, si no crearlo
        let clienteId = cliente_id;

        if (cliente_nombre) {
            const clienteExistente = await pool.query(
                'SELECT id FROM clientes WHERE nombre ILIKE $1',
                [cliente_nombre]
            );

            if (clienteExistente.rows.length > 0) {
                clienteId = clienteExistente.rows[0].id;
            } else {
                const nuevoCliente = await pool.query(
                    `INSERT INTO clientes (nombre, telefono, direccion) 
                     VALUES ($1, $2, $3) 
                     RETURNING id`,
                    [cliente_nombre, cliente_telefono, cliente_direccion]
                );
                clienteId = nuevoCliente.rows[0].id;
            }
        }

        // 2. VERIFICAR AUTORIZACIÓN PARA DESCUENTO
        let autorizado = false;
        let descuentoAplicado = parseFloat(descuento) || 0;

        if (descuentoAplicado > 0) {
            const usuario = await pool.query(
                'SELECT rol FROM usuarios WHERE id = $1',
                [usuario_id]
            );

            if (usuario.rows.length > 0) {
                const rol = usuario.rows[0].rol;
                if (rol === 'dueno' || rol === 'dueño' || rol === 'subgerente' || rol === 'admin') {
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
            }

            if (!autorizado) {
                return res.status(403).json({
                    success: false,
                    message: 'Descuento requiere autorización. Contacta al dueño o subgerente.'
                });
            }
        }

        // 3. Generar código numérico secuencial SOLO si es crédito o domicilio
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

        // 4. Guardar venta
        const ventaResult = await pool.query(
            `INSERT INTO ventas (
                usuario_id, total, tipo_pago, tipo_venta, tipo_entrega,
                cliente_nombre, cliente_telefono, cliente_direccion, cliente_referencia,
                cliente_id, codigo_entrega, estado_entrega, detalles,
                costo_envio, descuento, codigo_autorizacion, autorizado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *`,
            [
                usuario_id, totalFinal, tipo_pago, tipo_venta, tipo_entrega,
                cliente_nombre, cliente_telefono, cliente_direccion, cliente_referencia,
                clienteId, codigo, estadoEntrega, detalles,
                costoEnvioFinal, descuentoAplicado, codigo_autorizacion || null, autorizado
            ]
        );

        const ventaId = ventaResult.rows[0].id;

        // 5. Guardar detalles de venta
        for (const item of carrito) {
            await pool.query(
                `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio)
                 VALUES ($1, $2, $3, $4)`,
                [ventaId, item.id, item.cantidad || 1, item.precio]
            );
        }

        // 6. Si es CONTADO y RETIRO, descontar inventario
        if (tipo_venta === 'contado' && tipo_entrega === 'retiro') {
            for (const item of carrito) {
                await pool.query(
                    `UPDATE productos SET stock = stock - $1 WHERE id = $2`,
                    [item.cantidad || 1, item.id]
                );
            }
        }

        // 7. Si es CRÉDITO, crear cuenta por cobrar
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

        // 8. Si es DOMICILIO, crear entrega
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
        console.error('Error en ventas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obtener venta por código
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
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener ventas de un usuario
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
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;