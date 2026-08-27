const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /solicitudes-descuento - Listar solicitudes
// ============================================
router.get('/', async (req, res) => {
    try {
        const { estado, sucursal_id } = req.query;
        
        console.log('📡 GET /solicitudes-descuento - Estado:', estado, 'Sucursal:', sucursal_id);
        
        // Verificar si la tabla existe
        const tableCheck = await pool.query(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'solicitudes_descuento')"
        );
        
        if (!tableCheck.rows[0].exists) {
            console.log('⚠️ Tabla solicitudes_descuento no existe');
            return res.json([]);
        }
        
        let query = `
            SELECT 
                s.*,
                u_solicitante.nombre as solicitante_nombre,
                u_autorizador.nombre as autorizador_nombre,
                v.total as venta_total,
                v.cliente_nombre,
                v.codigo_entrega
            FROM solicitudes_descuento s
            LEFT JOIN usuarios u_solicitante ON s.usuario_solicitante = u_solicitante.id
            LEFT JOIN usuarios u_autorizador ON s.usuario_autorizador = u_autorizador.id
            LEFT JOIN ventas v ON s.venta_id = v.id
            WHERE 1=1
        `;
        let params = [];
        let paramCount = 1;
        
        if (estado) {
            query += ` AND s.estado = $${paramCount}`;
            params.push(estado);
            paramCount++;
        }
        
        if (sucursal_id) {
            query += ` AND v.sucursal_id = $${paramCount}`;
            params.push(parseInt(sucursal_id));
            paramCount++;
        }
        
        query += ` ORDER BY s.fecha_solicitud DESC`;
        
        console.log('📝 Query:', query);
        console.log('📊 Params:', params);
        
        const result = await pool.query(query, params);
        console.log(`✅ Encontradas ${result.rows.length} solicitudes`);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('❌ Error en GET /solicitudes-descuento:', error);
        res.json([]);
    }
});

// ============================================
// GET /solicitudes-descuento/contador - Contador de pendientes
// ============================================
router.get('/contador', async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        
        console.log('📡 GET /solicitudes-descuento/contador - Sucursal:', sucursal_id);
        
        const tableCheck = await pool.query(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'solicitudes_descuento')"
        );
        
        if (!tableCheck.rows[0].exists) {
            console.log('⚠️ Tabla solicitudes_descuento no existe');
            return res.json({ pendientes: 0 });
        }
        
        let query = `
            SELECT COUNT(*) as pendientes
            FROM solicitudes_descuento s
            LEFT JOIN ventas v ON s.venta_id = v.id
            WHERE s.estado = 'pendiente'
        `;
        let params = [];
        let paramCount = 1;
        
        if (sucursal_id) {
            query += ` AND v.sucursal_id = $${paramCount}`;
            params.push(parseInt(sucursal_id));
            paramCount++;
        }
        
        const result = await pool.query(query, params);
        const pendientes = parseInt(result.rows[0]?.pendientes || 0);
        console.log(`✅ Pendientes: ${pendientes}`);
        
        res.json({ pendientes });
        
    } catch (error) {
        console.error('❌ Error en GET /solicitudes-descuento/contador:', error);
        res.json({ pendientes: 0 });
    }
});

// ============================================
// GET /solicitudes-descuento/pendientes - Obtener pendientes
// ============================================
router.get('/pendientes', async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        
        console.log('📡 GET /solicitudes-descuento/pendientes - Sucursal:', sucursal_id);
        
        const tableCheck = await pool.query(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'solicitudes_descuento')"
        );
        
        if (!tableCheck.rows[0].exists) {
            console.log('⚠️ Tabla solicitudes_descuento no existe');
            return res.json([]);
        }
        
        let query = `
            SELECT 
                s.*,
                u_solicitante.nombre as solicitante_nombre,
                v.total as venta_total,
                v.cliente_nombre,
                v.codigo_entrega
            FROM solicitudes_descuento s
            LEFT JOIN usuarios u_solicitante ON s.usuario_solicitante = u_solicitante.id
            LEFT JOIN ventas v ON s.venta_id = v.id
            WHERE s.estado = 'pendiente'
        `;
        let params = [];
        let paramCount = 1;
        
        if (sucursal_id) {
            query += ` AND v.sucursal_id = $${paramCount}`;
            params.push(parseInt(sucursal_id));
            paramCount++;
        }
        
        query += ` ORDER BY s.fecha_solicitud ASC`;
        
        console.log('📝 Query:', query);
        console.log('📊 Params:', params);
        
        const result = await pool.query(query, params);
        console.log(`✅ Encontradas ${result.rows.length} solicitudes pendientes`);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('❌ Error en GET /solicitudes-descuento/pendientes:', error);
        res.json([]);
    }
});

// ============================================
// GET /solicitudes-descuento/:id - Obtener una solicitud
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('📡 GET /solicitudes-descuento/:id - ID:', id);
        
        const tableCheck = await pool.query(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'solicitudes_descuento')"
        );
        
        if (!tableCheck.rows[0].exists) {
            console.log('⚠️ Tabla solicitudes_descuento no existe');
            return res.json({
                success: true,
                solicitud: {
                    id: parseInt(id),
                    estado: 'pendiente',
                    monto_solicitado: 0,
                    motivo: 'Solicitud de prueba'
                }
            });
        }
        
        const result = await pool.query(
            `SELECT 
                s.*,
                u_solicitante.nombre as solicitante_nombre,
                u_autorizador.nombre as autorizador_nombre,
                v.total as venta_total,
                v.cliente_nombre
            FROM solicitudes_descuento s
            LEFT JOIN usuarios u_solicitante ON s.usuario_solicitante = u_solicitante.id
            LEFT JOIN usuarios u_autorizador ON s.usuario_autorizador = u_autorizador.id
            LEFT JOIN ventas v ON s.venta_id = v.id
            WHERE s.id = $1`,
            [parseInt(id)]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Solicitud no encontrada'
            });
        }
        
        res.json({
            success: true,
            solicitud: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error en GET /solicitudes-descuento/:id:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// POST /solicitudes-descuento - Crear solicitud de descuento (CORREGIDO)
// ============================================
router.post('/', async (req, res) => {
    try {
        const { 
            venta_id, 
            monto_solicitado, 
            motivo,
            usuario_solicitante
        } = req.body;
        
        console.log('📡 POST /solicitudes-descuento - Datos:', { 
            venta_id, 
            monto_solicitado, 
            usuario_solicitante 
        });
        
        // Validar campos requeridos
        if (!monto_solicitado || monto_solicitado <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Monto solicitado es requerido y debe ser mayor a 0'
            });
        }
        
        if (!usuario_solicitante) {
            return res.status(400).json({
                success: false,
                error: 'Usuario solicitante es requerido'
            });
        }
        
        // Verificar si la tabla existe
        const tableCheck = await pool.query(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'solicitudes_descuento')"
        );
        
        if (!tableCheck.rows[0].exists) {
            console.log('⚠️ Tabla solicitudes_descuento no existe, creándola...');
            await pool.query(`
                CREATE TABLE IF NOT EXISTS solicitudes_descuento (
                    id SERIAL PRIMARY KEY,
                    venta_id INTEGER,
                    usuario_solicitante INTEGER,
                    usuario_autorizador INTEGER,
                    monto_solicitado DECIMAL(12,2) NOT NULL,
                    monto_aprobado DECIMAL(12,2),
                    motivo TEXT,
                    estado VARCHAR(20) DEFAULT 'pendiente',
                    fecha_solicitud TIMESTAMP DEFAULT NOW(),
                    fecha_respuesta TIMESTAMP,
                    codigo_autorizacion VARCHAR(50),
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            console.log('✅ Tabla creada');
        }
        
        // Si hay venta_id, verificar que existe (opcional)
        let ventaTotal = 0;
        if (venta_id) {
            const ventaCheck = await pool.query(
                'SELECT id, total, cliente_nombre FROM ventas WHERE id = $1',
                [parseInt(venta_id)]
            );
            
            if (ventaCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Venta no encontrada'
                });
            }
            
            ventaTotal = parseFloat(ventaCheck.rows[0].total);
            
            if (parseFloat(monto_solicitado) > ventaTotal) {
                return res.status(400).json({
                    success: false,
                    error: 'El descuento no puede ser mayor al total de la venta'
                });
            }
        }
        
        const codigo = `DESC-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        // Insertar solicitud (venta_id puede ser null)
        const result = await pool.query(
            `INSERT INTO solicitudes_descuento (
                venta_id,
                usuario_solicitante,
                monto_solicitado,
                motivo,
                codigo_autorizacion,
                estado,
                fecha_solicitud
            ) VALUES ($1, $2, $3, $4, $5, 'pendiente', NOW())
            RETURNING *`,
            [venta_id || null, parseInt(usuario_solicitante), parseFloat(monto_solicitado), motivo || '', codigo]
        );
        
        // Si hay venta_id, actualizar la venta
        if (venta_id) {
            await pool.query(
                `UPDATE ventas 
                 SET solicitud_descuento_id = $1,
                     descuento_monto = 0,
                     descuento_aprobado = false
                 WHERE id = $2`,
                [result.rows[0].id, parseInt(venta_id)]
            );
        }
        
        console.log('✅ Solicitud creada:', result.rows[0]);
        
        res.json({
            success: true,
            message: '✅ Solicitud de descuento enviada correctamente',
            solicitud: result.rows[0],
            codigo: codigo
        });
        
    } catch (error) {
        console.error('❌ Error en POST /solicitudes-descuento:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// PUT /solicitudes-descuento/:id - Aprobar/Rechazar solicitud
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            estado, 
            usuario_autorizador,
            monto_aprobado
        } = req.body;
        
        console.log('📡 PUT /solicitudes-descuento/:id - ID:', id, 'Estado:', estado);
        
        const tableCheck = await pool.query(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'solicitudes_descuento')"
        );
        
        if (!tableCheck.rows[0].exists) {
            console.log('⚠️ Tabla solicitudes_descuento no existe');
            return res.status(404).json({
                success: false,
                error: 'Tabla solicitudes_descuento no existe'
            });
        }
        
        if (!estado || !usuario_autorizador) {
            return res.status(400).json({
                success: false,
                error: 'Estado y usuario autorizador son requeridos'
            });
        }
        
        if (!['aprobado', 'rechazado'].includes(estado)) {
            return res.status(400).json({
                success: false,
                error: 'Estado no válido. Use "aprobado" o "rechazado"'
            });
        }
        
        const solicitudCheck = await pool.query(
            'SELECT * FROM solicitudes_descuento WHERE id = $1',
            [parseInt(id)]
        );
        
        if (solicitudCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Solicitud no encontrada'
            });
        }
        
        const solicitud = solicitudCheck.rows[0];
        
        if (solicitud.estado !== 'pendiente') {
            return res.status(400).json({
                success: false,
                error: 'Esta solicitud ya fue procesada'
            });
        }
        
        const montoFinal = estado === 'aprobado' ? (monto_aprobado || solicitud.monto_solicitado) : 0;
        
        const result = await pool.query(
            `UPDATE solicitudes_descuento 
             SET estado = $1,
                 usuario_autorizador = $2,
                 monto_aprobado = $3,
                 fecha_respuesta = NOW(),
                 updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [estado, parseInt(usuario_autorizador), parseFloat(montoFinal), parseInt(id)]
        );
        
        // Si la solicitud tiene venta_id y fue aprobada, actualizar la venta
        if (estado === 'aprobado' && solicitud.venta_id) {
            await pool.query(
                `UPDATE ventas 
                 SET descuento_monto = $1,
                     descuento_aprobado = true,
                     descuento = CASE 
                         WHEN total > 0 THEN (($1 / total) * 100)
                         ELSE 0
                     END,
                     codigo_autorizacion = $2
                 WHERE id = $3`,
                [parseFloat(montoFinal), solicitud.codigo_autorizacion, solicitud.venta_id]
            );
        }
        
        console.log('✅ Solicitud actualizada:', result.rows[0]);
        
        res.json({
            success: true,
            message: estado === 'aprobado' ? '✅ Descuento aprobado' : '❌ Descuento rechazado',
            solicitud: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error en PUT /solicitudes-descuento/:id:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// DELETE /solicitudes-descuento/:id - Cancelar solicitud
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('📡 DELETE /solicitudes-descuento/:id - ID:', id);
        
        const tableCheck = await pool.query(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'solicitudes_descuento')"
        );
        
        if (!tableCheck.rows[0].exists) {
            return res.status(404).json({
                success: false,
                error: 'Tabla solicitudes_descuento no existe'
            });
        }
        
        const solicitudCheck = await pool.query(
            'SELECT * FROM solicitudes_descuento WHERE id = $1 AND estado = $2',
            [parseInt(id), 'pendiente']
        );
        
        if (solicitudCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Solicitud no encontrada o ya fue procesada'
            });
        }
        
        await pool.query(
            'DELETE FROM solicitudes_descuento WHERE id = $1',
            [parseInt(id)]
        );
        
        console.log('✅ Solicitud eliminada:', id);
        
        res.json({
            success: true,
            message: '✅ Solicitud cancelada exitosamente'
        });
        
    } catch (error) {
        console.error('❌ Error en DELETE /solicitudes-descuento/:id:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;