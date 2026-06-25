const express = require('express');
const router = express.Router();
const pool = require('../db');

// Login
router.post('/login', async (req, res) => {
    try {
        const { correo, password } = req.body;

        const result = await pool.query(
            'SELECT * FROM usuarios WHERE correo = $1',
            [correo]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = result.rows[0];

        if (user.password !== password) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña incorrecta'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                nombre: user.nombre,
                correo: user.correo,
                rol: user.rol,
                sucursal: user.sucursal
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Cambiar contraseña
router.post('/cambiar-password', async (req, res) => {
    try {
        const { usuario_id, actual, nueva } = req.body;

        const userResult = await pool.query(
            'SELECT * FROM usuarios WHERE id = $1',
            [usuario_id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no existe'
            });
        }

        const user = userResult.rows[0];

        if (user.password !== actual) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña actual incorrecta'
            });
        }

        await pool.query(
            'UPDATE usuarios SET password = $1 WHERE id = $2',
            [nueva, usuario_id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;