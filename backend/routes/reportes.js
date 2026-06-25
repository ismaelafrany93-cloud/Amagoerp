const express = require('express');
const router = express.Router();
const pool = require('../db');

// Dashboard - Resumen general
router.get('/dashboard', async (req, res) => {
    try {
        // Ventas del día
        const ventas = await pool.query(`
            SELECT COALESCE(SUM(total), 0) total
            FROM ventas
            WHERE DATE(fecha) = CURRENT_DATE
        `);

        // Producción del día
        const produccion = await pool.query(`
            SELECT COALESCE(SUM(cantidad), 0) total
            FROM produccion
            WHERE fecha = CURRENT_DATE
        `);

        // Entregas pendientes
        const entregas = await pool.query(`
            SELECT COUNT(*) total
            FROM entregas
            WHERE estado = 'pendiente'
        `);

        // Ventas del mes
        const ventasMes = await pool.query(`
            SELECT COALESCE(SUM(total), 0) total
            FROM ventas
            WHERE EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
        `);

        res.json({
            ventas_hoy: parseFloat(ventas.rows[0].total) || 0,
            produccion_hoy: parseInt(produccion.rows[0].total) || 0,
            entregas_pendientes: parseInt(entregas.rows[0].total) || 0,
            ventas_mes: parseFloat(ventasMes.rows[0].total) || 0
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            error: error.message,
            ventas_hoy: 0,
            produccion_hoy: 0,
            entregas_pendientes: 0,
            ventas_mes: 0
        });
    }
});

// Top productos más vendidos
router.get('/top-productos', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.nombre, 
                COALESCE(SUM(dv.cantidad), 0) as total_vendido
            FROM productos p
            LEFT JOIN detalle_ventas dv ON p.id = dv.producto_id
            LEFT JOIN ventas v ON dv.venta_id = v.id
            WHERE v.fecha >= CURRENT_DATE - INTERVAL '30 days' OR v.fecha IS NULL
            GROUP BY p.id, p.nombre
            ORDER BY total_vendido DESC
            LIMIT 10
        `);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Producción por operario
router.get('/produccion-operarios', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                operario, 
                COALESCE(SUM(cantidad), 0) as total_producido
            FROM produccion
            WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY operario
            ORDER BY total_producido DESC
        `);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ventas del mes por día
router.get('/ventas-mes', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                DATE(fecha) as fecha,
                COALESCE(SUM(total), 0) as total
            FROM ventas
            WHERE EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
            GROUP BY DATE(fecha)
            ORDER BY fecha ASC
        `);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;