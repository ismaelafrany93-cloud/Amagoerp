const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================
// CREAR CARPETA DE UPLOADS
// ============================================
const uploadDir = path.join(__dirname, '..', 'uploads', 'pedidos');
if (!fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('📁 Carpeta creada:', uploadDir);
    } catch (err) {
        console.error('❌ Error creando carpeta:', err);
    }
}

// ============================================
// CONFIGURACIÓN DE MULTER
// ============================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'pedido-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
    }
});

// ============================================
// GENERAR CÓDIGO DE PEDIDO
// ============================================
function generarCodigoPedido() {
    const fecha = new Date();
    const ano = fecha.getFullYear().toString().slice(-2);
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PED-${ano}${mes}${dia}-${random}`;
}

// ============================================
// GET /pedidos - Listar pedidos
// ============================================
router.get('/', async (req, res) => {
    try {
        const { sucursal_id, estado, fecha_inicio, fecha_fin } = req.query;
        
        let query = `
            SELECT 
                p.*,
                u.nombre as creador_nombre,
                s.nombre as sucursal_nombre,
                COALESCE(
                    (SELECT SUM(cantidad) FROM detalle_produccion_pedido WHERE pedido_id = p.id),
                    0
                ) as total_producido
            FROM pedidos p
            LEFT JOIN usuarios u ON p.creado_por = u.id
            LEFT JOIN sucursales s ON p.sucursal_id = s.id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (sucursal_id) {
            query += ` AND p.sucursal_id = $${paramIndex}`;
            params.push(parseInt(sucursal_id));
            paramIndex++;
        }

        if (estado) {
            query += ` AND p.estado = $${paramIndex}`;
            params.push(estado);
            paramIndex++;
        }

        if (fecha_inicio) {
            query += ` AND p.fecha_pedido >= $${paramIndex}`;
            params.push(fecha_inicio);
            paramIndex++;
        }

        if (fecha_fin) {
            query += ` AND p.fecha_pedido <= $${paramIndex}`;
            params.push(fecha_fin);
            paramIndex++;
        }

        query += ` ORDER BY p.fecha_pedido DESC, p.id DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en GET /pedidos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /pedidos/:id - Obtener pedido por ID
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const pedidoResult = await pool.query(
            `SELECT 
                p.*,
                u.nombre as creador_nombre,
                s.nombre as sucursal_nombre,
                COALESCE(
                    (SELECT SUM(cantidad) FROM detalle_produccion_pedido WHERE pedido_id = p.id),
                    0
                ) as total_producido
            FROM pedidos p
            LEFT JOIN usuarios u ON p.creado_por = u.id
            LEFT JOIN sucursales s ON p.sucursal_id = s.id
            WHERE p.id = $1`,
            [parseInt(id)]
        );

        if (pedidoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const detallesResult = await pool.query(
            `SELECT 
                d.*
            FROM detalle_produccion_pedido d
            WHERE d.pedido_id = $1
            ORDER BY d.fecha_produccion DESC`,
            [parseInt(id)]
        );

        res.json({
            pedido: pedidoResult.rows[0],
            detalles: detallesResult.rows
        });
    } catch (error) {
        console.error('❌ Error en GET /pedidos/:id:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// POST /pedidos - Crear pedido (CON IMAGEN)
// ============================================
router.post('/', upload.single('imagen'), async (req, res) => {
    try {
        const {
            cliente_nombre,
            cliente_telefono,
            cliente_direccion,
            producto_nombre,
            producto_descripcion,
            cantidad_total,
            prioridad,
            fecha_entrega_estimada,
            observaciones,
            sucursal_id,
            creado_por
        } = req.body;

        if (!cliente_nombre || !producto_nombre || !cantidad_total) {
            return res.status(400).json({
                success: false,
                error: 'Nombre del cliente, producto y cantidad son requeridos'
            });
        }

        const codigo = generarCodigoPedido();
        const imagen_url = req.file ? `/uploads/pedidos/${req.file.filename}` : null;

        console.log('📸 Imagen recibida:', req.file);
        console.log('📸 URL guardada:', imagen_url);

        const result = await pool.query(
            `INSERT INTO pedidos (
                codigo, cliente_nombre, cliente_telefono, cliente_direccion,
                producto_nombre, producto_descripcion, cantidad_total,
                prioridad, fecha_pedido, fecha_entrega_estimada,
                observaciones, imagen_url, sucursal_id, creado_por,
                estado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, $9, $10, $11, $12, $13, 'pendiente')
            RETURNING *`,
            [
                codigo,
                cliente_nombre,
                cliente_telefono || '',
                cliente_direccion || '',
                producto_nombre,
                producto_descripcion || '',
                parseInt(cantidad_total),
                prioridad || 'normal',
                fecha_entrega_estimada || null,
                observaciones || '',
                imagen_url,
                parseInt(sucursal_id) || 3,
                parseInt(creado_por)
            ]
        );

        await pool.query(
            `INSERT INTO historial_pedidos (pedido_id, accion, descripcion, usuario_id)
             VALUES ($1, 'creado', 'Pedido creado: ' || $2, $3)`,
            [result.rows[0].id, producto_nombre, parseInt(creado_por)]
        );

        res.json({
            success: true,
            message: '✅ Pedido creado correctamente',
            pedido: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Error en POST /pedidos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// POST /pedidos/:id/produccion - Agregar producción al pedido
// ============================================
router.post('/:id/produccion', async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidad, operario_nombre, observaciones } = req.body;

        if (!cantidad || cantidad <= 0) {
            return res.status(400).json({
                success: false,
                error: 'La cantidad debe ser mayor a 0'
            });
        }

        const pedidoResult = await pool.query(
            'SELECT id, cantidad_total, cantidad_producida, estado, producto_nombre FROM pedidos WHERE id = $1',
            [parseInt(id)]
        );

        if (pedidoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const pedido = pedidoResult.rows[0];
        const nuevaCantidad = parseInt(pedido.cantidad_producida) + parseInt(cantidad);

        if (nuevaCantidad > parseInt(pedido.cantidad_total)) {
            return res.status(400).json({
                success: false,
                error: `La cantidad excede el total del pedido. Total: ${pedido.cantidad_total}, Producido: ${pedido.cantidad_producida}`
            });
        }

        const nuevoEstado = nuevaCantidad >= parseInt(pedido.cantidad_total) ? 'completado' : 'en_produccion';

        const updateResult = await pool.query(
            `UPDATE pedidos 
             SET cantidad_producida = $1,
                 estado = $2,
                 updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [nuevaCantidad, nuevoEstado, parseInt(id)]
        );

        await pool.query(
            `INSERT INTO detalle_produccion_pedido (
                pedido_id, cantidad, fecha_produccion, operario_nombre, observaciones
            ) VALUES ($1, $2, CURRENT_DATE, $3, $4)`,
            [parseInt(id), parseInt(cantidad), operario_nombre || 'Supervisor', observaciones || '']
        );

        await pool.query(
            `INSERT INTO historial_pedidos (pedido_id, accion, descripcion, usuario_id)
             VALUES ($1, 'produccion', $2 || ' unidades producidas. Total: ' || $3 || ' de ' || $4, $5)`,
            [parseInt(id), parseInt(cantidad), nuevaCantidad, pedido.cantidad_total, req.body.usuario_id || null]
        );

        res.json({
            success: true,
            message: `✅ ${cantidad} unidades producidas correctamente`,
            pedido: updateResult.rows[0]
        });
    } catch (error) {
        console.error('❌ Error en POST /pedidos/:id/produccion:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PUT /pedidos/:id/estado - Cambiar estado del pedido
// ============================================
router.put('/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, usuario_id } = req.body;

        const estadosValidos = ['pendiente', 'en_produccion', 'completado', 'entregado'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                success: false,
                error: 'Estado no válido'
            });
        }

        // 👇 CORREGIDO: usar tipo correcto
        const result = await pool.query(
            `UPDATE pedidos 
             SET estado = $1::varchar,
                 fecha_entrega_real = CASE WHEN $1::varchar = 'entregado' THEN CURRENT_DATE ELSE fecha_entrega_real END,
                 updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [estado, parseInt(id)]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        await pool.query(
            `INSERT INTO historial_pedidos (pedido_id, accion, descripcion, usuario_id)
             VALUES ($1, 'estado', 'Estado cambiado a: ' || $2, $3)`,
            [parseInt(id), estado, usuario_id || null]
        );

        res.json({
            success: true,
            message: `✅ Estado actualizado a: ${estado}`,
            pedido: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Error en PUT /pedidos/:id/estado:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// DELETE /pedidos/:id - Eliminar pedido
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const existe = await pool.query('SELECT id, codigo FROM pedidos WHERE id = $1', [parseInt(id)]);
        if (existe.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        await pool.query('DELETE FROM pedidos WHERE id = $1', [parseInt(id)]);

        res.json({
            success: true,
            message: `✅ Pedido ${existe.rows[0].codigo} eliminado correctamente`
        });
    } catch (error) {
        console.error('❌ Error en DELETE /pedidos/:id:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /pedidos/:id - Obtener pedido por ID (CON OPERARIOS)
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        // Obtener el pedido
        const pedidoResult = await pool.query(
            `SELECT 
                p.*,
                u.nombre as creador_nombre,
                s.nombre as sucursal_nombre,
                COALESCE(
                    (SELECT SUM(cantidad) FROM detalle_produccion_pedido WHERE pedido_id = p.id),
                    0
                ) as total_producido
            FROM pedidos p
            LEFT JOIN usuarios u ON p.creado_por = u.id
            LEFT JOIN sucursales s ON p.sucursal_id = s.id
            WHERE p.id = $1`,
            [parseInt(id)]
        );

        if (pedidoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        // Obtener detalles de producción con operarios
        const detallesResult = await pool.query(
            `SELECT 
                d.*,
                u.nombre as operario_nombre_completo,
                u.rol as operario_rol
            FROM detalle_produccion_pedido d
            LEFT JOIN usuarios u ON d.operario_nombre = u.nombre
            WHERE d.pedido_id = $1
            ORDER BY d.fecha_produccion DESC`,
            [parseInt(id)]
        );

        // 👇 NUEVO: Obtener lista de operarios disponibles (para el selector)
        const operariosResult = await pool.query(
            `SELECT id, nombre, rol 
             FROM usuarios 
             WHERE rol = 'operario' 
             ORDER BY nombre ASC`
        );

        res.json({
            pedido: pedidoResult.rows[0],
            detalles: detallesResult.rows,
            operarios: operariosResult.rows  // 👈 Enviar lista de operarios
        });
    } catch (error) {
        console.error('❌ Error en GET /pedidos/:id:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /pedidos/estadisticas - Estadísticas de pedidos
// ============================================
router.get('/estadisticas', async (req, res) => {
    try {
        const { sucursal_id } = req.query;

        console.log('📊 GET /pedidos/estadisticas - Sucursal:', sucursal_id);

        let query = `
            SELECT 
                COUNT(*) as total_pedidos,
                COALESCE(SUM(cantidad_total), 0) as total_unidades,
                COALESCE(SUM(cantidad_producida), 0) as total_producidas,
                COALESCE(SUM(cantidad_pendiente), 0) as total_pendientes,
                COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
                COUNT(CASE WHEN estado = 'en_produccion' THEN 1 END) as en_produccion,
                COUNT(CASE WHEN estado = 'completado' THEN 1 END) as completados,
                COUNT(CASE WHEN estado = 'entregado' THEN 1 END) as entregados,
                COUNT(CASE WHEN prioridad = 'urgente' THEN 1 END) as urgentes
            FROM pedidos
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (sucursal_id) {
            query += ` AND sucursal_id = $${paramIndex}`;
            params.push(parseInt(sucursal_id));
            paramIndex++;
        }

        const result = await pool.query(query, params);
        console.log('✅ Estadísticas:', result.rows[0]);
        
        res.json(result.rows[0] || {
            total_pedidos: 0,
            total_unidades: 0,
            total_producidas: 0,
            total_pendientes: 0,
            pendientes: 0,
            en_produccion: 0,
            completados: 0,
            entregados: 0,
            urgentes: 0
        });
    } catch (error) {
        console.error('❌ Error en GET /pedidos/estadisticas:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;