const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');

// Configurar multer para fotos
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, 'prod-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Registrar producción
router.post('/', upload.single('foto'), async (req, res) => {
    try {
        const { producto_id, cantidad, supervisor_id, operario, observacion } = req.body;
        const foto = req.file ? `/uploads/${req.file.filename}` : null;

        // 1. Insertar producción
        const result = await pool.query(
            `INSERT INTO produccion (producto_id, cantidad, supervisor_id, operario, observacion, foto, fecha)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
             RETURNING *`,
            [producto_id, cantidad, supervisor_id, operario, observacion, foto]
        );

        // 2. Obtener receta de materiales
        const receta = await pool.query(
            `SELECT r.material_id, r.cantidad_necesaria, m.nombre
             FROM recetas r
             JOIN materiales m ON r.material_id = m.id
             WHERE r.producto_id = $1`,
            [producto_id]
        );

        // 3. Descontar materiales
        for (const material of receta.rows) {
            const cantidadTotal = material.cantidad_necesaria * cantidad;

            await pool.query(
                `UPDATE materiales SET stock = stock - $1 WHERE id = $2`,
                [cantidadTotal, material.material_id]
            );

            await pool.query(
                `INSERT INTO produccion_detalle (produccion_id, material_id, cantidad_usada)
                 VALUES ($1, $2, $3)`,
                [result.rows[0].id, material.material_id, cantidadTotal]
            );
        }

        // 4. Incrementar stock del producto
        await pool.query(
            `UPDATE productos SET stock = stock + $1 WHERE id = $2`,
            [cantidad, producto_id]
        );

        res.json({
            success: true,
            message: '✅ Producción registrada',
            produccion: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Resumen de producción por operario (hoy)
router.get('/resumen', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT operario, SUM(cantidad) as total_producido
             FROM produccion
             WHERE fecha = CURRENT_DATE
             GROUP BY operario
             ORDER BY operario`
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Listar producciones
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, pr.nombre as producto_nombre, u.nombre as supervisor_nombre
             FROM produccion p
             LEFT JOIN productos pr ON p.producto_id = pr.id
             LEFT JOIN usuarios u ON p.supervisor_id = u.id
             ORDER BY p.fecha DESC, p.id DESC`
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;