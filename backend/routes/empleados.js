const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /empleados/actividad-usuario/:id - Actividad de un usuario por ID
// ============================================
router.get('/actividad-usuario/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo, fecha, semana, mes, ano } = req.query;
        
        console.log('🔍 GET /empleados/actividad-usuario:', { id, tipo, fecha, semana, mes, ano });
        
        // Obtener datos del usuario
        const usuarioResult = await pool.query(
            `SELECT u.*, s.nombre as sucursal_nombre 
             FROM usuarios u
             LEFT JOIN sucursales s ON u.sucursal_id = s.id
             WHERE u.id = $1`,
            [id]
        );
        
        if (usuarioResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Usuario no encontrado' 
            });
        }
        
        const usuario = usuarioResult.rows[0];
        let data = [];
        
        // Según el rol, mostrar diferentes actividades
        if (['vendedor', 'vendedora'].includes(usuario.rol)) {
            data = await getActividadVendedor(usuario.id, tipo, fecha, semana, mes, ano);
        } else if (usuario.rol === 'operario') {
            data = await getActividadOperario(usuario.nombre, tipo, fecha, semana, mes, ano);
        } else if (['administrativo', 'gerente', 'subgerente'].includes(usuario.rol)) {
            data = await getActividadAdministrativo(usuario.id, tipo, fecha, semana, mes, ano);
        } else {
            data = await getActividadGeneral(usuario.id, tipo, fecha, semana, mes, ano);
        }
        
        res.json({
            success: true,
            data: data,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                rol: usuario.rol,
                sucursal: usuario.sucursal_nombre
            }
        });
        
    } catch (error) {
        console.error('❌ Error en GET /empleados/actividad-usuario:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// GET /empleados/estadisticas/:id - Estadísticas del usuario
// ============================================
router.get('/estadisticas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { mes, ano } = req.query;
        
        const mesActual = mes || new Date().getMonth() + 1;
        const anoActual = ano || new Date().getFullYear();
        
        const usuarioResult = await pool.query(
            'SELECT * FROM usuarios WHERE id = $1',
            [id]
        );
        
        if (usuarioResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Usuario no encontrado' 
            });
        }
        
        const usuario = usuarioResult.rows[0];
        let estadisticas = {
            total_registros: 0,
            total_ventas: 0,
            total_produccion: 0,
            total_monto: 0
        };
        
        if (['vendedor', 'vendedora'].includes(usuario.rol)) {
            const ventasResult = await pool.query(
                `SELECT 
                    COUNT(*) as total_ventas,
                    COALESCE(SUM(total), 0) as total_monto
                FROM ventas 
                WHERE usuario_id = $1 
                AND EXTRACT(MONTH FROM fecha) = $2 
                AND EXTRACT(YEAR FROM fecha) = $3
                AND estado != 'cancelada'`,
                [usuario.id, mesActual, anoActual]
            );
            
            estadisticas.total_ventas = parseInt(ventasResult.rows[0]?.total_ventas || 0);
            estadisticas.total_monto = parseFloat(ventasResult.rows[0]?.total_monto || 0);
            estadisticas.total_registros = estadisticas.total_ventas;
        } else if (usuario.rol === 'operario') {
            const produccionResult = await pool.query(
                `SELECT 
                    COUNT(*) as total_produccion,
                    COALESCE(SUM(cantidad), 0) as total_unidades
                FROM produccion 
                WHERE operario = $1 
                AND EXTRACT(MONTH FROM fecha) = $2 
                AND EXTRACT(YEAR FROM fecha) = $3`,
                [usuario.nombre, mesActual, anoActual]
            );
            
            estadisticas.total_produccion = parseInt(produccionResult.rows[0]?.total_produccion || 0);
            estadisticas.total_registros = estadisticas.total_produccion;
        }
        
        res.json({
            success: true,
            estadisticas: estadisticas
        });
        
    } catch (error) {
        console.error('❌ Error en GET /empleados/estadisticas:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// FUNCIÓN: Actividad para Vendedores
// ============================================
async function getActividadVendedor(usuarioId, tipo, fecha, semana, mes, ano) {
    let query = `
        SELECT 
            v.id as venta_id,
            v.fecha,
            v.total,
            v.tipo_pago,
            v.estado,
            c.nombre as cliente_nombre,
            COALESCE(
                (SELECT COUNT(*) FROM detalle_ventas WHERE venta_id = v.id),
                0
            ) as productos_vendidos
        FROM ventas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        WHERE v.usuario_id = $1
        AND v.estado != 'cancelada'
    `;
    let params = [usuarioId];
    let paramCount = 2;
    
    if (tipo === 'dia' && fecha) {
        query += ` AND DATE(v.fecha) = $${paramCount}`;
        params.push(fecha);
        paramCount++;
    } else if (tipo === 'semana' && semana && mes && ano) {
        const diaInicio = (semana - 1) * 7 + 1;
        const diaFin = Math.min(semana * 7, new Date(ano, mes, 0).getDate());
        const fechaInicio = `${ano}-${mes.toString().padStart(2, '0')}-${diaInicio.toString().padStart(2, '0')}`;
        const fechaFin = `${ano}-${mes.toString().padStart(2, '0')}-${diaFin.toString().padStart(2, '0')}`;
        query += ` AND DATE(v.fecha) >= $${paramCount} AND DATE(v.fecha) <= $${paramCount + 1}`;
        params.push(fechaInicio, fechaFin);
        paramCount += 2;
    } else if (tipo === 'mes' && mes && ano) {
        query += ` AND EXTRACT(MONTH FROM v.fecha) = $${paramCount} AND EXTRACT(YEAR FROM v.fecha) = $${paramCount + 1}`;
        params.push(mes, ano);
        paramCount += 2;
    }
    
    query += ` ORDER BY v.fecha DESC`;
    
    const result = await pool.query(query, params);
    return result.rows;
}

// ============================================
// FUNCIÓN: Actividad para Operarios
// ============================================
async function getActividadOperario(operarioNombre, tipo, fecha, semana, mes, ano) {
    let query = `
        SELECT 
            p.id as produccion_id,
            p.fecha,
            p.producto_id,
            prod.nombre as producto_nombre,
            p.cantidad,
            p.observaciones
        FROM produccion p
        JOIN productos prod ON p.producto_id = prod.id
        WHERE p.operario = $1
    `;
    let params = [operarioNombre];
    let paramCount = 2;
    
    if (tipo === 'dia' && fecha) {
        query += ` AND DATE(p.fecha) = $${paramCount}`;
        params.push(fecha);
        paramCount++;
    } else if (tipo === 'semana' && semana && mes && ano) {
        const diaInicio = (semana - 1) * 7 + 1;
        const diaFin = Math.min(semana * 7, new Date(ano, mes, 0).getDate());
        const fechaInicio = `${ano}-${mes.toString().padStart(2, '0')}-${diaInicio.toString().padStart(2, '0')}`;
        const fechaFin = `${ano}-${mes.toString().padStart(2, '0')}-${diaFin.toString().padStart(2, '0')}`;
        query += ` AND DATE(p.fecha) >= $${paramCount} AND DATE(p.fecha) <= $${paramCount + 1}`;
        params.push(fechaInicio, fechaFin);
        paramCount += 2;
    } else if (tipo === 'mes' && mes && ano) {
        query += ` AND EXTRACT(MONTH FROM p.fecha) = $${paramCount} AND EXTRACT(YEAR FROM p.fecha) = $${paramCount + 1}`;
        params.push(mes, ano);
        paramCount += 2;
    }
    
    query += ` ORDER BY p.fecha DESC`;
    
    const result = await pool.query(query, params);
    return result.rows;
}

// ============================================
// FUNCIÓN: Actividad para Administrativos
// ============================================
async function getActividadAdministrativo(usuarioId, tipo, fecha, semana, mes, ano) {
    let query = `
        SELECT 
            'Actividad administrativa' as actividad,
            NOW() as fecha,
            'Registro general' as detalle
        WHERE 1=0
    `;
    // Por ahora, retornar vacío para administrativos
    const result = await pool.query(query);
    return result.rows;
}

// ============================================
// FUNCIÓN: Actividad General
// ============================================
async function getActividadGeneral(usuarioId, tipo, fecha, semana, mes, ano) {
    let query = `
        SELECT 
            'Registro general' as actividad,
            NOW() as fecha,
            'Sin detalles' as detalle
        WHERE 1=0
    `;
    const result = await pool.query(query);
    return result.rows;
}

// ============================================
// GET /empleados/lista - Lista de empleados con filtros
// ============================================
router.get('/lista', async (req, res) => {
    try {
        const { sucursal_id, rol, activo } = req.query;
        
        let query = `
            SELECT 
                u.*,
                s.nombre as sucursal_nombre
            FROM usuarios u
            LEFT JOIN sucursales s ON u.sucursal_id = s.id
            WHERE 1=1
        `;
        let params = [];
        let paramCount = 1;
        
        if (sucursal_id) {
            query += ` AND u.sucursal_id = $${paramCount}`;
            params.push(sucursal_id);
            paramCount++;
        }
        
        if (rol && rol !== 'todos') {
            query += ` AND u.rol = $${paramCount}`;
            params.push(rol);
            paramCount++;
        }
        
        if (activo !== undefined) {
            query += ` AND u.activo = $${paramCount}`;
            params.push(activo === 'true');
            paramCount++;
        }
        
        query += ` ORDER BY u.nombre`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
        
    } catch (error) {
        console.error('❌ Error en GET /empleados/lista:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /empleados/stats/:id - Estadísticas del empleado
// ============================================
router.get('/stats/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { mes, ano } = req.query;
        
        const mesActual = mes || new Date().getMonth() + 1;
        const anoActual = ano || new Date().getFullYear();
        
        const usuarioResult = await pool.query(
            'SELECT * FROM usuarios WHERE id = $1',
            [id]
        );
        
        if (usuarioResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        const usuario = usuarioResult.rows[0];
        let stats = {};
        
        if (['vendedor', 'vendedora'].includes(usuario.rol)) {
            const ventasResult = await pool.query(
                `SELECT 
                    COUNT(*) as total_ventas,
                    COALESCE(SUM(total), 0) as total_monto,
                    COALESCE(SUM(CASE WHEN tipo_pago = 'Crédito' THEN total ELSE 0 END), 0) as total_credito,
                    COALESCE(SUM(CASE WHEN tipo_pago != 'Crédito' THEN total ELSE 0 END), 0) as total_contado
                FROM ventas 
                WHERE usuario_id = $1 
                AND EXTRACT(MONTH FROM fecha) = $2 
                AND EXTRACT(YEAR FROM fecha) = $3
                AND estado != 'cancelada'`,
                [usuario.id, mesActual, anoActual]
            );
            
            stats = ventasResult.rows[0] || {};
            stats.mes = mesActual;
            stats.ano = anoActual;
            stats.rol = usuario.rol;
            stats.nombre = usuario.nombre;
        } else if (usuario.rol === 'operario') {
            const produccionResult = await pool.query(
                `SELECT 
                    COUNT(*) as total_producciones,
                    COALESCE(SUM(cantidad), 0) as total_unidades
                FROM produccion 
                WHERE operario = $1 
                AND EXTRACT(MONTH FROM fecha) = $2 
                AND EXTRACT(YEAR FROM fecha) = $3`,
                [usuario.nombre, mesActual, anoActual]
            );
            
            stats = produccionResult.rows[0] || {};
            stats.mes = mesActual;
            stats.ano = anoActual;
            stats.rol = usuario.rol;
            stats.nombre = usuario.nombre;
        }
        
        res.json({
            success: true,
            stats: stats
        });
        
    } catch (error) {
        console.error('❌ Error en GET /empleados/stats:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;