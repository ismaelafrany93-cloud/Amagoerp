const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener todas las recetas con detalles de producto y material
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                r.id,
                r.producto_id,
                p.nombre as producto_nombre,
                r.material_id,
                m.nombre as material_nombre,
                m.unidad,
                r.cantidad_necesaria,
                r.descripcion
            FROM recetas r
            JOIN productos p ON r.producto_id = p.id
            JOIN materiales m ON r.material_id = m.id
            ORDER BY p.nombre, m.nombre
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener recetas de un producto específico
router.get('/producto/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT 
                r.id,
                r.material_id,
                m.nombre as material_nombre,
                m.unidad,
                r.cantidad_necesaria,
                r.descripcion
            FROM recetas r
            JOIN materiales m ON r.material_id = m.id
            WHERE r.producto_id = $1
            ORDER BY m.nombre
        `, [id]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener todos los materiales (para el selector)
router.get('/materiales', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM materiales ORDER BY nombre'
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Crear una nueva receta
router.post('/', async (req, res) => {
    try {
        const { producto_id, material_id, cantidad_necesaria, descripcion } = req.body;

        // Verificar si ya existe
        const existe = await pool.query(
            'SELECT * FROM recetas WHERE producto_id = $1 AND material_id = $2',
            [producto_id, material_id]
        );

        if (existe.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Este material ya está asignado a este producto'
            });
        }

        await pool.query(
            `INSERT INTO recetas (producto_id, material_id, cantidad_necesaria, descripcion)
             VALUES ($1, $2, $3, $4)`,
            [producto_id, material_id, cantidad_necesaria, descripcion || '']
        );

        res.json({
            success: true,
            message: 'Material agregado a la receta correctamente'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Actualizar una receta
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidad_necesaria, descripcion } = req.body;

        await pool.query(
            `UPDATE recetas 
             SET cantidad_necesaria = $1, descripcion = $2
             WHERE id = $3`,
            [cantidad_necesaria, descripcion, id]
        );

        res.json({
            success: true,
            message: 'Receta actualizada correctamente'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Eliminar una receta
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM recetas WHERE id = $1', [id]);
        res.json({
            success: true,
            message: 'Material eliminado de la receta'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;