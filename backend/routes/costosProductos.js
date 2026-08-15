const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /costos-productos - Listar costos de productos
// ============================================
router.get('/', async (req, res) => {
    try {
        const { sucursal_id, producto_id } = req.query;
        
        let query = `
            SELECT 
                cp.*,
                p.nombre as producto_nombre,
                p.precio as precio_venta,
                s.nombre as sucursal_nombre
            FROM costos_productos cp
            JOIN productos p ON cp.producto_id = p.id
            LEFT JOIN sucursales s ON cp.sucursal_id = s.id
            WHERE 1=1
        `;
        let params = [];
        let paramCount = 1;
        
        if (sucursal_id) {
            query += ` AND cp.sucursal_id = $${paramCount}`;
            params.push(parseInt(sucursal_id));
            paramCount++;
        }
        
        if (producto_id) {
            query += ` AND cp.producto_id = $${paramCount}`;
            params.push(parseInt(producto_id));
            paramCount++;
        }
        
        query += ` ORDER BY p.nombre`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
        
    } catch (error) {
        console.error('❌ Error en GET /costos-productos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// POST /costos-productos - Crear costo de producto
// ============================================
router.post('/', async (req, res) => {
    try {
        const {
            producto_id, costo_unitario, costo_materiales,
            costo_mano_obra, costo_transporte, otros_costos,
            sucursal_id, created_by
        } = req.body;
        
        // Verificar si ya existe
        const existente = await pool.query(
            'SELECT id FROM costos_productos WHERE producto_id = $1 AND sucursal_id = $2',
            [parseInt(producto_id), parseInt(sucursal_id)]
        );
        
        if (existente.rows.length > 0) {
            // Actualizar
            const result = await pool.query(
                `UPDATE costos_productos 
                 SET costo_unitario = $1,
                     costo_materiales = $2,
                     costo_mano_obra = $3,
                     costo_transporte = $4,
                     otros_costos = $5,
                     fecha_actualizacion = NOW(),
                     updated_at = NOW()
                 WHERE producto_id = $6 AND sucursal_id = $7
                 RETURNING *`,
                [costo_unitario, costo_materiales, costo_mano_obra, costo_transporte, otros_costos, parseInt(producto_id), parseInt(sucursal_id)]
            );
            
            return res.json({
                success: true,
                message: 'Costo actualizado correctamente',
                costo: result.rows[0]
            });
        }
        
        const result = await pool.query(
            `INSERT INTO costos_productos (
                producto_id, costo_unitario, costo_materiales,
                costo_mano_obra, costo_transporte, otros_costos,
                fecha_actualizacion, sucursal_id, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)
            RETURNING *`,
            [parseInt(producto_id), costo_unitario, costo_materiales, costo_mano_obra, costo_transporte, otros_costos, parseInt(sucursal_id), created_by]
        );
        
        res.json({
            success: true,
            costo: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error en POST /costos-productos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /costos-productos/ganancia/:producto_id - Calcular ganancia
// ============================================
router.get('/ganancia/:producto_id', async (req, res) => {
    try {
        const { producto_id } = req.params;
        const { sucursal_id } = req.query;
        
        const productoResult = await pool.query(
            'SELECT id, nombre, precio FROM productos WHERE id = $1',
            [parseInt(producto_id)]
        );
        
        if (productoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const producto = productoResult.rows[0];
        
        const costoResult = await pool.query(
            'SELECT * FROM costos_productos WHERE producto_id = $1 AND sucursal_id = $2',
            [parseInt(producto_id), parseInt(sucursal_id) || 3]
        );
        
        const costo = costoResult.rows[0] || {
            costo_unitario: 0,
            costo_materiales: 0,
            costo_mano_obra: 0,
            costo_transporte: 0,
            otros_costos: 0
        };
        
        const costoTotal = parseFloat(costo.costo_unitario) || 0;
        const precioVenta = parseFloat(producto.precio) || 0;
        const ganancia = precioVenta - costoTotal;
        const margen = precioVenta > 0 ? (ganancia / precioVenta) * 100 : 0;
        
        res.json({
            success: true,
            producto: {
                id: producto.id,
                nombre: producto.nombre,
                precio_venta: precioVenta
            },
            costo: {
                costo_unitario: costoTotal,
                costo_materiales: parseFloat(costo.costo_materiales) || 0,
                costo_mano_obra: parseFloat(costo.costo_mano_obra) || 0,
                costo_transporte: parseFloat(costo.costo_transporte) || 0,
                otros_costos: parseFloat(costo.otros_costos) || 0
            },
            ganancia: ganancia,
            margen_ganancia: margen
        });
        
    } catch (error) {
        console.error('❌ Error en GET /costos-productos/ganancia:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /costos-productos/ganancia-total - Ganancia total del mes
// ============================================
router.get('/ganancia-total', async (req, res) => {
    try {
        const { mes, ano, sucursal_id } = req.query;
        
        const mesActual = mes || new Date().getMonth() + 1;
        const anoActual = ano || new Date().getFullYear();
        const sucursalFinal = sucursal_id ? parseInt(sucursal_id) : 3;
        
        // Obtener ventas del mes - CORREGIDO: usar precio en lugar de precio_unitario
        const ventasResult = await pool.query(
            `SELECT 
                v.id as venta_id,
                v.total,
                dv.producto_id,
                dv.cantidad,
                dv.precio as precio_unitario
            FROM ventas v
            JOIN detalle_ventas dv ON v.id = dv.venta_id
            WHERE EXTRACT(MONTH FROM v.fecha) = $1 
            AND EXTRACT(YEAR FROM v.fecha) = $2
            AND v.estado != 'cancelada'
            AND v.sucursal_id = $3`,
            [mesActual, anoActual, sucursalFinal]
        );
        
        let totalVentas = 0;
        let totalCosto = 0;
        let detalle = [];
        
        for (const row of ventasResult.rows) {
            totalVentas += parseFloat(row.total) || 0;
            
            const costoResult = await pool.query(
                'SELECT costo_unitario FROM costos_productos WHERE producto_id = $1 AND sucursal_id = $2',
                [row.producto_id, sucursalFinal]
            );
            
            const costoUnitario = parseFloat(costoResult.rows[0]?.costo_unitario || 0);
            const cantidad = parseFloat(row.cantidad);
            const costoTotalProducto = costoUnitario * cantidad;
            totalCosto += costoTotalProducto;
            
            detalle.push({
                producto_id: row.producto_id,
                cantidad: cantidad,
                precio_unitario: row.precio_unitario,
                costo_unitario: costoUnitario,
                ganancia_unidad: parseFloat(row.precio_unitario) - costoUnitario
            });
        }
        
        const gananciaTotal = totalVentas - totalCosto;
        const margen = totalVentas > 0 ? (gananciaTotal / totalVentas) * 100 : 0;
        
        res.json({
            success: true,
            periodo: { mes: mesActual, ano: anoActual },
            total_ventas: totalVentas,
            total_costo: totalCosto,
            ganancia_bruta: gananciaTotal,
            margen_ganancia: margen,
            detalle: detalle
        });
        
    } catch (error) {
        console.error('❌ Error en GET /costos-productos/ganancia-total:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;