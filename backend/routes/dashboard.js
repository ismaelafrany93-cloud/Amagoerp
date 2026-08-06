const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /dashboard - Dashboard de última generación
// ============================================
router.get('/', async (req, res) => {
    try {
        const { mes, ano, sucursal_id } = req.query;
        
        const mesActual = mes || new Date().getMonth() + 1;
        const anoActual = ano || new Date().getFullYear();
        const sucursalFiltro = sucursal_id || null;
        
        const hoy = new Date().toISOString().split('T')[0];
        
        console.log('📊 Dashboard - Mes:', mesActual, 'Año:', anoActual, 'Sucursal:', sucursalFiltro);

        // ============================================
        // 1. VENTAS DEL DÍA
        // ============================================
        let queryVentasDia = `
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
            queryVentasDia += ` AND sucursal_id = $${paramIndexDia}`;
            paramsDia.push(sucursalFiltro);
            paramIndexDia++;
        }

        const ventasDia = await pool.query(queryVentasDia, paramsDia);

        // ============================================
        // 2. VENTAS DEL MES
        // ============================================
        let queryVentasMes = `
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
            queryVentasMes += ` AND sucursal_id = $${paramIndexMes}`;
            paramsMes.push(sucursalFiltro);
            paramIndexMes++;
        }

        const ventasMes = await pool.query(queryVentasMes, paramsMes);

        // ============================================
        // 3. VENTAS DEL AÑO
        // ============================================
        let queryVentasAno = `
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
            queryVentasAno += ` AND sucursal_id = $${paramIndexAno}`;
            paramsAno.push(sucursalFiltro);
            paramIndexAno++;
        }

        const ventasAno = await pool.query(queryVentasAno, paramsAno);

        // ============================================
        // 4. CUENTAS POR COBRAR
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
        // 5. CUENTAS POR PAGAR
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
        // 6. INVERSIÓN Y GANANCIA - CORREGIDO
        // ============================================
        // Verificar primero la estructura de la tabla produccion
        let queryInversion = `
            SELECT 
                COALESCE(SUM(cantidad * costo_unitario), 0) as total_inversion,
                COUNT(*) as cantidad_producciones
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
            // Si no existe costo_unitario, intentar con otros campos comunes
            console.warn('⚠️ Intentando con campos alternativos para inversión');
            
            // Opción 1: usar producto_precio
            let queryInversionAlt = `
                SELECT 
                    COALESCE(SUM(cantidad * producto_precio), 0) as total_inversion,
                    COUNT(*) as cantidad_producciones
                FROM produccion
                WHERE EXTRACT(MONTH FROM fecha) = $1 
                AND EXTRACT(YEAR FROM fecha) = $2
            `;
            if (sucursalFiltro) {
                queryInversionAlt += ` AND sucursal_id = $${paramIndexInversion}`;
            }
            
            try {
                inversion = await pool.query(queryInversionAlt, paramsInversion);
            } catch (error2) {
                // Si no funciona, usar 0 como inversión y advertir
                console.warn('⚠️ No se pudo calcular inversión. Usando 0.');
                inversion = { rows: [{ total_inversion: 0, cantidad_producciones: 0 }] };
            }
        }

        // ============================================
        // 7. GANANCIA
        // ============================================
        const totalVentas = parseFloat(ventasMes.rows[0]?.total || 0);
        const totalInversion = parseFloat(inversion.rows[0]?.total_inversion || 0);
        const gananciaBruta = totalVentas - totalInversion;
        const margenGanancia = totalVentas > 0 ? (gananciaBruta / totalVentas) * 100 : 0;

        // ============================================
        // 8. VENTAS POR MES (GRÁFICO)
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
        let paramsMesGrafico = [anoActual];
        let paramIndexMesGrafico = 2;

        if (sucursalFiltro) {
            queryVentasPorMes += ` AND sucursal_id = $${paramIndexMesGrafico}`;
            paramsMesGrafico.push(sucursalFiltro);
            paramIndexMesGrafico++;
        }

        queryVentasPorMes += ` GROUP BY EXTRACT(MONTH FROM fecha) ORDER BY mes`;

        const ventasPorMes = await pool.query(queryVentasPorMes, paramsMesGrafico);

        // ============================================
        // 9. TOP PRODUCTOS
        // ============================================
        let queryTopProductos = `
            SELECT 
                p.id,
                p.nombre,
                COALESCE(SUM(dv.cantidad), 0) as total_vendido,
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
        // 10. RESUMEN POR VENDEDOR
        // ============================================
        let queryVendedores = `
            SELECT 
                u.id,
                u.nombre,
                COALESCE(SUM(v.total), 0) as total_ventas,
                COUNT(v.id) as cantidad_ventas
            FROM usuarios u
            LEFT JOIN ventas v ON u.id = v.usuario_id 
                AND EXTRACT(MONTH FROM v.fecha) = $1 
                AND EXTRACT(YEAR FROM v.fecha) = $2
                AND v.estado != 'cancelada'
            WHERE u.rol IN ('vendedor', 'vendedora')
        `;
        let paramsVendedores = [mesActual, anoActual];
        let paramIndexVendedores = 3;

        if (sucursalFiltro) {
            queryVendedores += ` AND u.sucursal_id = $${paramIndexVendedores}`;
            paramsVendedores.push(sucursalFiltro);
            paramIndexVendedores++;
        }

        queryVendedores += ` GROUP BY u.id, u.nombre ORDER BY total_ventas DESC`;

        const vendedores = await pool.query(queryVendedores, paramsVendedores);

        // ============================================
        // RESPUESTA COMPLETA
        // ============================================
        res.json({
            success: true,
            fecha_actual: hoy,
            resumen: {
                ventas_dia: {
                    cantidad: parseInt(ventasDia.rows[0]?.cantidad || 0),
                    total: parseFloat(ventasDia.rows[0]?.total || 0),
                    credito: parseFloat(ventasDia.rows[0]?.credito || 0),
                    contado: parseFloat(ventasDia.rows[0]?.contado || 0)
                },
                ventas_mes: {
                    cantidad: parseInt(ventasMes.rows[0]?.cantidad || 0),
                    total: parseFloat(ventasMes.rows[0]?.total || 0),
                    credito: parseFloat(ventasMes.rows[0]?.credito || 0),
                    contado: parseFloat(ventasMes.rows[0]?.contado || 0)
                },
                ventas_ano: {
                    cantidad: parseInt(ventasAno.rows[0]?.cantidad || 0),
                    total: parseFloat(ventasAno.rows[0]?.total || 0),
                    credito: parseFloat(ventasAno.rows[0]?.credito || 0),
                    contado: parseFloat(ventasAno.rows[0]?.contado || 0)
                },
                cuentas_cobrar: {
                    total: parseFloat(cuentasCobrar.rows[0]?.total_pendiente || 0),
                    cantidad: parseInt(cuentasCobrar.rows[0]?.cantidad || 0),
                    vencido_30: parseFloat(cuentasCobrar.rows[0]?.vencido_30 || 0),
                    vencido_60: parseFloat(cuentasCobrar.rows[0]?.vencido_60 || 0),
                    vencido_90: parseFloat(cuentasCobrar.rows[0]?.vencido_90 || 0)
                },
                cuentas_pagar: {
                    total: parseFloat(cuentasPagar.rows[0]?.total_pendiente || 0),
                    cantidad: parseInt(cuentasPagar.rows[0]?.cantidad || 0),
                    vencido_30: parseFloat(cuentasPagar.rows[0]?.vencido_30 || 0),
                    vencido_60: parseFloat(cuentasPagar.rows[0]?.vencido_60 || 0),
                    vencido_90: parseFloat(cuentasPagar.rows[0]?.vencido_90 || 0)
                },
                inversion: {
                    total: parseFloat(inversion.rows[0]?.total_inversion || 0),
                    cantidad_producciones: parseInt(inversion.rows[0]?.cantidad_producciones || 0)
                },
                ganancia: {
                    bruta: gananciaBruta,
                    margen: margenGanancia,
                    ventas: totalVentas
                }
            },
            ventas_por_mes: ventasPorMes.rows || [],
            top_productos: topProductos.rows || [],
            vendedores: vendedores.rows || [],
            filtros: {
                mes: mesActual,
                ano: anoActual,
                sucursal_id: sucursalFiltro || null
            },
            estructura_db: {
                produccion: {
                    campos_usados: ['cantidad', 'costo_unitario', 'fecha', 'sucursal_id'],
                    nota: 'Si no existe costo_unitario, se intenta con producto_precio'
                }
            }
        });

    } catch (error) {
        console.error('❌ Error en GET /dashboard:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message,
            detalle: error.stack
        });
    }
});

module.exports = router;