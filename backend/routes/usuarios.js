const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /usuarios - Obtener todos los usuarios
// ============================================
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                u.id, 
                u.nombre, 
                u.correo, 
                u.rol, 
                u.sucursal_id,
                s.nombre as sucursal_nombre,
                u.resetear_password,
                u.created_at
             FROM usuarios u
             LEFT JOIN sucursales s ON u.sucursal_id = s.id
             ORDER BY u.nombre`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en GET /usuarios:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// GET /usuarios/:id - Obtener usuario por ID
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            `SELECT 
                u.id, 
                u.nombre, 
                u.correo, 
                u.rol, 
                u.sucursal_id,
                s.nombre as sucursal_nombre,
                u.resetear_password,
                u.created_at
             FROM usuarios u
             LEFT JOIN sucursales s ON u.sucursal_id = s.id
             WHERE u.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('❌ Error en GET /usuarios/:id:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// POST /usuarios - Crear usuario
// ============================================
router.post('/', async (req, res) => {
    try {
        const { nombre, correo, password, rol, sucursal_id } = req.body;

        // Validar que el correo no esté registrado
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

        const result = await pool.query(
            `INSERT INTO usuarios 
             (nombre, correo, password, rol, sucursal_id, resetear_password)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, nombre, correo, rol, sucursal_id`,
            [nombre, correo, password || '123456', rol || 'vendedor', sucursal_id || null, false]
        );

        res.json({
            success: true,
            usuario: result.rows[0],
            message: 'Usuario creado correctamente'
        });
    } catch (error) {
        console.error('❌ Error en POST /usuarios:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// PUT /usuarios/:id - Actualizar usuario
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, correo, rol, sucursal_id, password } = req.body;

        // Verificar que el usuario existe
        const existe = await pool.query(
            'SELECT id FROM usuarios WHERE id = $1',
            [id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        let query = `
            UPDATE usuarios 
            SET nombre = $1, 
                correo = $2, 
                rol = $3, 
                sucursal_id = $4,
                updated_at = NOW()
        `;
        let params = [nombre, correo, rol, sucursal_id || null];
        let paramIndex = 5;

        // Si se envió contraseña, actualizarla
        if (password && password.trim() !== '') {
            query += `, password = $${paramIndex}`;
            params.push(password);
            paramIndex++;
        }

        query += ` WHERE id = $${paramIndex} RETURNING id, nombre, correo, rol, sucursal_id`;
        params.push(id);

        const result = await pool.query(query, params);

        // Obtener el nombre de la sucursal
        const sucursalResult = await pool.query(
            'SELECT nombre FROM sucursales WHERE id = $1',
            [result.rows[0].sucursal_id]
        );

        const usuarioResponse = {
            ...result.rows[0],
            sucursal_nombre: sucursalResult.rows[0]?.nombre || null
        };

        res.json({
            success: true,
            usuario: usuarioResponse,
            message: 'Usuario actualizado correctamente'
        });
    } catch (error) {
        console.error('❌ Error en PUT /usuarios/:id:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// PUT /usuarios/:id/resetear - Resetear contraseña
// ============================================
router.put('/:id/resetear', async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el usuario existe
        const existe = await pool.query(
            'SELECT id FROM usuarios WHERE id = $1',
            [id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        await pool.query(
            'UPDATE usuarios SET password = $1, resetear_password = true WHERE id = $2',
            ['123456', id]
        );

        res.json({
            success: true,
            message: 'Contraseña reseteada a 123456'
        });
    } catch (error) {
        console.error('❌ Error en PUT /usuarios/:id/resetear:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// DELETE /usuarios/:id - Eliminar usuario
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el usuario existe
        const existe = await pool.query(
            'SELECT id FROM usuarios WHERE id = $1',
            [id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'Usuario eliminado correctamente'
        });
    } catch (error) {
        console.error('❌ Error en DELETE /usuarios/:id:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// PUT /usuarios/:id/sucursal - Actualizar solo la sucursal
// ============================================
router.put('/:id/sucursal', async (req, res) => {
    try {
        const { id } = req.params;
        const { sucursal_id } = req.body;

        // Verificar que el usuario existe
        const existe = await pool.query(
            'SELECT id FROM usuarios WHERE id = $1',
            [id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Verificar que la sucursal existe
        const sucursalExiste = await pool.query(
            'SELECT id, nombre FROM sucursales WHERE id = $1',
            [sucursal_id]
        );

        if (sucursalExiste.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sucursal no encontrada'
            });
        }

        await pool.query(
            'UPDATE usuarios SET sucursal_id = $1, updated_at = NOW() WHERE id = $2',
            [sucursal_id, id]
        );

        res.json({
            success: true,
            message: `Usuario actualizado a la sucursal: ${sucursalExiste.rows[0].nombre}`
        });
    } catch (error) {
        console.error('❌ Error en PUT /usuarios/:id/sucursal:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// POST /usuarios/asignar-masivos - Asignar sucursal a múltiples usuarios
// ============================================
router.post('/asignar-masivos', async (req, res) => {
    try {
        const { usuario_ids, sucursal_id } = req.body;

        if (!usuario_ids || usuario_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Debes proporcionar al menos un usuario'
            });
        }

        // Verificar que la sucursal existe
        const sucursalExiste = await pool.query(
            'SELECT id, nombre FROM sucursales WHERE id = $1',
            [sucursal_id]
        );

        if (sucursalExiste.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sucursal no encontrada'
            });
        }

        // Actualizar todos los usuarios
        const result = await pool.query(
            `UPDATE usuarios 
             SET sucursal_id = $1, updated_at = NOW() 
             WHERE id = ANY($2::int[])
             RETURNING id, nombre, correo, rol`,
            [sucursal_id, usuario_ids]
        );

        res.json({
            success: true,
            message: `${result.rows.length} usuarios actualizados a la sucursal: ${sucursalExiste.rows[0].nombre}`,
            usuarios: result.rows
        });
    } catch (error) {
        console.error('❌ Error en POST /usuarios/asignar-masivos:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;