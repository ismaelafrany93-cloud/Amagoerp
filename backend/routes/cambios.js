const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /cambios - Listar todos los cambios
// ============================================
router.get('/', async (req, res) => {
    try {
        const { factura, estado, fecha_inicio, fecha_fin } = req.query;
        
        let query = `
            SELECT 
                c.*,
                u.nombre as usuario_nombre,
                v.cliente_nombre as venta_cliente,
                v.total as venta_total
            FROM cambios c
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            LEFT JOIN ventas v ON c.venta_id = v.id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (factura) {
            query += ` AND c.factura_original ILIKE $${paramIndex}`;
            params.push(`%${factura}%`);
            paramIndex++;
        }

        if (estado) {
            query += ` AND c.estado = $${paramIndex}`;
            params.push(estado);
            paramIndex++;
        }

        if (fecha_inicio) {
            query += ` AND DATE(c.fecha) >= $${paramIndex}`;
            params.push(fecha_inicio);
            paramIndex++;
        }

        if (fecha_fin) {
            query += ` AND DATE(c.fecha) <= $${paramIndex}`;
            params.push(fecha_fin);
            paramIndex++;
        }

        query += ` ORDER BY c.fecha DESC LIMIT 100`;

        const result = await pool.query(query, params);
        res.json(result.rows || []);
    } catch (error) {
        console.error('❌ Error en GET /cambios:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// GET /cambios/venta/:codigo - Buscar por código de entrega
// ============================================
router.get('/venta/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        
        console.log('📡 GET /cambios/venta/:codigo - Código:', codigo);
        
        const venta = await pool.query(
            `SELECT 
                v.*,
                u.nombre as vendedor_nombre
            FROM ventas v
            LEFT JOIN usuarios u ON v.usuario_id = u.id
            WHERE v.codigo_entrega = $1 OR v.id::text = $1`,
            [codigo]
        );

        if (venta.rows.length === 0) {
            return res.json({
                success: false,
                message: 'Factura no encontrada'
            });
        }

        const detalles = await pool.query(
            `SELECT 
                d.*,
                p.nombre as producto_nombre,
                p.precio as producto_precio
            FROM detalle_ventas d
            LEFT JOIN productos p ON d.producto_id = p.id
            WHERE d.venta_id = $1`,
            [venta.rows[0].id]
        );

        res.json({
            success: true,
            venta: {
                ...venta.rows[0],
                factura: venta.rows[0].codigo_entrega || venta.rows[0].id
            },
            detalles: detalles.rows || []
        });
    } catch (error) {
        console.error('❌ Error en GET /cambios/venta/:codigo:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// POST /cambios - Crear un cambio o devolución
// ============================================
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            venta_id,
            factura_original,
            cliente_nombre,
            cliente_telefono,
            productos_devueltos,
            producto_nuevo_id,
            producto_nuevo_nombre,
            cantidad_nueva,
            precio_nuevo,
            total_devuelto,
            total_nuevo,
            envio,
            diferencia,
            tipo,
            motivo,
            usuario_id,
            envio_opcional
        } = req.body;

        // Validaciones
        if (!venta_id || !productos_devueltos || productos_devueltos.length === 0 || !tipo) {
            return res.status(400).json({
                success: false,
                error: 'Venta, productos devueltos y tipo son requeridos'
            });
        }

        if (tipo === 'cambio' && !producto_nuevo_id) {
            return res.status(400).json({
                success: false,
                error: 'Para un cambio, el producto nuevo es requerido'
            });
        }

        // Verificar que la venta existe
        const ventaCheck = await client.query(
            'SELECT id, codigo_entrega, cliente_nombre FROM ventas WHERE id = $1',
            [venta_id]
        );
        if (ventaCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Venta no encontrada'
            });
        }

        // Verificar que no tenga un cambio previo
        const cambioExistente = await client.query(
            'SELECT id FROM cambios WHERE venta_id = $1 AND estado != $2',
            [venta_id, 'cancelado']
        );
        if (cambioExistente.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Esta venta ya tiene un cambio o devolución registrada'
            });
        }

        await client.query('BEGIN');

        // Crear el cambio
        const result = await client.query(
            `INSERT INTO cambios (
                venta_id, factura_original, cliente_nombre, cliente_telefono,
                productos_devueltos,
                producto_nuevo_id, producto_nuevo_nombre, cantidad_nueva, precio_nuevo,
                total_devuelto, total_nuevo, envio, diferencia, tipo, motivo, usuario_id, estado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'completado')
            RETURNING *`,
            [
                venta_id, factura_original, cliente_nombre, cliente_telefono,
                JSON.stringify(productos_devueltos),
                producto_nuevo_id, producto_nuevo_nombre, cantidad_nueva || 0, precio_nuevo || 0,
                total_devuelto || 0, total_nuevo || 0, envio || 0, diferencia || 0,
                tipo, motivo, usuario_id
            ]
        );

        const cambio = result.rows[0];

        // Marcar la venta como que tiene cambio
        await client.query(
            `UPDATE ventas SET tiene_cambio = TRUE, cambio_id = $1 WHERE id = $2`,
            [cambio.id, venta_id]
        );

        // Actualizar inventario para cada producto devuelto
        const sucursalId = 3; // Sucursal principal (ajustar si es necesario)
        
        for (const producto of productos_devueltos) {
            // Verificar si el producto existe en inventario
            const inventarioCheck = await client.query(
                `SELECT stock FROM producto_inventario 
                 WHERE producto_id = $1 AND sucursal_id = $2`,
                [producto.producto_id, sucursalId]
            );

            if (inventarioCheck.rows.length === 0) {
                // Crear el registro si no existe
                await client.query(
                    `INSERT INTO producto_inventario (producto_id, sucursal_id, stock) 
                     VALUES ($1, $2, $3)`,
                    [producto.producto_id, sucursalId, 0]
                );
            }

            // Aumentar stock del producto devuelto
            await client.query(
                `UPDATE producto_inventario 
                 SET stock = stock + $1, updated_at = NOW()
                 WHERE producto_id = $2 AND sucursal_id = $3`,
                [producto.cantidad, producto.producto_id, sucursalId]
            );

            // También actualizar la tabla productos si existe stock
            await client.query(
                `UPDATE productos 
                 SET stock = COALESCE(stock, 0) + $1 
                 WHERE id = $2`,
                [producto.cantidad, producto.producto_id]
            );
        }

        // Si es un cambio, descontar el producto nuevo del inventario
        if (tipo === 'cambio' && producto_nuevo_id) {
            // Verificar stock disponible
            const stockCheck = await client.query(
                `SELECT stock FROM producto_inventario 
                 WHERE producto_id = $1 AND sucursal_id = $2`,
                [producto_nuevo_id, sucursalId]
            );

            const stockDisponible = stockCheck.rows.length > 0 ? stockCheck.rows[0].stock : 0;
            const cantidadADescontar = cantidad_nueva || 1;

            if (stockDisponible < cantidadADescontar) {
                throw new Error(`Stock insuficiente para el producto ${producto_nuevo_nombre}. Disponible: ${stockDisponible}, Requerido: ${cantidadADescontar}`);
            }

            // Descontar stock
            await client.query(
                `UPDATE producto_inventario 
                 SET stock = stock - $1, updated_at = NOW()
                 WHERE producto_id = $2 AND sucursal_id = $3`,
                [cantidadADescontar, producto_nuevo_id, sucursalId]
            );

            // También actualizar la tabla productos
            await client.query(
                `UPDATE productos 
                 SET stock = COALESCE(stock, 0) - $1 
                 WHERE id = $2`,
                [cantidadADescontar, producto_nuevo_id]
            );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `✅ ${tipo === 'cambio' ? 'Cambio' : 'Devolución'} registrado correctamente`,
            cambio: cambio
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en POST /cambios:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

// ============================================
// GET /cambios/:id - Obtener un cambio específico
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            `SELECT 
                c.*,
                u.nombre as usuario_nombre
            FROM cambios c
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            WHERE c.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cambio no encontrado'
            });
        }

        const cambio = result.rows[0];
        if (cambio.productos_devueltos && typeof cambio.productos_devueltos === 'string') {
            try {
                cambio.productos_devueltos = JSON.parse(cambio.productos_devueltos);
            } catch (e) {
                cambio.productos_devueltos = [];
            }
        }

        res.json(cambio);
    } catch (error) {
        console.error('❌ Error en GET /cambios/:id:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// PUT /cambios/:id - Actualizar estado de un cambio
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const result = await pool.query(
            `UPDATE cambios SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [estado, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cambio no encontrado'
            });
        }

        res.json({
            success: true,
            message: '✅ Estado actualizado correctamente',
            cambio: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Error en PUT /cambios/:id:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;