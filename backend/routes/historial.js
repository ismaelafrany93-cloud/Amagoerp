const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// OBTENER TODAS LAS VENTAS
// ============================================
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT v.*, 
                   u.nombre as vendedor_nombre,
                   c.nombre as cliente_nombre
            FROM ventas v
            LEFT JOIN usuarios u ON v.usuario_id = u.id
            LEFT JOIN clientes c ON v.cliente_id = c.id
            WHERE v.estado = 'completada'
            ORDER BY v.fecha DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// OBTENER UNA VENTA CON SUS DETALLES
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const venta = await pool.query(
            `SELECT v.*, u.nombre as vendedor_nombre
             FROM ventas v
             LEFT JOIN usuarios u ON v.usuario_id = u.id
             WHERE v.id = $1`,
            [id]
        );

        if (venta.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Venta no encontrada'
            });
        }

        const detalles = await pool.query(
            `SELECT dv.*, p.nombre as producto_nombre
             FROM detalle_ventas dv
             JOIN productos p ON dv.producto_id = p.id
             WHERE dv.venta_id = $1`,
            [id]
        );

        res.json({
            success: true,
            venta: venta.rows[0],
            detalles: detalles.rows
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ANULAR VENTA Y CREAR NUEVA
// ============================================
router.post('/editar', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { 
            venta_id, 
            usuario_id, 
            cliente_nombre,
            cliente_telefono,
            cliente_direccion,
            carrito,
            total,
            tipo_pago,
            tipo_venta,
            tipo_entrega,
            detalles 
        } = req.body;

        await client.query('BEGIN');

        // 1. Obtener la venta original
        const ventaOriginal = await client.query(
            'SELECT * FROM ventas WHERE id = $1',
            [venta_id]
        );

        if (ventaOriginal.rows.length === 0) {
            throw new Error('Venta no encontrada');
        }

        // 2. Obtener los detalles originales
        const detallesOriginales = await client.query(
            'SELECT * FROM detalle_ventas WHERE venta_id = $1',
            [venta_id]
        );

        // 3. DEVOLVER el stock de la venta original
        for (const item of detallesOriginales.rows) {
            await client.query(
                `UPDATE productos SET stock = stock + $1 WHERE id = $2`,
                [item.cantidad, item.producto_id]
            );
        }

        // 4. Marcar la venta original como ANULADA
        await client.query(
            `UPDATE ventas SET estado = 'anulada' WHERE id = $1`,
            [venta_id]
        );

        // 5. Crear NUEVA venta
        const clienteId = cliente_nombre ? await crearCliente(client, cliente_nombre, cliente_telefono, cliente_direccion) : null;

        const codigo = generarCodigo();
        const estadoEntrega = tipo_entrega === 'domicilio' ? 'pendiente' : 'retirado';

        const nuevaVenta = await client.query(
            `INSERT INTO ventas (
                usuario_id, total, tipo_pago, tipo_venta, tipo_entrega,
                cliente_nombre, cliente_telefono, cliente_direccion,
                cliente_id, codigo_entrega, estado_entrega, detalles, estado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'completada')
            RETURNING id`,
            [
                usuario_id, total, tipo_pago, tipo_venta, tipo_entrega,
                cliente_nombre, cliente_telefono, cliente_direccion,
                clienteId, codigo, estadoEntrega, detalles
            ]
        );

        const nuevaVentaId = nuevaVenta.rows[0].id;

        // 6. Guardar nuevos detalles y DESCONTAR inventario
        for (const item of carrito) {
            await client.query(
                `INSERT INTO detalle_ventas (venta_id, producto_id, precio, cantidad)
                 VALUES ($1, $2, $3, $4)`,
                [nuevaVentaId, item.id, item.precio, item.cantidad]
            );

            // DESCONTAR del inventario
            await client.query(
                `UPDATE productos SET stock = stock - $1 WHERE id = $2`,
                [item.cantidad, item.id]
            );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Factura editada correctamente',
            nuevaVentaId,
            codigo
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error editando factura:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

// ============================================
// FUNCIONES AUXILIARES
// ============================================

async function crearCliente(client, nombre, telefono, direccion) {
    const existe = await client.query(
        'SELECT id FROM clientes WHERE nombre ILIKE $1',
        [nombre]
    );

    if (existe.rows.length > 0) {
        return existe.rows[0].id;
    }

    const nuevo = await client.query(
        `INSERT INTO clientes (nombre, telefono, direccion) 
         VALUES ($1, $2, $3) RETURNING id`,
        [nombre, telefono, direccion]
    );

    return nuevo.rows[0].id;
}

function generarCodigo() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 8; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'AMG-' + codigo;
}

module.exports = router;