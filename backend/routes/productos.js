const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /productos - Obtener productos filtrados por sucursal
// ============================================
router.get('/', async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        
        let query = `
            SELECT 
                p.id, 
                p.nombre, 
                p.categoria, 
                p.descripcion, 
                p.precio,
                p.precio_mayor,
                p.cantidad_mayor,
                p.categoria_icono,
                p.categoria_color,
                COALESCE(pi.stock, 0) as stock,
                pi.sucursal_id,
                s.nombre as sucursal_nombre
            FROM productos p
            LEFT JOIN producto_inventario pi ON p.id = pi.producto_id
            LEFT JOIN sucursales s ON pi.sucursal_id = s.id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        // 👇 FILTRO POR SUCURSAL - OBLIGATORIO
        if (sucursal_id) {
            query += ` AND pi.sucursal_id = $${paramIndex}`;
            params.push(sucursal_id);
            paramIndex++;
        } else {
            // Si no se especifica sucursal, mostrar solo productos de la Principal (sucursal_id = 3)
            query += ` AND pi.sucursal_id = 3`;
        }

        query += ` ORDER BY p.nombre`;

        const result = await pool.query(query, params);
        res.json(result.rows || []);
        
    } catch (error) {
        console.error('❌ Error en GET /productos:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// GET /productos/todas - Obtener productos de TODAS las sucursales (SOLO ADMIN)
// ============================================
router.get('/todas', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.id, 
                p.nombre, 
                p.categoria, 
                p.descripcion, 
                p.precio,
                p.precio_mayor,
                p.cantidad_mayor,
                p.categoria_icono,
                p.categoria_color,
                COALESCE(pi.stock, 0) as stock,
                pi.sucursal_id,
                s.nombre as sucursal_nombre
            FROM productos p
            LEFT JOIN producto_inventario pi ON p.id = pi.producto_id
            LEFT JOIN sucursales s ON pi.sucursal_id = s.id
            ORDER BY p.sucursal_id, p.nombre
        `);
        res.json(result.rows || []);
    } catch (error) {
        console.error('❌ Error en GET /productos/todas:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// GET /productos/:id - Obtener producto por ID
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (isNaN(id) || parseInt(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ID de producto inválido'
            });
        }

        const result = await pool.query(
            `SELECT 
                p.*,
                COALESCE(pi.stock, 0) as stock_inventario,
                s.nombre as sucursal_nombre
             FROM productos p
             LEFT JOIN producto_inventario pi ON p.id = pi.producto_id
             LEFT JOIN sucursales s ON pi.sucursal_id = s.id
             WHERE p.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Producto con ID ${id} no encontrado`
            });
        }

        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('❌ Error en GET /productos/:id:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// POST /productos - Crear producto
// ============================================
router.post('/', async (req, res) => {
    try {
        const { 
            nombre, 
            categoria, 
            descripcion, 
            precio,
            precio_mayor,
            cantidad_mayor,
            stock,
            sucursal_id,
            categoria_icono,
            categoria_color
        } = req.body;

        if (!nombre || !precio) {
            return res.status(400).json({
                success: false,
                error: 'Nombre y precio son requeridos'
            });
        }

        const sucursalFinal = sucursal_id || 3;
        const stockFinal = stock || 0;

        const result = await pool.query(
            `INSERT INTO productos 
             (nombre, categoria, descripcion, precio, precio_mayor, cantidad_mayor, categoria_icono, categoria_color)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                nombre, 
                categoria || 'General', 
                descripcion || '', 
                precio,
                precio_mayor || null,
                cantidad_mayor || 0,
                categoria_icono || null,
                categoria_color || null
            ]
        );

        const producto = result.rows[0];

        // Crear inventario para la sucursal
        await pool.query(
            `INSERT INTO producto_inventario (producto_id, sucursal_id, stock)
             VALUES ($1, $2, $3)`,
            [producto.id, sucursalFinal, stockFinal]
        );

        res.json({ 
            success: true, 
            producto: producto,
            message: '✅ Producto creado correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error en POST /productos:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// PUT /productos/:id - Actualizar producto
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            nombre, 
            categoria, 
            descripcion, 
            precio,
            precio_mayor,
            cantidad_mayor,
            stock,
            sucursal_id,
            categoria_icono,
            categoria_color
        } = req.body;

        if (isNaN(id) || parseInt(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ID de producto inválido'
            });
        }

        const existe = await pool.query(
            'SELECT id FROM productos WHERE id = $1',
            [id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        const result = await pool.query(
            `UPDATE productos
             SET nombre = $1, 
                 categoria = $2, 
                 descripcion = $3, 
                 precio = $4,
                 precio_mayor = $5,
                 cantidad_mayor = $6,
                 categoria_icono = $7,
                 categoria_color = $8
             WHERE id = $9
             RETURNING *`,
            [
                nombre, 
                categoria || 'General', 
                descripcion || '', 
                precio,
                precio_mayor || null,
                cantidad_mayor || 0,
                categoria_icono || null,
                categoria_color || null,
                id
            ]
        );

        const sucursalFinal = sucursal_id || 3;

        if (stock !== undefined && stock !== null) {
            const existeInventario = await pool.query(
                'SELECT id FROM producto_inventario WHERE producto_id = $1 AND sucursal_id = $2',
                [id, sucursalFinal]
            );

            if (existeInventario.rows.length > 0) {
                await pool.query(
                    `UPDATE producto_inventario 
                     SET stock = $1
                     WHERE producto_id = $2 AND sucursal_id = $3`,
                    [stock, id, sucursalFinal]
                );
            } else {
                await pool.query(
                    `INSERT INTO producto_inventario (producto_id, sucursal_id, stock)
                     VALUES ($1, $2, $3)`,
                    [id, sucursalFinal, stock]
                );
            }
        }

        res.json({ 
            success: true, 
            producto: result.rows[0],
            message: '✅ Producto actualizado correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error en PUT /productos/:id:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// DELETE /productos/:id - Eliminar producto (CON VALIDACIONES)
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id) || parseInt(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ID de producto inválido'
            });
        }

        console.log(`🗑️ Intentando eliminar producto ID: ${id}`);

        const existe = await pool.query(
            'SELECT id, nombre FROM productos WHERE id = $1',
            [id]
        );

        if (existe.rows.length === 0) {
            console.log(`⚠️ Producto ${id} no encontrado`);
            return res.status(404).json({
                success: false,
                message: `Producto con ID ${id} no encontrado`
            });
        }

        console.log(`📦 Producto encontrado: ${existe.rows[0].nombre} (ID: ${id})`);

        const ventas = await pool.query(
            'SELECT id FROM detalle_ventas WHERE producto_id = $1 LIMIT 1',
            [id]
        );

        if (ventas.rows.length > 0) {
            console.log(`⚠️ Producto ${id} tiene ventas asociadas, no se puede eliminar`);
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar el producto porque tiene ventas asociadas'
            });
        }

        const inventario = await pool.query(
            'SELECT id FROM producto_inventario WHERE producto_id = $1',
            [id]
        );

        if (inventario.rows.length > 0) {
            console.log(`📦 Eliminando ${inventario.rows.length} registros de inventario para producto ${id}`);
            await pool.query('DELETE FROM producto_inventario WHERE producto_id = $1', [id]);
        }
        
        await pool.query('DELETE FROM productos WHERE id = $1', [id]);

        console.log(`✅ Producto ${id} eliminado correctamente`);

        res.json({ 
            success: true,
            message: '✅ Producto eliminado correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error en DELETE /productos/:id:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// PUT /productos/:id/stock - Actualizar solo stock
// ============================================
router.put('/:id/stock', async (req, res) => {
    try {
        const { id } = req.params;
        const { stock, sucursal_id } = req.body;

        if (stock === undefined || stock === null) {
            return res.status(400).json({
                success: false,
                message: 'Stock es requerido'
            });
        }

        if (isNaN(id) || parseInt(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ID de producto inválido'
            });
        }

        const existe = await pool.query(
            'SELECT id FROM productos WHERE id = $1',
            [id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        const sucursalFinal = sucursal_id || 3;
        const stockFinal = parseInt(stock) || 0;

        const existeInventario = await pool.query(
            'SELECT id FROM producto_inventario WHERE producto_id = $1 AND sucursal_id = $2',
            [id, sucursalFinal]
        );

        if (existeInventario.rows.length > 0) {
            await pool.query(
                `UPDATE producto_inventario 
                 SET stock = $1
                 WHERE producto_id = $2 AND sucursal_id = $3`,
                [stockFinal, id, sucursalFinal]
            );
        } else {
            await pool.query(
                `INSERT INTO producto_inventario (producto_id, sucursal_id, stock)
                 VALUES ($1, $2, $3)`,
                [id, sucursalFinal, stockFinal]
            );
        }

        await pool.query(
            `UPDATE productos SET stock = $1 WHERE id = $2`,
            [stockFinal, id]
        );

        res.json({
            success: true,
            message: '✅ Stock actualizado correctamente',
            stock: stockFinal,
            sucursal_id: sucursalFinal
        });

    } catch (error) {
        console.error('❌ Error en PUT /productos/:id/stock:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;