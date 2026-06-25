const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener todos los operarios activos
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM operarios WHERE activo = true ORDER BY nombre'
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener todos los operarios (incluyendo inactivos)
router.get('/todos', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM operarios ORDER BY nombre'
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Crear un nuevo operario
router.post('/', async (req, res) => {
    try {
        const { nombre } = req.body;

        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'El nombre del operario es obligatorio'
            });
        }

        // Verificar si ya existe
        const existe = await pool.query(
            'SELECT * FROM operarios WHERE nombre ILIKE $1',
            [nombre.trim()]
        );

        if (existe.rows.length > 0) {
            // Si existe pero está inactivo, reactivarlo
            if (!existe.rows[0].activo) {
                await pool.query(
                    'UPDATE operarios SET activo = true WHERE id = $1',
                    [existe.rows[0].id]
                );
                return res.json({
                    success: true,
                    operario: existe.rows[0],
                    message: 'Operario reactivado'
                });
            }
            return res.status(400).json({
                success: false,
                message: 'El operario ya existe'
            });
        }

        const result = await pool.query(
            'INSERT INTO operarios (nombre) VALUES ($1) RETURNING *',
            [nombre.trim()]
        );

        res.json({
            success: true,
            operario: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Eliminar operario (desactivar)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const existe = await pool.query(
            'SELECT * FROM operarios WHERE id = $1',
            [id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Operario no encontrado'
            });
        }

        await pool.query(
            'UPDATE operarios SET activo = false WHERE id = $1',
            [id]
        );

        res.json({
            success: true,
            message: 'Operario eliminado correctamente'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;