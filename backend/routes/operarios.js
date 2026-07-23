const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /operarios - Obtener todos los operarios
// ============================================
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                u.id, 
                u.nombre, 
                u.rol, 
                u.area_id,
                a.nombre as area_nombre,
                a.icono as area_icono,
                a.color as area_color
             FROM usuarios u
             LEFT JOIN areas a ON u.area_id = a.id
             WHERE u.rol = 'operario'
             ORDER BY u.nombre`
        );
        res.json(result.rows || []);
    } catch (error) {
        console.error('❌ Error en GET /operarios:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// POST /operarios - Crear un nuevo operario
// ============================================
router.post('/', async (req, res) => {
    try {
        const { nombre, area_id } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                success: false,
                error: 'El nombre del operario es requerido'
            });
        }

        console.log('📝 Creando operario:', { nombre, area_id });

        const result = await pool.query(
            `INSERT INTO usuarios (nombre, rol, area_id, sucursal_id) 
             VALUES ($1, 'operario', $2, 3) 
             RETURNING id, nombre, rol, area_id`,
            [nombre.trim(), area_id || null]
        );

        console.log('✅ Operario creado:', result.rows[0]);

        res.json({
            success: true,
            message: '✅ Operario agregado correctamente',
            usuario: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Error en POST /operarios:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// DELETE /operarios/:id - Eliminar un operario
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        console.log('🗑️ Eliminando operario ID:', id);

        // Verificar que el usuario existe y es operario
        const existe = await pool.query(
            'SELECT id, nombre, rol FROM usuarios WHERE id = $1 AND rol = \'operario\'',
            [id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Operario no encontrado'
            });
        }

        console.log('👤 Operario a eliminar:', existe.rows[0]);

        // Eliminar el operario
        await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);

        console.log('✅ Operario eliminado');

        res.json({
            success: true,
            message: '✅ Operario eliminado correctamente'
        });
    } catch (error) {
        console.error('❌ Error en DELETE /operarios/:id:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;