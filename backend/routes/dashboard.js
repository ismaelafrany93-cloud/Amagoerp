const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /dashboard - Obtener datos completos del dashboard
// ============================================
router.get('/', async (req, res) => {
    try {
        const { mes, ano, sucursal_id, usuario_id } = req.query;
        
        const mesActual = mes || new Date().getMonth() + 1;
        const anoActual = ano || new Date().getFullYear();
        const sucursalFiltro = sucursal_id || null;
        
        console.log('📊 Dashboard - Mes:', mesActual, 'Año:', anoActual, 'Sucursal:', sucursalFiltro);

        // ============================================
        // 1. RESUMEN FINANCIERO - VENTAS DEL MES
        // ============================================
        let queryVentas = `
            SELECT 
                COALESCE(SUM(total), 0) as total_ventas,
                COUNT(*) as cantidad_ventas,
                COALESCE(SUM(CASE WHEN tipo_pago = 'Crédito' THEN total ELSE 0 END), 0) as ventas_credito,
                COALESCE(SUM(CASE WHEN tipo_pago != 'Crédito' THEN total ELSE 0 END), 0) as ventas_contado
            FROM ventas 
            WHERE EXTRACT(MONTH FROM fecha) = $1 
            AND EXTRACT(YEAR FROM fecha) = $2
            AND estado != 'cancelada'
        `;
        let paramsVentas = [mesActual, anoActual];
        let paramIndexVentas = 3;

        if (sucursalFiltro) {
            queryVentas += ` AND sucursal_id = $${paramIndexVentas}`;
            paramsVentas.push(sucursalFiltro);
            paramIndexVentas++;
        }

        const ventasMes = await pool.query(queryVentas, paramsVentas);

        // ============================================
        // 2. CUENTAS POR COBRAR (usando creditos)
        // ============================================
        let queryCobrar = `
            SELECT 
                COALESCE(SUM(saldo), 0) as total_pendiente,
                COUNT(*) as cantidad,
                COALESCE(SUM(CASE WHEN estado = 'vencido' THEN saldo ELSE 0 END), 0) as vencido
            FROM creditos 
            WHERE estado IN ('pendiente', 'vencido')
        `;
        let paramsCobrar = [];
        let paramIndexCobrar = 1;

        if (sucursalFiltro) {
            queryCobrar += ` AND sucursal_id = $${paramIndexCobrar}`;
            paramsCobrar.push(sucursalFiltro);
            paramIndexCobrar++;
        }

        const cuentasCobrar = await pool.query(queryCobrar, paramsCobrar);

        // ============================================
        // 3. CUENTAS POR PAGAR
        // ============================================
        let queryPagar = `
            SELECT 
                COALESCE(SUM(monto), 0) as total_pendiente,
                COUNT(*) as cantidad
            FROM cuentas_por_pagar 
            WHERE estado = 'pendiente'
        `;
        let paramsPagar = [];
        let paramIndexPagar = 1;

        if (sucursalFiltro) {
            queryPagar += ` AND sucursal_id = $${paramIndexPagar}`;
            paramsPagar.push(sucursalFiltro);
            paramIndexPagar++;
        }

        const cuentasPagar = await pool.query(queryPagar, paramsPagar);

        // ============================================
        // 4. OBJETIVOS DEL MES
        // ============================================
        let queryObjetivos = `
            SELECT 
                COALESCE(meta_ventas, 0) as meta_total
            FROM objetivos_mensuales 
            WHERE mes = $1 AND ano = $2
        `;
        let paramsObjetivos = [mesActual, anoActual];
        let paramIndexObjetivos = 3;

        if (sucursalFiltro) {
            queryObjetivos += ` AND sucursal_id = $${paramIndexObjetivos}`;
            paramsObjetivos.push(sucursalFiltro);
            paramIndexObjetivos++;
        }

        const objetivos = await pool.query(queryObjetivos, paramsObjetivos);
        const metaTotal = objetivos.rows[0]?.meta_total || 0;
        const ventasReales = ventasMes.rows[0]?.total_ventas || 0;

        // ============================================
        // 5. DESGLOSE POR VENDEDORES
        // ============================================
        let queryVendedores = `
            SELECT 
                u.id,
                u.nombre,
                u.rol,
                u.sucursal_id,
                s.nombre as sucursal_nombre,
                COALESCE(SUM(v.total), 0) as total_ventas,
                COUNT(v.id) as cantidad_ventas,
                COALESCE(SUM(CASE WHEN v.tipo_pago = 'Crédito' THEN v.total ELSE 0 END), 0) as ventas_credito,
                COALESCE(SUM(CASE WHEN v.tipo_pago != 'Crédito' THEN v.total ELSE 0 END), 0) as ventas_contado
            FROM usuarios u
            LEFT JOIN ventas v ON u.id = v.usuario_id 
                AND EXTRACT(MONTH FROM v.fecha) = $1 
                AND EXTRACT(YEAR FROM v.fecha) = $2
                AND v.estado != 'cancelada'
            LEFT JOIN sucursales s ON u.sucursal_id = s.id
            WHERE u.rol IN ('vendedor', 'vendedora')
        `;

        let paramsVendedores = [mesActual, anoActual];
        let paramIndexVendedores = 3;

        if (sucursalFiltro) {
            queryVendedores += ` AND u.sucursal_id = $${paramIndexVendedores}`;
            paramsVendedores.push(sucursalFiltro);
            paramIndexVendedores++;
        }

        if (usuario_id) {
            queryVendedores += ` AND u.id = $${paramIndexVendedores}`;
            paramsVendedores.push(usuario_id);
            paramIndexVendedores++;
        }

        queryVendedores += ` GROUP BY u.id, u.nombre, u.rol, u.sucursal_id, s.nombre ORDER BY total_ventas DESC`;

        const vendedores = await pool.query(queryVendedores, paramsVendedores);

        // ============================================
        // 6. DESGLOSE POR OPERARIOS
        // ============================================
        let queryOperarios = `
            SELECT 
                u.id,
                u.nombre,
                u.rol,
                u.sucursal_id,
                s.nombre as sucursal_nombre,
                a.nombre as area_nombre,
                COALESCE(SUM(p.cantidad), 0) as total_producido,
                COUNT(p.id) as cantidad_producciones,
                COUNT(DISTINCT p.producto_id) as productos_diferentes
            FROM usuarios u
            LEFT JOIN produccion p ON u.nombre = p.operario 
                AND EXTRACT(MONTH FROM p.fecha) = $1 
                AND EXTRACT(YEAR FROM p.fecha) = $2
            LEFT JOIN sucursales s ON u.sucursal_id = s.id
            LEFT JOIN areas a ON u.area_id = a.id
            WHERE u.rol = 'operario'
        `;

        let paramsOperarios = [mesActual, anoActual];
        let paramIndexOperarios = 3;

        if (sucursalFiltro) {
            queryOperarios += ` AND u.sucursal_id = $${paramIndexOperarios}`;
            paramsOperarios.push(sucursalFiltro);
            paramIndexOperarios++;
        }

        if (usuario_id) {
            queryOperarios += ` AND u.id = $${paramIndexOperarios}`;
            paramsOperarios.push(usuario_id);
            paramIndexOperarios++;
        }

        queryOperarios += ` GROUP BY u.id, u.nombre, u.rol, u.sucursal_id, s.nombre, a.nombre ORDER BY total_producido DESC`;

        const operarios = await pool.query(queryOperarios, paramsOperarios);

        // ============================================
        // 7. TOP PRODUCTOS DEL MES
        // ============================================
        let queryTopProductos = `
            SELECT 
                p.id,
                p.nombre,
                COALESCE(SUM(dv.cantidad), 0) as total_vendido,
                COUNT(DISTINCT dv.venta_id) as veces_vendido
            FROM productos p
            LEFT JOIN detalle_ventas dv ON p.id = dv.producto_id
            LEFT JOIN ventas v ON dv.venta_id = v.id
            WHERE EXTRACT(MONTH FROM v.fecha) = $1 
            AND EXTRACT(YEAR FROM v.fecha) = $2
            AND v.estado != 'cancelada'
        `;
        let paramsTop = [mesActual, anoActual];
        let paramIndexTop = 3;

        if (sucursalFiltro) {
            queryTopProductos += ` AND v.sucursal_id = $${paramIndexTop}`;
            paramsTop.push(sucursalFiltro);
            paramIndexTop++;
        }

        queryTopProductos += ` GROUP BY p.id, p.nombre ORDER BY total_vendido DESC LIMIT 10`;

        const topProductos = await pool.query(queryTopProductos, paramsTop);

        // ============================================
        // 8. VENTAS POR DÍA (GRÁFICO)
        // ============================================
        let queryVentasDia = `
            SELECT 
                EXTRACT(DAY FROM fecha) as dia,
                COALESCE(SUM(total), 0) as total,
                COUNT(*) as cantidad
            FROM ventas
            WHERE EXTRACT(MONTH FROM fecha) = $1 
            AND EXTRACT(YEAR FROM fecha) = $2
            AND estado != 'cancelada'
        `;
        let paramsDia = [mesActual, anoActual];
        let paramIndexDia = 3;

        if (sucursalFiltro) {
            queryVentasDia += ` AND sucursal_id = $${paramIndexDia}`;
            paramsDia.push(sucursalFiltro);
            paramIndexDia++;
        }

        queryVentasDia += ` GROUP BY EXTRACT(DAY FROM fecha) ORDER BY dia`;

        const ventasPorDia = await pool.query(queryVentasDia, paramsDia);

        // ============================================
        // RESPUESTA COMPLETA
        // ============================================
        res.json({
            success: true,
            resumen: {
                ventas: {
                    total: parseFloat(ventasMes.rows[0]?.total_ventas || 0),
                    cantidad: parseInt(ventasMes.rows[0]?.cantidad_ventas || 0),
                    credito: parseFloat(ventasMes.rows[0]?.ventas_credito || 0),
                    contado: parseFloat(ventasMes.rows[0]?.ventas_contado || 0)
                },
                cuentas_cobrar: {
                    total: parseFloat(cuentasCobrar.rows[0]?.total_pendiente || 0),
                    cantidad: parseInt(cuentasCobrar.rows[0]?.cantidad || 0),
                    vencido: parseFloat(cuentasCobrar.rows[0]?.vencido || 0)
                },
                cuentas_pagar: {
                    total: parseFloat(cuentasPagar.rows[0]?.total_pendiente || 0),
                    cantidad: parseInt(cuentasPagar.rows[0]?.cantidad || 0)
                },
                objetivos: {
                    meta: parseFloat(metaTotal),
                    real: parseFloat(ventasReales),
                    porcentaje: metaTotal > 0 ? Math.round((ventasReales / metaTotal) * 100) : 0
                }
            },
            vendedores: vendedores.rows || [],
            operarios: operarios.rows || [],
            top_productos: topProductos.rows || [],
            ventas_por_dia: ventasPorDia.rows || [],
            filtros: {
                mes: mesActual,
                ano: anoActual,
                sucursal_id: sucursalFiltro || null,
                usuario_id: usuario_id || null
            }
        });

    } catch (error) {
        console.error('❌ Error en GET /dashboard:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// GET /dashboard/usuarios - Obtener usuarios para filtros
// ============================================
router.get('/usuarios', async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        
        let query = `
            SELECT 
                u.id,
                u.nombre,
                u.rol,
                u.sucursal_id,
                s.nombre as sucursal_nombre
            FROM usuarios u
            LEFT JOIN sucursales s ON u.sucursal_id = s.id
            WHERE u.rol IN ('vendedor', 'vendedora', 'operario')
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
        res.json(result.rows || []);
        
    } catch (error) {
        console.error('❌ Error en GET /dashboard/usuarios:', error.message);
        res.status(200).json([]);
    }
});

// ============================================
// POST /dashboard/objetivos - Guardar objetivos mensuales
// ============================================
router.post('/objetivos', async (req, res) => {
    try {
        const { mes, ano, meta_ventas, sucursal_id } = req.body;
        
        if (!mes || !ano || !meta_ventas) {
            return res.status(400).json({
                success: false,
                error: 'Mes, año y meta son requeridos'
            });
        }
        
        const sucursalFinal = sucursal_id || 3;
        
        const result = await pool.query(
            `INSERT INTO objetivos_mensuales (mes, ano, meta_ventas, sucursal_id)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (mes, ano, sucursal_id) 
             DO UPDATE SET meta_ventas = EXCLUDED.meta_ventas, updated_at = NOW()
             RETURNING *`,
            [mes, ano, meta_ventas, sucursalFinal]
        );
        
        res.json({
            success: true,
            message: '✅ Objetivo guardado correctamente',
            objetivo: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error en POST /dashboard/objetivos:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;