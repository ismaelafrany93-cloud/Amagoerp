const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /clientes - Obtener clientes con filtro por sucursal
// ============================================
router.get('/', async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        
        let query = `
            SELECT 
                c.id, 
                c.nombre, 
                c.telefono, 
                c.direccion,
                c.referencia,
                c.es_mayorista,
                c.saldo_pendiente,
                c.sucursal_id,
                s.nombre as sucursal_nombre,
                c.created_at
            FROM clientes c
            LEFT JOIN sucursales s ON c.sucursal_id = s.id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        // Si se envía sucursal_id, filtrar
        if (sucursal_id) {
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
        const { 
            nombre, 
            telefono, 
            direccion, 
            referencia,
            sucursal_id,
            es_mayorista
        } = req.body;

        if (!nombre) {
            return res.status(400).json({
                success: false,
                error: 'El nombre es requerido'
            });
        }

        const result = await pool.query(
            `INSERT INTO clientes 
             (nombre, telefono, direccion, referencia, sucursal_id, es_mayorista)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                nombre, 
                telefono || '', 
                direccion || '', 
                referencia || '',
                sucursal_id || null,
                es_mayorista || false
            ]
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
        const { 
            nombre, 
            telefono, 
            direccion, 
            referencia,
            sucursal_id,
            es_mayorista
        } = req.body;

        // Verificar que el cliente existe
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
                 sucursal_id = $5,
                 es_mayorista = $6
             WHERE id = $7
             RETURNING *`,
            [
                nombre, 
                telefono || '', 
                direccion || '', 
                referencia || '',
                sucursal_id || null,
                es_mayorista || false,
                id
            ]
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
// GET /clientes/mayoristas - Obtener clientes mayoristas
// ============================================
router.get('/mayoristas', async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        
        let query = `
            SELECT * FROM clientes 
            WHERE es_mayorista = true
        `;
        let params = [];
        
        if (sucursal_id) {
            query += ` AND sucursal_id = $1`;
            params.push(sucursal_id);
        }
        
        query += ` ORDER BY nombre ASC`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en GET /clientes/mayoristas:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PUT /clientes/:id/mayorista - Marcar/Desmarcar como mayorista
// ============================================
router.put('/:id/mayorista', async (req, res) => {
    try {
        const { id } = req.params;
        const { es_mayorista } = req.body;
        
        const result = await pool.query(
            `UPDATE clientes 
             SET es_mayorista = $1, 
                 updated_at = NOW() 
             WHERE id = $2 
             RETURNING *`,
            [es_mayorista, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        res.json({
            success: true,
            message: es_mayorista ? '✅ Cliente marcado como mayorista' : '❌ Cliente desmarcado como mayorista',
            cliente: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Error en PUT /clientes/:id/mayorista:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// POST /clientes/mayorista - Crear cliente mayorista directamente
// ============================================
router.post('/mayorista', async (req, res) => {
    try {
        const { 
            nombre, 
            telefono, 
            direccion, 
            email,
            referencia,
            sucursal_id,
            created_by 
        } = req.body;
        
        const result = await pool.query(
            `INSERT INTO clientes (
                nombre, telefono, direccion, email, 
                referencia, sucursal_id, es_mayorista, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, true, $7)
            RETURNING *`,
            [nombre, telefono, direccion, email, referencia, sucursal_id, created_by]
        );
        
        res.json({
            success: true,
            message: '✅ Cliente mayorista creado correctamente',
            cliente: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Error en POST /clientes/mayorista:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// DELETE /clientes/:id - Eliminar cliente
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el cliente existe
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