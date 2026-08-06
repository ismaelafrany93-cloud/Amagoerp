const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /dashboard - Dashboard de última generación
// ============================================
router.get('/', async (req, res) => {
    try {
        const { mes, ano, sucursal_id, usuario_id } = req.query;
        
        const mesActual = mes || new Date().getMonth() + 1;
        const anoActual = ano || new Date().getFullYear();
        const sucursalFiltro = sucursal_id || null;
        
        const hoy = new Date().toISOString().split('T')[0];
        
        console.log('📊 Dashboard - Mes:', mesActual, 'Año:', anoActual, 'Sucursal:', sucursalFiltro);

        // ============================================
        // FUNCIÓN PARA CONSTRUIR FILTROS
        // ============================================
        const buildFilter = (baseQuery, params, paramIndex, tableAlias = '') => {
            const alias = tableAlias ? `${tableAlias}.` : '';
            let query = baseQuery;
            if (sucursalFiltro) {
                query += ` AND ${alias}sucursal_id = $${paramIndex}`;
                params.push(sucursalFiltro);
                paramIndex++;
            }
            if (usuario_id) {
                query += ` AND ${alias}usuario_id = $${paramIndex}`;
                params.push(usuario_id);
                paramIndex++;
            }
            return { query, params, paramIndex };
        };

        // ============================================
        // 1. VENTAS DEL DÍA
        // ============================================
        let queryDia = `
            SELECT 
                COUNT(*) as cantidad,
                COALESCE(SUM(total), 0) as total,
                COALESCE(SUM(CASE WHEN tipo_pago = 'Crédito' THEN total ELSE 0 END), 0) as credito,
                COALESCE(SUM(CASE WHEN tipo_pago != 'Crédito' THEN total ELSE 0 END), 0) as contado
            FROM ventas 
            WHERE DATE(fecha) = $1
            AND estado != 'cancelada'
        `;
        let paramsDia = [hoy];
        let paramIndexDia = 2;
        
        if (sucursalFiltro) {
            queryDia += ` AND sucursal_id = $${paramIndexDia}`;
            paramsDia.push(sucursalFiltro);
            paramIndexDia++;
        }
        if (usuario_id) {
            queryDia += ` AND usuario_id = $${paramIndexDia}`;
            paramsDia.push(usuario_id);
            paramIndexDia++;
        }
        
        const ventasDia = await pool.query(queryDia, paramsDia);

        // ============================================
        // 2. VENTAS DEL MES
        // ============================================
        let queryMes = `
            SELECT 
                COUNT(*) as cantidad,
                COALESCE(SUM(total), 0) as total,
                COALESCE(SUM(CASE WHEN tipo_pago = 'Crédito' THEN total ELSE 0 END), 0) as credito,
                COALESCE(SUM(CASE WHEN tipo_pago != 'Crédito' THEN total ELSE 0 END), 0) as contado
            FROM ventas 
            WHERE EXTRACT(MONTH FROM fecha) = $1 
            AND EXTRACT(YEAR FROM fecha) = $2
            AND estado != 'cancelada'
        `;
        let paramsMes = [mesActual, anoActual];
        let paramIndexMes = 3;
        
        if (sucursalFiltro) {
            queryMes += ` AND sucursal_id = $${paramIndexMes}`;
            paramsMes.push(sucursalFiltro);
            paramIndexMes++;
        }
        if (usuario_id) {
            queryMes += ` AND usuario_id = $${paramIndexMes}`;
            paramsMes.push(usuario_id);
            paramIndexMes++;
        }
        
        const ventasMes = await pool.query(queryMes, paramsMes);

        // ============================================
        // 3. VENTAS DEL AÑO
        // ============================================
        let queryAno = `
            SELECT 
                COUNT(*) as cantidad,
                COALESCE(SUM(total), 0) as total,
                COALESCE(SUM(CASE WHEN tipo_pago = 'Crédito' THEN total ELSE 0 END), 0) as credito,
                COALESCE(SUM(CASE WHEN tipo_pago != 'Crédito' THEN total ELSE 0 END), 0) as contado
            FROM ventas 
            WHERE EXTRACT(YEAR FROM fecha) = $1
            AND estado != 'cancelada'
        `;
        let paramsAno = [anoActual];
        let paramIndexAno = 2;
        
        if (sucursalFiltro) {
            queryAno += ` AND sucursal_id = $${paramIndexAno}`;
            paramsAno.push(sucursalFiltro);
            paramIndexAno++;
        }
        if (usuario_id) {
            queryAno += ` AND usuario_id = $${paramIndexAno}`;
            paramsAno.push(usuario_id);
            paramIndexAno++;
        }
        
        const ventasAno = await pool.query(queryAno, paramsAno);

        // ============================================
        // 4. CUENTAS POR COBRAR (DETALLADO)
        // ============================================
        let queryCobrar = `
            SELECT 
                COALESCE(SUM(saldo), 0) as total_pendiente,
                COUNT(*) as cantidad,
                COALESCE(SUM(CASE 
                    WHEN estado = 'vencido' AND fecha_vencimiento < NOW() - INTERVAL '30 days' THEN saldo 
                    ELSE 0 
                END), 0) as vencido_30,
                COALESCE(SUM(CASE 
                    WHEN estado = 'vencido' AND fecha_vencimiento < NOW() - INTERVAL '60 days' THEN saldo 
                    ELSE 0 
                END), 0) as vencido_60,
                COALESCE(SUM(CASE 
                    WHEN estado = 'vencido' AND fecha_vencimiento < NOW() - INTERVAL '90 days' THEN saldo 
                    ELSE 0 
                END), 0) as vencido_90
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
        // 5. CUENTAS POR PAGAR (DETALLADO)
        // ============================================
        let queryPagar = `
            SELECT 
                COALESCE(SUM(monto), 0) as total_pendiente,
                COUNT(*) as cantidad,
                COALESCE(SUM(CASE 
                    WHEN estado = 'vencido' AND fecha_vencimiento < NOW() - INTERVAL '30 days' THEN monto 
                    ELSE 0 
                END), 0) as vencido_30,
                COALESCE(SUM(CASE 
                    WHEN estado = 'vencido' AND fecha_vencimiento < NOW() - INTERVAL '60 days' THEN monto 
                    ELSE 0 
                END), 0) as vencido_60,
                COALESCE(SUM(CASE 
                    WHEN estado = 'vencido' AND fecha_vencimiento < NOW() - INTERVAL '90 days' THEN monto 
                    ELSE 0 
                END), 0) as vencido_90
            FROM cuentas_por_pagar 
            WHERE estado IN ('pendiente', 'vencido')
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
        // 6. INVERSIÓN EN PRODUCCIÓN
        // ============================================
        let queryInversion = `
            SELECT 
                COALESCE(SUM(cantidad * precio_unitario), 0) as total_inversion,
                COUNT(*) as cantidad_producciones,
                COALESCE(SUM(cantidad), 0) as total_unidades
            FROM produccion
            WHERE EXTRACT(MONTH FROM fecha) = $1 
            AND EXTRACT(YEAR FROM fecha) = $2
        `;
        let paramsInversion = [mesActual, anoActual];
        let paramIndexInversion = 3;
        
        if (sucursalFiltro) {
            queryInversion += ` AND sucursal_id = $${paramIndexInversion}`;
            paramsInversion.push(sucursalFiltro);
            paramIndexInversion++;
        }
        
        let inversion;
        try {
            inversion = await pool.query(queryInversion, paramsInversion);
        } catch (error) {
            // Si no existe precio_unitario, intentar con otros campos
            console.warn('⚠️ Intentando con campos alternativos para inversión');
            try {
                queryInversion = queryInversion.replace('precio_unitario', 'costo');
                inversion = await pool.query(queryInversion, paramsInversion);
            } catch (error2) {
                // Si falla, usar 0
                inversion = { rows: [{ total_inversion: 0, cantidad_producciones: 0, total_unidades: 0 }] };
            }
        }

        // ============================================
        // 7. GANANCIA Y MÁRGENES
        // ============================================
        const totalVentasMes = parseFloat(ventasMes.rows[0]?.total || 0);
        const totalInversion = parseFloat(inversion.rows[0]?.total_inversion || 0);
        const gananciaBruta = totalVentasMes - totalInversion;
        const margenGanancia = totalVentasMes > 0 ? (gananciaBruta / totalVentasMes) * 100 : 0;
        
        // Ganancia Neta (restando gastos operativos)
        const gastosOperativos = totalVentasMes * 0.15; // Estimación del 15% en gastos
        const gananciaNeta = gananciaBruta - gastosOperativos;
        const margenNeto = totalVentasMes > 0 ? (gananciaNeta / totalVentasMes) * 100 : 0;

        // ============================================
        // 8. VENTAS POR MES (GRÁFICO ANUAL)
        // ============================================
        let queryVentasPorMes = `
            SELECT 
                EXTRACT(MONTH FROM fecha) as mes,
                COALESCE(SUM(total), 0) as total,
                COUNT(*) as cantidad
            FROM ventas
            WHERE EXTRACT(YEAR FROM fecha) = $1
            AND estado != 'cancelada'
        `;
        let paramsVentasMes = [anoActual];
        let paramIndexVentasMes = 2;
        
        if (sucursalFiltro) {
            queryVentasPorMes += ` AND sucursal_id = $${paramIndexVentasMes}`;
            paramsVentasMes.push(sucursalFiltro);
            paramIndexVentasMes++;
        }
        
        queryVentasPorMes += ` GROUP BY EXTRACT(MONTH FROM fecha) ORDER BY mes`;
        const ventasPorMes = await pool.query(queryVentasPorMes, paramsVentasMes);

        // ============================================
        // 9. VENTAS POR DÍA (GRÁFICO DEL MES)
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
        let paramsDiaGrafico = [mesActual, anoActual];
        let paramIndexDiaGrafico = 3;
        
        if (sucursalFiltro) {
            queryVentasDia += ` AND sucursal_id = $${paramIndexDiaGrafico}`;
            paramsDiaGrafico.push(sucursalFiltro);
            paramIndexDiaGrafico++;
        }
        
        queryVentasDia += ` GROUP BY EXTRACT(DAY FROM fecha) ORDER BY dia`;
        const ventasPorDia = await pool.query(queryVentasDia, paramsDiaGrafico);

        // ============================================
        // 10. TOP PRODUCTOS
        // ============================================
        let queryTopProductos = `
            SELECT 
                p.id,
                p.nombre,
                COALESCE(SUM(dv.cantidad), 0) as total_vendido,
                COUNT(DISTINCT dv.venta_id) as veces_vendido,
                COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) as total_ingresos
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
        // 11. DESGLOSE POR VENDEDORES
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
        
        queryVendedores += ` GROUP BY u.id, u.nombre, u.rol, u.sucursal_id, s.nombre ORDER BY total_ventas DESC`;
        const vendedores = await pool.query(queryVendedores, paramsVendedores);

        // ============================================
        // 12. OBJETIVOS DEL MES
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
        const ventasReales = ventasMes.rows[0]?.total || 0;

        // ============================================
        // RESPUESTA COMPLETA
        // ============================================
        res.json({
            success: true,
            fecha_actual: hoy,
            resumen: {
                // VENTAS DEL DÍA
                ventas_dia: {
                    cantidad: parseInt(ventasDia.rows[0]?.cantidad || 0),
                    total: parseFloat(ventasDia.rows[0]?.total || 0),
                    credito: parseFloat(ventasDia.rows[0]?.credito || 0),
                    contado: parseFloat(ventasDia.rows[0]?.contado || 0)
                },
                // VENTAS DEL MES
                ventas_mes: {
                    cantidad: parseInt(ventasMes.rows[0]?.cantidad || 0),
                    total: parseFloat(ventasMes.rows[0]?.total || 0),
                    credito: parseFloat(ventasMes.rows[0]?.credito || 0),
                    contado: parseFloat(ventasMes.rows[0]?.contado || 0)
                },
                // VENTAS DEL AÑO
                ventas_ano: {
                    cantidad: parseInt(ventasAno.rows[0]?.cantidad || 0),
                    total: parseFloat(ventasAno.rows[0]?.total || 0),
                    credito: parseFloat(ventasAno.rows[0]?.credito || 0),
                    contado: parseFloat(ventasAno.rows[0]?.contado || 0)
                },
                // CUENTAS POR COBRAR
                cuentas_cobrar: {
                    total: parseFloat(cuentasCobrar.rows[0]?.total_pendiente || 0),
                    cantidad: parseInt(cuentasCobrar.rows[0]?.cantidad || 0),
                    vencido_30: parseFloat(cuentasCobrar.rows[0]?.vencido_30 || 0),
                    vencido_60: parseFloat(cuentasCobrar.rows[0]?.vencido_60 || 0),
                    vencido_90: parseFloat(cuentasCobrar.rows[0]?.vencido_90 || 0)
                },
                // CUENTAS POR PAGAR
                cuentas_pagar: {
                    total: parseFloat(cuentasPagar.rows[0]?.total_pendiente || 0),
                    cantidad: parseInt(cuentasPagar.rows[0]?.cantidad || 0),
                    vencido_30: parseFloat(cuentasPagar.rows[0]?.vencido_30 || 0),
                    vencido_60: parseFloat(cuentasPagar.rows[0]?.vencido_60 || 0),
                    vencido_90: parseFloat(cuentasPagar.rows[0]?.vencido_90 || 0)
                },
                // INVERSIÓN
                inversion: {
                    total: parseFloat(inversion.rows[0]?.total_inversion || 0),
                    cantidad_producciones: parseInt(inversion.rows[0]?.cantidad_producciones || 0),
                    total_unidades: parseInt(inversion.rows[0]?.total_unidades || 0)
                },
                // GANANCIA
                ganancia: {
                    bruta: gananciaBruta,
                    neta: gananciaNeta,
                    margen_bruto: margenGanancia,
                    margen_neto: margenNeto,
                    gastos_operativos: gastosOperativos,
                    ventas: totalVentasMes,
                    inversion: totalInversion
                },
                // OBJETIVOS
                objetivos: {
                    meta: parseFloat(metaTotal),
                    real: parseFloat(ventasReales),
                    porcentaje: metaTotal > 0 ? Math.round((ventasReales / metaTotal) * 100) : 0,
                    diferencia: parseFloat(ventasReales - metaTotal)
                }
            },
            ventas_por_mes: ventasPorMes.rows || [],
            ventas_por_dia: ventasPorDia.rows || [],
            top_productos: topProductos.rows || [],
            vendedores: vendedores.rows || [],
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
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// ============================================
// GET /dashboard/usuarios - Obtener usuarios
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
// POST /dashboard/objetivos - Guardar objetivos
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