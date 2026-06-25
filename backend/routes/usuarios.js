const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener usuarios
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nombre, correo, rol, sucursal, created_at FROM usuarios ORDER BY nombre'
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear usuario
router.post('/', async (req, res) => {
    try {
        const { nombre, correo, password, rol, sucursal } = req.body;

        const existe = await pool.query(
            'SELECT * FROM usuarios WHERE correo = $1',
            [correo]
        );

        if (existe.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El correo ya está registrado'
            });
        }

        const result = await pool.query(
            `INSERT INTO usuarios (nombre, correo, password, rol, sucursal)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, nombre, correo, rol, sucursal`,
            [nombre, correo, password || '123456', rol || 'vendedor', sucursal]
        );

        res.json({ success: true, usuario: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar usuario
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, correo, rol, sucursal } = req.body;

        const result = await pool.query(
            `UPDATE usuarios 
             SET nombre = $1, correo = $2, rol = $3, sucursal = $4
             WHERE id = $5
             RETURNING id, nombre, correo, rol, sucursal`,
            [nombre, correo, rol, sucursal, id]
        );

        res.json({ success: true, usuario: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Resetear contraseña
router.put('/:id/resetear', async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            'UPDATE usuarios SET password = $1 WHERE id = $2',
            ['123456', id]
        );

        res.json({
            success: true,
            message: 'Contraseña reseteada a 123456'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar usuario
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;