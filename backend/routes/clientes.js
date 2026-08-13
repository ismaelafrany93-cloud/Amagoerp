const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /clientes - Obtener clientes
// ============================================
router.get('/', async (req, res) => {
    try {
        const { sucursal_id, es_mayorista } = req.query;
        
        let query = `
            SELECT 
                c.id, 
                c.nombre, 
                c.telefono, 
                c.direccion,
                c.referencia,
                COALESCE(c.es_mayorista, false) as es_mayorista,
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

        if (sucursal_id) {
            query += ` AND c.sucursal_id = $${paramIndex}`;
            params.push(parseInt(sucursal_id));
            paramIndex++;
        }

        if (es_mayorista === 'true') {
            query += ` AND COALESCE(c.es_mayorista, false) = true`;
        } else if (es_mayorista === 'false') {
            query += ` AND (c.es_mayorista = false OR c.es_mayorista IS NULL)`;
        }

        query += ` ORDER BY c.nombre ASC`;

        const result = await pool.query(query, params);
        res.json(result.rows || []);
        
    } catch (error) {
        console.error('❌ Error en GET /clientes:', error.message);
        res.status(500).json([]);
    }
});

// ============================================
// GET /clientes/mayoristas - Obtener clientes mayoristas
// ============================================
router.get('/mayoristas', async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        
        let query = `
            SELECT 
                c.id, 
                c.nombre, 
                c.telefono, 
                c.direccion,
                c.referencia,
                COALESCE(c.es_mayorista, false) as es_mayorista,
                c.saldo_pendiente,
                c.sucursal_id,
                s.nombre as sucursal_nombre,
                c.created_at
            FROM clientes c
            LEFT JOIN sucursales s ON c.sucursal_id = s.id
            WHERE COALESCE(c.es_mayorista, false) = true
        `;
        let params = [];
        let paramIndex = 1;
        
        if (sucursal_id) {
            query += ` AND c.sucursal_id = $${paramIndex}`;
            params.push(parseInt(sucursal_id));
            paramIndex++;
        }
        
        query += ` ORDER BY c.nombre ASC`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en GET /clientes/mayoristas:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /clientes/normales - Obtener clientes normales
// ============================================
router.get('/normales', async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        
        let query = `
            SELECT 
                c.id, 
                c.nombre, 
                c.telefono, 
                c.direccion,
                c.referencia,
                COALESCE(c.es_mayorista, false) as es_mayorista,
                c.saldo_pendiente,
                c.sucursal_id,
                s.nombre as sucursal_nombre,
                c.created_at
            FROM clientes c
            LEFT JOIN sucursales s ON c.sucursal_id = s.id
            WHERE (c.es_mayorista = false OR c.es_mayorista IS NULL)
        `;
        let params = [];
        let paramIndex = 1;
        
        if (sucursal_id) {
            query += ` AND c.sucursal_id = $${paramIndex}`;
            params.push(parseInt(sucursal_id));
            paramIndex++;
        }
        
        query += ` ORDER BY c.nombre ASC`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en GET /clientes/normales:', error);
        res.status(500).json({ error: error.message });
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
                nombre.trim(), 
                telefono || '', 
                direccion || '', 
                referencia || '',
                sucursal_id || 3,
                es_mayorista || false
            ]
        );

        res.json({
            success: true,
            cliente: result.rows[0],
            message: es_mayorista ? '✅ Cliente mayorista creado correctamente' : '✅ Cliente normal creado correctamente'
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
// PUT /clientes/:id - Actualizar cliente (SIN updated_at)
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
                nombre.trim(), 
                telefono || '', 
                direccion || '', 
                referencia || '',
                sucursal_id || 3,
                es_mayorista || false,
                id
            ]
        );

        res.json({
            success: true,
            cliente: result.rows[0],
            message: '✅ Cliente actualizado correctamente'
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
// PUT /clientes/:id/mayorista - Marcar/Desmarcar como mayorista (SIN updated_at)
// ============================================
router.put('/:id/mayorista', async (req, res) => {
    try {
        const { id } = req.params;
        const { es_mayorista } = req.body;
        
        // Verificar que el cliente existe
        const existe = await pool.query(
            'SELECT id FROM clientes WHERE id = $1',
            [id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        const result = await pool.query(
            `UPDATE clientes 
             SET es_mayorista = $1 
             WHERE id = $2 
             RETURNING *`,
            [es_mayorista, id]
        );
        
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
            message: '✅ Cliente eliminado correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error en DELETE /clientes/:id:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// POST /clientes/sincronizar - Sincronizar clientes del historial
// ============================================
router.post('/sincronizar', async (req, res) => {
    try {
        const { sucursal_id } = req.body;
        const sucursalFinal = sucursal_id || 3;
        
        console.log('🔄 Sincronizando clientes del historial...');
        
        const countResult = await pool.query(
            `SELECT COUNT(DISTINCT cliente_nombre) as total 
             FROM ventas 
             WHERE cliente_nombre IS NOT NULL 
               AND cliente_nombre != ''`
        );
        console.log(`📊 Total de clientes en ventas: ${countResult.rows[0].total}`);
        
        const result = await pool.query(
            `INSERT INTO clientes (nombre, telefono, direccion, sucursal_id, es_mayorista, created_at)
             SELECT DISTINCT 
                 TRIM(v.cliente_nombre) as nombre,
                 v.cliente_telefono as telefono,
                 v.cliente_direccion as direccion,
                 COALESCE(v.sucursal_id, $1) as sucursal_id,
                 false as es_mayorista,
                 MIN(v.fecha) as created_at
             FROM ventas v
             WHERE v.cliente_nombre IS NOT NULL 
               AND v.cliente_nombre != ''
               AND NOT EXISTS (
                   SELECT 1 FROM clientes c 
                   WHERE TRIM(LOWER(c.nombre)) = TRIM(LOWER(v.cliente_nombre))
               )
             GROUP BY TRIM(v.cliente_nombre), v.cliente_telefono, v.cliente_direccion, v.sucursal_id`,
            [sucursalFinal]
        );
        
        console.log(`✅ ${result.rowCount} clientes importados del historial`);
        
        res.json({
            success: true,
            message: `✅ ${result.rowCount} clientes sincronizados del historial`,
            clientes_importados: result.rowCount
        });
    } catch (error) {
        console.error('❌ Error en POST /clientes/sincronizar:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;