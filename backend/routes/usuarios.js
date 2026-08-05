const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /usuarios/areas - Obtener todas las áreas (DEBE IR PRIMERO)
// ============================================
router.get('/areas', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, nombre, icono, color FROM areas ORDER BY nombre`
        );
        res.json(result.rows || []);
    } catch (error) {
        console.error('❌ Error en GET /usuarios/areas:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// GET /usuarios - Obtener todos los usuarios
// ============================================
router.get('/', async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        
        let query = `
            SELECT 
                u.id, 
                u.nombre, 
                u.correo, 
                u.rol, 
                u.sucursal_id,
                u.area_id,
                s.nombre as sucursal_nombre,
                a.nombre as area_nombre,
                a.icono as area_icono,
                a.color as area_color,
                u.resetear_password,
                u.created_at
             FROM usuarios u
             LEFT JOIN sucursales s ON u.sucursal_id = s.id
             LEFT JOIN areas a ON u.area_id = a.id
             WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (sucursal_id) {
            query += ` AND u.sucursal_id = $${paramIndex}`;
            params.push(sucursal_id);
            paramIndex++;
        }

        query += ` ORDER BY u.nombre`;

        const result = await pool.query(query, params);
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
// GET /usuarios/:id - Obtener usuario por ID (DEBE IR DESPUÉS DE /areas)
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validar que id sea un número
        if (isNaN(id) || parseInt(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ID de usuario inválido'
            });
        }

        const result = await pool.query(
            `SELECT 
                u.id, 
                u.nombre, 
                u.correo, 
                u.rol, 
                u.sucursal_id,
                u.area_id,
                s.nombre as sucursal_nombre,
                a.nombre as area_nombre,
                a.icono as area_icono,
                u.resetear_password,
                u.created_at
             FROM usuarios u
             LEFT JOIN sucursales s ON u.sucursal_id = s.id
             LEFT JOIN areas a ON u.area_id = a.id
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
        const { nombre, correo, password, rol, sucursal_id, area_id } = req.body;

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
             (nombre, correo, password, rol, sucursal_id, area_id, resetear_password)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, nombre, correo, rol, sucursal_id, area_id`,
            [nombre, correo, password || '123456', rol || 'vendedor', sucursal_id || null, area_id || null, false]
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
        const { nombre, correo, rol, sucursal_id, area_id, password } = req.body;

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
                area_id = $5,
                updated_at = NOW()
        `;
        let params = [nombre, correo, rol, sucursal_id || null, area_id || null];
        let paramIndex = 6;

        // Si se envió contraseña, actualizarla
        if (password && password.trim() !== '') {
            query += `, password = $${paramIndex}`;
            params.push(password);
            paramIndex++;
        }

        query += ` WHERE id = $${paramIndex} RETURNING id, nombre, correo, rol, sucursal_id, area_id`;
        params.push(id);

        const result = await pool.query(query, params);

        // Obtener nombres de sucursal y área
        const sucursalResult = await pool.query(
            'SELECT nombre FROM sucursales WHERE id = $1',
            [result.rows[0].sucursal_id]
        );

        const areaResult = await pool.query(
            'SELECT nombre, icono FROM areas WHERE id = $1',
            [result.rows[0].area_id]
        );

        const usuarioResponse = {
            ...result.rows[0],
            sucursal_nombre: sucursalResult.rows[0]?.nombre || null,
            area_nombre: areaResult.rows[0]?.nombre || null,
            area_icono: areaResult.rows[0]?.icono || null
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