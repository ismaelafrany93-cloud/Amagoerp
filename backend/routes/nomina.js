const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /nomina/empleados - Listar empleados
// ============================================
router.get('/empleados', async (req, res) => {
    try {
        const { sucursal_id, activo } = req.query;
        
        let query = `
            SELECT 
                e.*,
                u.email as usuario_email,
                s.nombre as sucursal_nombre,
                COALESCE(
                    (SELECT SUM(total_neto) FROM nominas WHERE empleado_id = e.id AND estado = 'pagado'),
                    0
                ) as total_pagado
            FROM empleados e
            LEFT JOIN usuarios u ON e.usuario_id = u.id
            LEFT JOIN sucursales s ON e.sucursal_id = s.id
            WHERE 1=1
        `;
        let params = [];
        
        if (sucursal_id) {
            query += ` AND e.sucursal_id = $${params.length + 1}`;
            params.push(sucursal_id);
        }
        
        if (activo !== undefined) {
            query += ` AND e.activo = $${params.length + 1}`;
            params.push(activo === 'true');
        }
        
        query += ` ORDER BY e.nombre`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
        
    } catch (error) {
        console.error('❌ Error al listar empleados:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// POST /nomina/empleados - Crear empleado
// ============================================
router.post('/empleados', async (req, res) => {
    try {
        const {
            usuario_id, nombre, cedula, email, telefono, direccion,
            cargo, sucursal_id, fecha_contratacion, tipo_salario,
            salario_base, comision_porcentaje, bono_anual
        } = req.body;
        
        const result = await pool.query(
            `INSERT INTO empleados (
                usuario_id, nombre, cedula, email, telefono, direccion,
                cargo, sucursal_id, fecha_contratacion, tipo_salario,
                salario_base, comision_porcentaje, bono_anual
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [
                usuario_id, nombre, cedula, email, telefono, direccion,
                cargo, sucursal_id, fecha_contratacion, tipo_salario,
                salario_base, comision_porcentaje || 0, bono_anual || 0
            ]
        );
        
        res.json({ success: true, empleado: result.rows[0] });
        
    } catch (error) {
        console.error('❌ Error al crear empleado:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /nomina/calcular - Calcular nómina de un empleado
// ============================================
router.get('/calcular', async (req, res) => {
    try {
        const { empleado_id, mes, ano } = req.query;
        
        if (!empleado_id || !mes || !ano) {
            return res.status(400).json({ error: 'Faltan parámetros' });
        }
        
        // Obtener datos del empleado
        const empleadoResult = await pool.query(
            `SELECT * FROM empleados WHERE id = $1`,
            [empleado_id]
        );
        
        if (empleadoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }
        
        const empleado = empleadoResult.rows[0];
        
        // Obtener configuración
        const configResult = await pool.query(
            `SELECT * FROM configuracion_nomina 
             WHERE sucursal_id = $1 AND ano = $2`,
            [empleado.sucursal_id, ano]
        );
        
        const config = configResult.rows[0] || {};
        
        // Calcular salario base
        let salarioBase = parseFloat(empleado.salario_base) || 0;
        
        // Calcular comisiones (para vendedores)
        let comisiones = 0;
        if (empleado.cargo === 'vendedor' || empleado.cargo === 'vendedora') {
            const ventasResult = await pool.query(
                `SELECT COALESCE(SUM(total), 0) as total_ventas
                 FROM ventas 
                 WHERE usuario_id = $1 
                 AND EXTRACT(MONTH FROM fecha) = $2 
                 AND EXTRACT(YEAR FROM fecha) = $3
                 AND estado != 'cancelada'`,
                [empleado.usuario_id, mes, ano]
            );
            
            const totalVentas = parseFloat(ventasResult.rows[0]?.total_ventas || 0);
            const porcentajeComision = parseFloat(empleado.comision_porcentaje || 0);
            comisiones = totalVentas * (porcentajeComision / 100);
        }
        
        // Calcular bonos y otros ingresos
        const bonoAnual = parseFloat(empleado.bono_anual || 0);
        const bonoMensual = bonoAnual / 12;
        
        // Total ingresos
        const totalIngresos = salarioBase + comisiones + bonoMensual;
        
        // Calcular deducciones (TSS)
        const tssEmpleado = parseFloat(config.tss_porcentaje_empleado || 2.87);
        const seguroSocial = totalIngresos * (tssEmpleado / 100);
        
        // INFOTEP
        const infotepPorcentaje = parseFloat(config.infotep_porcentaje || 1.0);
        const infotep = totalIngresos * (infotepPorcentaje / 100);
        
        // ISR (Simplificado)
        const isrExento = parseFloat(config.isr_exento || 416220.00) / 12; // Mensual
        let isr = 0;
        const ingresoAnual = totalIngresos * 12;
        if (ingresoAnual > isrExento) {
            const excedente = ingresoAnual - isrExento;
            isr = excedente * (parseFloat(config.isr_exceso_porcentaje || 25) / 100) / 12;
        }
        
        // Prestamos
        let prestamoMensual = 0;
        const prestamosResult = await pool.query(
            `SELECT COALESCE(SUM(cuota_mensual), 0) as total_prestamos
             FROM prestamos_empleados 
             WHERE empleado_id = $1 AND estado = 'activo'`,
            [empleado_id]
        );
        prestamoMensual = parseFloat(prestamosResult.rows[0]?.total_prestamos || 0);
        
        // Total deducciones
        const totalDeducciones = seguroSocial + infotep + isr + prestamoMensual;
        
        // Totales finales
        const totalBruto = totalIngresos;
        const totalNeto = totalBruto - totalDeducciones;
        
        res.json({
            success: true,
            empleado: {
                id: empleado.id,
                nombre: empleado.nombre,
                cargo: empleado.cargo,
                sucursal_id: empleado.sucursal_id
            },
            periodo: { mes, ano },
            ingresos: {
                salario_base: salarioBase,
                comisiones: comisiones,
                bonos: bonoMensual,
                total: totalBruto
            },
            deducciones: {
                seguro_social: seguroSocial,
                infotep: infotep,
                isr: isr,
                prestamos: prestamoMensual,
                total: totalDeducciones
            },
            totales: {
                bruto: totalBruto,
                neto: totalNeto
            },
            configuracion: {
                tss_empleado: tssEmpleado,
                infotep: infotepPorcentaje,
                isr_exento: isrExento
            }
        });
        
    } catch (error) {
        console.error('❌ Error al calcular nómina:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// POST /nomina/generar - Generar nómina
// ============================================
router.post('/generar', async (req, res) => {
    try {
        const { empleado_id, mes, ano, fecha_pago } = req.body;
        
        if (!empleado_id || !mes || !ano) {
            return res.status(400).json({ error: 'Faltan parámetros' });
        }
        
        // Verificar si ya existe
        const existente = await pool.query(
            `SELECT id FROM nominas WHERE empleado_id = $1 AND mes = $2 AND ano = $3`,
            [empleado_id, mes, ano]
        );
        
        if (existente.rows.length > 0) {
            return res.status(400).json({ error: 'Nómina ya existe para este período' });
        }
        
        // Calcular nómina
        const calculo = await new Promise((resolve, reject) => {
            const reqCalculo = { query: { empleado_id, mes, ano } };
            const resCalculo = {
                json: (data) => resolve(data),
                status: () => ({ json: (data) => resolve(data) })
            };
            router.handle(reqCalculo, resCalculo);
        });
        
        if (!calculo.success) {
            return res.status(400).json({ error: 'Error al calcular nómina' });
        }
        
        const data = calculo;
        
        // Guardar en base de datos
        const result = await pool.query(
            `INSERT INTO nominas (
                empleado_id, mes, ano, fecha_inicio, fecha_fin, fecha_pago,
                salario_base, comisiones, bonos, horas_extras, otros_ingresos,
                total_ingresos, isr, seguro_social, infotep, prestamos,
                adelantos, otras_deducciones, total_deducciones,
                total_bruto, total_neto, estado
            ) VALUES (
                $1, $2, $3, 
                DATE($4 || '-' || $5 || '-01'),
                DATE($4 || '-' || $5 || '-01') + INTERVAL '1 month' - INTERVAL '1 day',
                $6,
                $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16,
                $17, $18, $19,
                $20, $21,
                'pendiente'
            ) RETURNING *`,
            [
                empleado_id, mes, ano,
                ano, mes, fecha_pago || null,
                data.ingresos.salario_base,
                data.ingresos.comisiones,
                data.ingresos.bonos,
                0, // horas extras
                0, // otros ingresos
                data.ingresos.total,
                data.deducciones.isr,
                data.deducciones.seguro_social,
                data.deducciones.infotep,
                data.deducciones.prestamos,
                0, // adelantos
                0, // otras deducciones
                data.deducciones.total,
                data.totales.bruto,
                data.totales.neto
            ]
        );
        
        res.json({
            success: true,
            nomina: result.rows[0],
            detalle: data
        });
        
    } catch (error) {
        console.error('❌ Error al generar nómina:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /nomina/listar - Listar nóminas
// ============================================
router.get('/listar', async (req, res) => {
    try {
        const { mes, ano, sucursal_id, empleado_id, estado } = req.query;
        
        let query = `
            SELECT 
                n.*,
                e.nombre as empleado_nombre,
                e.cargo,
                e.cedula,
                s.nombre as sucursal_nombre
            FROM nominas n
            JOIN empleados e ON n.empleado_id = e.id
            LEFT JOIN sucursales s ON e.sucursal_id = s.id
            WHERE 1=1
        `;
        let params = [];
        
        if (mes) {
            query += ` AND n.mes = $${params.length + 1}`;
            params.push(mes);
        }
        
        if (ano) {
            query += ` AND n.ano = $${params.length + 1}`;
            params.push(ano);
        }
        
        if (sucursal_id) {
            query += ` AND e.sucursal_id = $${params.length + 1}`;
            params.push(sucursal_id);
        }
        
        if (empleado_id) {
            query += ` AND n.empleado_id = $${params.length + 1}`;
            params.push(empleado_id);
        }
        
        if (estado) {
            query += ` AND n.estado = $${params.length + 1}`;
            params.push(estado);
        }
        
        query += ` ORDER BY n.ano DESC, n.mes DESC, e.nombre`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
        
    } catch (error) {
        console.error('❌ Error al listar nóminas:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PUT /nomina/pagar - Marcar nómina como pagada
// ============================================
router.put('/pagar/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { metodo_pago, referencia_pago, fecha_pago } = req.body;
        
        const result = await pool.query(
            `UPDATE nominas 
             SET estado = 'pagado',
                 metodo_pago = $1,
                 referencia_pago = $2,
                 fecha_pago = COALESCE($3, NOW()),
                 updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [metodo_pago, referencia_pago, fecha_pago, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Nómina no encontrada' });
        }
        
        res.json({
            success: true,
            nomina: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error al pagar nómina:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /nomina/resumen - Resumen de nómina
// ============================================
router.get('/resumen', async (req, res) => {
    try {
        const { mes, ano, sucursal_id } = req.query;
        
        if (!mes || !ano) {
            return res.status(400).json({ error: 'Mes y año son requeridos' });
        }
        
        let query = `
            SELECT 
                COUNT(*) as total_empleados,
                COALESCE(SUM(total_bruto), 0) as total_bruto,
                COALESCE(SUM(total_neto), 0) as total_neto,
                COALESCE(SUM(total_deducciones), 0) as total_deducciones,
                COALESCE(SUM(isr), 0) as total_isr,
                COALESCE(SUM(seguro_social), 0) as total_seguro_social,
                COALESCE(SUM(infotep), 0) as total_infotep,
                COALESCE(SUM(prestamos), 0) as total_prestamos,
                COUNT(CASE WHEN estado = 'pagado' THEN 1 END) as pagados,
                COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes
            FROM nominas n
            JOIN empleados e ON n.empleado_id = e.id
            WHERE n.mes = $1 AND n.ano = $2
        `;
        let params = [mes, ano];
        
        if (sucursal_id) {
            query += ` AND e.sucursal_id = $${params.length + 1}`;
            params.push(sucursal_id);
        }
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            resumen: result.rows[0] || {
                total_empleados: 0,
                total_bruto: 0,
                total_neto: 0,
                total_deducciones: 0,
                total_isr: 0,
                total_seguro_social: 0,
                total_infotep: 0,
                total_prestamos: 0,
                pagados: 0,
                pendientes: 0
            }
        });
        
    } catch (error) {
        console.error('❌ Error al obtener resumen:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET /nomina/config - Obtener configuración
// ============================================
router.get('/config', async (req, res) => {
    try {
        const { sucursal_id, ano } = req.query;
        
        let query = `
            SELECT * FROM configuracion_nomina
            WHERE sucursal_id = $1 AND ano = $2
        `;
        let params = [sucursal_id || 3, ano || new Date().getFullYear()];
        
        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) {
            // Crear configuración por defecto
            const insert = await pool.query(
                `INSERT INTO configuracion_nomina (sucursal_id, ano)
                 VALUES ($1, $2)
                 RETURNING *`,
                params
            );
            res.json(insert.rows[0]);
        } else {
            res.json(result.rows[0]);
        }
        
    } catch (error) {
        console.error('❌ Error al obtener configuración:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PUT /nomina/config - Actualizar configuración
// ============================================
router.put('/config', async (req, res) => {
    try {
        const {
            sucursal_id, ano,
            tss_porcentaje_empleado,
            tss_porcentaje_empleador,
            isr_exento,
            isr_exceso_porcentaje,
            infotep_porcentaje,
            salario_minimo
        } = req.body;
        
        const result = await pool.query(
            `UPDATE configuracion_nomina 
             SET tss_porcentaje_empleado = $1,
                 tss_porcentaje_empleador = $2,
                 isr_exento = $3,
                 isr_exceso_porcentaje = $4,
                 infotep_porcentaje = $5,
                 salario_minimo = $6,
                 updated_at = NOW()
             WHERE sucursal_id = $7 AND ano = $8
             RETURNING *`,
            [
                tss_porcentaje_empleado,
                tss_porcentaje_empleador,
                isr_exento,
                isr_exceso_porcentaje,
                infotep_porcentaje,
                salario_minimo,
                sucursal_id,
                ano
            ]
        );
        
        res.json({
            success: true,
            configuracion: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error al actualizar configuración:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;