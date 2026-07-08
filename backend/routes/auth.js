const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// POST /auth/login - Iniciar sesión
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { correo, password } = req.body;  // ← CAMBIADO: email → correo
        
        // Buscar usuario por correo
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE correo = $1',  // ← CAMBIADO: email → correo
            [correo]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
        
        const usuario = result.rows[0];
        
        // Verificar si el usuario está activo (si tienes campo 'activo')
        // if (usuario.activo === false) {
        //     return res.status(401).json({
        //         success: false,
        //         message: 'Usuario desactivado'
        //     });
        // }
        
        // Verificar contraseña (si no usas hash)
        if (password !== usuario.password) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña incorrecta'
            });
        }
        
        // Si usas bcrypt, descomenta esto y comenta el if de arriba:
        // const passwordValida = await bcrypt.compare(password, usuario.password);
        // if (!passwordValida) {
        //     return res.status(401).json({
        //         success: false,
        //         message: 'Contraseña incorrecta'
        //     });
        // }
        
        // Obtener nombre de la sucursal
        const sucursalResult = await pool.query(
            'SELECT nombre FROM sucursales WHERE id = $1',
            [usuario.sucursal_id]
        );
        
        const sucursalNombre = sucursalResult.rows[0]?.nombre || 'Sin sucursal';
        
        // Crear objeto de respuesta (sin password)
        const usuarioResponse = {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            rol: usuario.rol,
            sucursal_id: usuario.sucursal_id,
            sucursal_nombre: sucursalNombre
        };
        
        res.json({
            success: true,
            usuario: usuarioResponse,
            message: 'Login exitoso'
        });
        
    } catch (error) {
        console.error('❌ Error en login:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// POST /auth/register - Registrar usuario (opcional)
// ============================================
router.post('/register', async (req, res) => {
    try {
        const { nombre, correo, password, rol, sucursal_id } = req.body;
        
        // Verificar si el correo ya existe
        const existe = await pool.query(
            'SELECT id FROM usuarios WHERE correo = $1',
            [correo]
        );
        
        if (existe.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El correo ya está registrado'
            });
        }
        
        // Crear usuario
        const result = await pool.query(
            `INSERT INTO usuarios 
             (nombre, correo, password, rol, sucursal_id, resetear_password)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, nombre, correo, rol, sucursal_id`,
            [nombre, correo, password, rol || 'vendedor', sucursal_id || null, false]
        );
        
        res.json({
            success: true,
            usuario: result.rows[0],
            message: 'Usuario creado correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error en register:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;