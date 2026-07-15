const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /clientes - Obtener clientes con filtro por sucursal
// ============================================
router.get('/', async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        const { rol } = req.query; // Para saber si es subgerente
        
        let query = `
            SELECT 
                c.id, 
                c.nombre, 
                c.telefono, 
                c.direccion,
                c.referencia,
                c.sucursal_id,
                s.nombre as sucursal_nombre,
                c.created_at
            FROM clientes c
            LEFT JOIN sucursales s ON c.sucursal_id = s.id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        // Si NO es subgerente, filtrar por su sucursal
        if (sucursal_id && rol !== 'subgerente' && rol !== 'dueno' && rol !== 'admin') {
            query += ` AND c.sucursal_id = $${paramIndex}`;
            params.push(sucursal_id);
            paramIndex++;
        }

        query += ` ORDER BY c.nombre`;

        const result = await pool.query(query, params);
        res.json(result.rows || []);
        
    } catch (error) {
        console.error('❌ Error en GET /clientes:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// POST /clientes - Crear cliente
// ============================================
router.post('/', async (req, res) => {
    try {
        const { nombre, telefono, direccion, referencia, sucursal_id } = req.body;

        // Validar datos
        if (!nombre) {
            return res.status(400).json({
                success: false,
                error: 'El nombre es requerido'
            });
        }

        const result = await pool.query(
            `INSERT INTO clientes 
             (nombre, telefono, direccion, referencia, sucursal_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [nombre, telefono || '', direccion || '', referencia || '', sucursal_id || null]
        );

        res.json({
            success: true,
            cliente: result.rows[0],
            message: 'Cliente creado correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error en POST /clientes:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// PUT /clientes/:id - Actualizar cliente
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, telefono, direccion, referencia, sucursal_id } = req.body;

        const existe = await pool.query(
            'SELECT id FROM clientes WHERE id = $1',
            [id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }

        const result = await pool.query(
            `UPDATE clientes 
             SET nombre = $1, 
                 telefono = $2, 
                 direccion = $3, 
                 referencia = $4,
                 sucursal_id = $5
             WHERE id = $6
             RETURNING *`,
            [nombre, telefono || '', direccion || '', referencia || '', sucursal_id || null, id]
        );

        res.json({
            success: true,
            cliente: result.rows[0],
            message: 'Cliente actualizado correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error en PUT /clientes/:id:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// DELETE /clientes/:id - Eliminar cliente
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const existe = await pool.query(
            'SELECT id FROM clientes WHERE id = $1',
            [id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }

        await pool.query('DELETE FROM clientes WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'Cliente eliminado correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error en DELETE /clientes/:id:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;