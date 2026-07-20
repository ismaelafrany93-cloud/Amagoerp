const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /reportes/dashboard - Datos del dashboard
// ============================================
router.get('/dashboard', async (req, res) => {
    try {
        // 1. Ventas de hoy (solo completadas)
        const ventasHoy = await pool.query(
            `SELECT COALESCE(SUM(total), 0) as total
             FROM ventas 
             WHERE DATE(fecha) = CURRENT_DATE 
             AND estado = 'completada'`
        );

        // 2. Producción de hoy
        const produccionHoy = await pool.query(
            `SELECT COALESCE(SUM(cantidad), 0) as total
             FROM produccion 
             WHERE DATE(fecha) = CURRENT_DATE`
        );

        // 3. Entregas pendientes
        const entregasPendientes = await pool.query(
            `SELECT COUNT(*) as total
             FROM entregas 
             WHERE estado = 'pendiente'`
        );

        // 4. Ventas del mes (solo completadas)
        const ventasMes = await pool.query(
            `SELECT COALESCE(SUM(total), 0) as total
             FROM ventas 
             WHERE EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE)
             AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
             AND estado = 'completada'`
        );

        // 5. Total de ventas (solo completadas)
        const totalVentas = await pool.query(
            `SELECT COALESCE(SUM(total), 0) as total
             FROM ventas 
             WHERE estado = 'completada'`
        );

        // 6. Número de ventas hoy (solo completadas)
        const numeroVentasHoy = await pool.query(
            `SELECT COUNT(*) as total
             FROM ventas 
             WHERE DATE(fecha) = CURRENT_DATE 
             AND estado = 'completada'`
        );

        res.json({
            ventas_hoy: parseFloat(ventasHoy.rows[0].total) || 0,
            produccion_hoy: parseInt(produccionHoy.rows[0].total) || 0,
            entregas_pendientes: parseInt(entregasPendientes.rows[0].total) || 0,
            ventas_mes: parseFloat(ventasMes.rows[0].total) || 0,
            total_ventas: parseFloat(totalVentas.rows[0].total) || 0,
            numero_ventas_hoy: parseInt(numeroVentasHoy.rows[0].total) || 0
        });

    } catch (error) {
        console.error('❌ Error en /reportes/dashboard:', error.message);
        res.status(200).json({
            ventas_hoy: 0,
            produccion_hoy: 0,
            entregas_pendientes: 0,
            ventas_mes: 0,
            total_ventas: 0,
            numero_ventas_hoy: 0
        });
    }
});

// ============================================
// GET /reportes/top-productos - Productos más vendidos
// ============================================
router.get('/top-productos', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                p.nombre,
                COALESCE(SUM(dv.cantidad), 0) as total_vendido
             FROM detalle_ventas dv
             JOIN productos p ON dv.producto_id = p.id
             JOIN ventas v ON dv.venta_id = v.id
             WHERE v.estado = 'completada'
             GROUP BY p.id, p.nombre
             ORDER BY total_vendido DESC
             LIMIT 10`
        );

        res.json(result.rows || []);
    } catch (error) {
        console.error('❌ Error en /reportes/top-productos:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// GET /reportes/entregas-pendientes - Lista de entregas pendientes
// ============================================
router.get('/entregas-pendientes', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                e.id,
                e.codigo,
                e.direccion,
                e.fecha_salida,
                v.cliente_nombre,
                v.cliente_telefono,
                v.total
             FROM entregas e
             JOIN ventas v ON e.venta_id = v.id
             WHERE e.estado = 'pendiente'
             ORDER BY e.fecha_salida ASC`
        );

        res.json(result.rows || []);
    } catch (error) {
        console.error('❌ Error en /reportes/entregas-pendientes:', error.message);
        res.status(200).json([]);
    }
});

module.exports = router;