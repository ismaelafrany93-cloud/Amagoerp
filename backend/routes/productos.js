const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /productos - Obtener productos (con filtro por sucursal)
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
                p.costo,
                p.stock,
                p.sucursal_id,
                s.nombre as sucursal_nombre,
                COALESCE(pi.stock, p.stock) as stock_disponible
            FROM productos p
            LEFT JOIN sucursales s ON p.sucursal_id = s.id
            LEFT JOIN producto_inventario pi ON p.id = pi.producto_id AND pi.sucursal_id = p.sucursal_id
            WHERE 1=1
        `;
        let params = [];

        // Filtrar por sucursal si se envía el parámetro
        if (sucursal_id) {
            query += ` AND (p.sucursal_id = $1 OR p.sucursal_id IS NULL)`;
            params.push(sucursal_id);
        }

        query += ` ORDER BY p.nombre`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error en GET /productos:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// GET /productos/:id - Obtener un producto por ID
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT 
                p.*,
                s.nombre as sucursal_nombre
             FROM productos p
             LEFT JOIN sucursales s ON p.sucursal_id = s.id
             WHERE p.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error en GET /productos/:id:', error);
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
            costo,
            stock, 
            sucursal_id,
            codigo_barras,
            imagen_url
        } = req.body;

        // Validar datos requeridos
        if (!nombre || !precio) {
            return res.status(400).json({
                success: false,
                error: 'Nombre y precio son requeridos'
            });
        }

        const result = await pool.query(
            `INSERT INTO productos 
             (nombre, categoria, descripcion, precio, costo, stock, sucursal_id, codigo_barras, imagen_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                nombre, 
                categoria || 'General', 
                descripcion || '', 
                precio, 
                costo || 0, 
                stock || 0, 
                sucursal_id || null, 
                codigo_barras || null,
                imagen_url || null
            ]
        );

        res.json({ 
            success: true, 
            producto: result.rows[0],
            message: 'Producto creado correctamente'
        });
    } catch (error) {
        console.error('Error en POST /productos:', error);
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
            costo,
            stock, 
            sucursal_id,
            codigo_barras,
            imagen_url
        } = req.body;

        // Verificar que el producto existe
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
                 costo = $5,
                 stock = $6,
                 sucursal_id = $7,
                 codigo_barras = $8,
                 imagen_url = $9,
                 updated_at = NOW()
             WHERE id = $10
             RETURNING *`,
            [
                nombre, 
                categoria || 'General', 
                descripcion || '', 
                precio, 
                costo || 0, 
                stock || 0, 
                sucursal_id || null, 
                codigo_barras || null,
                imagen_url || null,
                id
            ]
        );

        res.json({ 
            success: true, 
            producto: result.rows[0],
            message: 'Producto actualizado correctamente'
        });
    } catch (error) {
        console.error('Error en PUT /productos/:id:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// DELETE /productos/:id - Eliminar producto
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el producto existe
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

        // Verificar si tiene ventas asociadas
        const ventas = await pool.query(
            'SELECT id FROM detalle_venta WHERE producto_id = $1 LIMIT 1',
            [id]
        );

        if (ventas.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'No se puede eliminar el producto porque tiene ventas asociadas'
            });
        }

        await pool.query('DELETE FROM productos WHERE id = $1', [id]);

        res.json({ 
            success: true,
            message: 'Producto eliminado correctamente'
        });
    } catch (error) {
        console.error('Error en DELETE /productos/:id:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;