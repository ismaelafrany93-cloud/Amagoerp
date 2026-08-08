const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /empleados/actividad/:id - Obtener actividad del empleado
// ============================================
router.get('/actividad/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo, fecha, semana, mes, ano } = req.query;
        
        console.log('🔍 GET /empleados/actividad:', { id, tipo, fecha, semana, mes, ano });
        
        // Obtener datos del empleado
        const empleadoResult = await pool.query(
            'SELECT * FROM empleados WHERE id = $1',
            [id]
        );
        
        if (empleadoResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Empleado no encontrado' 
            });
        }
        
        const empleado = empleadoResult.rows[0];
        let data = [];
        
        // Según el cargo, mostrar diferentes actividades
        if (empleado.cargo === 'vendedor' || empleado.cargo === 'vendedora') {
            data = await getActividadVendedor(id, empleado.usuario_id, tipo, fecha, semana, mes, ano);
        } else if (empleado.cargo === 'operario') {
            data = await getActividadOperario(id, tipo, fecha, semana, mes, ano);
        } else if (empleado.cargo === 'administrativo') {
            data = await getActividadAdministrativo(id, tipo, fecha, semana, mes, ano);
        } else {
            data = await getActividadGeneral(id, tipo, fecha, semana, mes, ano);
        }
        
        res.json({
            success: true,
            data: data,
            empleado: {
                id: empleado.id,
                nombre: empleado.nombre,
                cargo: empleado.cargo
            }
        });
        
    } catch (error) {
        console.error('❌ Error en GET /empleados/actividad:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// FUNCIÓN: Actividad para Vendedores
// ============================================
async function getActividadVendedor(empleadoId, usuarioId, tipo, fecha, semana, mes, ano) {
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
async function getActividadOperario(empleadoId, tipo, fecha, semana, mes, ano) {
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
        WHERE p.operario = (SELECT nombre FROM empleados WHERE id = $1)
    `;
    let params = [empleadoId];
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
async function getActividadAdministrativo(empleadoId, tipo, fecha, semana, mes, ano) {
    // Por ahora, actividad general
    return getActividadGeneral(empleadoId, tipo, fecha, semana, mes, ano);
}

// ============================================
// FUNCIÓN: Actividad General
// ============================================
async function getActividadGeneral(empleadoId, tipo, fecha, semana, mes, ano) {
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
        const { sucursal_id, cargo, activo } = req.query;
        
        let query = `
            SELECT 
                e.*,
                s.nombre as sucursal_nombre
            FROM empleados e
            LEFT JOIN sucursales s ON e.sucursal_id = s.id
            WHERE 1=1
        `;
        let params = [];
        let paramCount = 1;
        
        if (sucursal_id) {
            query += ` AND e.sucursal_id = $${paramCount}`;
            params.push(sucursal_id);
            paramCount++;
        }
        
        if (cargo && cargo !== 'todos') {
            query += ` AND e.cargo = $${paramCount}`;
            params.push(cargo);
            paramCount++;
        }
        
        if (activo !== undefined) {
            query += ` AND e.activo = $${paramCount}`;
            params.push(activo === 'true');
            paramCount++;
        }
        
        query += ` ORDER BY e.nombre`;
        
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
        
        // Obtener datos del empleado
        const empleadoResult = await pool.query(
            'SELECT * FROM empleados WHERE id = $1',
            [id]
        );
        
        if (empleadoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }
        
        const empleado = empleadoResult.rows[0];
        let stats = {};
        
        if (empleado.cargo === 'vendedor' || empleado.cargo === 'vendedora') {
            // Ventas del mes
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
                [empleado.usuario_id, mesActual, anoActual]
            );
            
            stats = ventasResult.rows[0] || {};
            stats.mes = mesActual;
            stats.ano = anoActual;
            stats.cargo = empleado.cargo;
            stats.nombre = empleado.nombre;
        } else if (empleado.cargo === 'operario') {
            // Producción del mes
            const produccionResult = await pool.query(
                `SELECT 
                    COUNT(*) as total_producciones,
                    COALESCE(SUM(cantidad), 0) as total_unidades
                FROM produccion 
                WHERE operario = $1 
                AND EXTRACT(MONTH FROM fecha) = $2 
                AND EXTRACT(YEAR FROM fecha) = $3`,
                [empleado.nombre, mesActual, anoActual]
            );
            
            stats = produccionResult.rows[0] || {};
            stats.mes = mesActual;
            stats.ano = anoActual;
            stats.cargo = empleado.cargo;
            stats.nombre = empleado.nombre;
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