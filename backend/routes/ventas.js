const express = require('express');
const router = express.Router();
const pool = require('../db');

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
            detalles
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

        // 2. Generar código numérico secuencial SOLO si es crédito o domicilio
        let codigoNumero = null;
        if (tipo_venta === 'credito' || tipo_entrega === 'domicilio') {
            const nextVal = await pool.query("SELECT nextval('ventas_codigo_seq') as numero");
            codigoNumero = nextVal.rows[0].numero;
        }

        const estadoEntrega = (tipo_venta === 'credito' || tipo_entrega === 'domicilio') ? 'pendiente' : 'retirado';

        // 3. Guardar venta
        const ventaResult = await pool.query(
            `INSERT INTO ventas (
                usuario_id, total, tipo_pago, tipo_venta, tipo_entrega,
                cliente_nombre, cliente_telefono, cliente_direccion, cliente_referencia,
                cliente_id, codigo_numero, estado_entrega, detalles
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [
                usuario_id, total, tipo_pago, tipo_venta, tipo_entrega,
                cliente_nombre, cliente_telefono, cliente_direccion, cliente_referencia,
                clienteId, codigoNumero, estadoEntrega, detalles
            ]
        );

        const ventaId = ventaResult.rows[0].id;

        // 4. Guardar detalles de venta
        for (const item of carrito) {
            await pool.query(
                `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio)
                 VALUES ($1, $2, $3, $4)`,
                [ventaId, item.id, item.cantidad || 1, item.precio]
            );
        }

        // 5. Si es CONTADO y RETIRO, descontar inventario inmediatamente
        if (tipo_venta === 'contado' && tipo_entrega === 'retiro') {
            for (const item of carrito) {
                await pool.query(
                    `UPDATE productos SET stock = stock - $1 WHERE id = $2`,
                    [item.cantidad || 1, item.id]
                );
            }
        }

        // 6. Si es CRÉDITO, crear cuenta por cobrar
        if (tipo_venta === 'credito') {
            await pool.query(
                `INSERT INTO cuentas_por_cobrar (
                    cliente_id, venta_id, total_venta, abonado, saldo_pendiente, estado
                ) VALUES ($1, $2, $3, $4, $5, 'pendiente')`,
                [clienteId, ventaId, total, 0, total]
            );

            await pool.query(
                `UPDATE clientes 
                 SET saldo_pendiente = COALESCE(saldo_pendiente, 0) + $1 
                 WHERE id = $2`,
                [total, clienteId]
            );
        }

        // 7. Si es DOMICILIO, crear entrega
        if (tipo_entrega === 'domicilio') {
            await pool.query(
                `INSERT INTO entregas (venta_id, direccion, estado, codigo_numero, fecha_salida)
                 VALUES ($1, $2, 'pendiente', $3, NOW())`,
                [ventaId, cliente_direccion, codigoNumero]
            );
        }

        // 8. Formatear el código con ceros a la izquierda (0001, 0002, etc.)
        const codigoFormateado = codigoNumero ? String(codigoNumero).padStart(4, '0') : null;

        res.json({
            success: true,
            ventaId,
            clienteId,
            codigo: codigoFormateado,
            codigo_numero: codigoNumero,
            tipo_venta,
            tipo_entrega
        });

    } catch (error) {
        console.error('Error en ventas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obtener venta por código numérico
router.get('/codigo/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        const codigoNumero = parseInt(codigo);

        if (isNaN(codigoNumero)) {
            return res.status(400).json({
                success: false,
                message: 'Código inválido. Debe ser un número.'
            });
        }

        const result = await pool.query(
            `SELECT v.*, u.nombre as vendedor
             FROM ventas v
             LEFT JOIN usuarios u ON v.usuario_id = u.id
             WHERE v.codigo_numero = $1 AND v.estado_entrega = 'pendiente'`,
            [codigoNumero]
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