const express = require('express')
const router = express.Router()
const pool = require('../db')

const SUCURSALES_VALIDAS = [1, 2, 3]

function numero(valor, defecto = 0) {
    const n = Number(valor)
    return Number.isFinite(n) ? n : defecto
}

function entero(valor, defecto = 0) {
    const n = Number.parseInt(valor, 10)
    return Number.isFinite(n) ? n : defecto
}

function normalizarTipo(tipo) {
    const tipos = ['cambio', 'devolucion', 'ajuste']

    return tipos.includes(tipo)
        ? tipo
        : null
}

function validarSucursal(sucursalId) {
    return SUCURSALES_VALIDAS.includes(
        Number(sucursalId)
    )
}

function limpiarProductos(productos) {
    if (!Array.isArray(productos)) {
        return []
    }

    return productos
        .map(producto => ({
            producto_id: entero(
                producto.producto_id
            ),
            producto_nombre:
                producto.producto_nombre ||
                producto.nombre ||
                'Producto',
            cantidad: entero(
                producto.cantidad,
                0
            ),
            precio: numero(
                producto.precio,
                0
            )
        }))
        .filter(
            producto =>
                producto.producto_id > 0 &&
                producto.cantidad > 0
        )
}

function agruparProductos(productos) {
    const mapa = new Map()

    for (const producto of productos) {
        const id = Number(
            producto.producto_id
        )

        if (!mapa.has(id)) {
            mapa.set(id, {
                ...producto
            })
        } else {
            const existente =
                mapa.get(id)

            existente.cantidad +=
                Number(
                    producto.cantidad
                )
        }
    }

    return Array.from(
        mapa.values()
    )
}

// =====================================================
// GET /cambios
// =====================================================

router.get('/', async (req, res) => {
    try {
        const {
            factura,
            estado,
            fecha_inicio,
            fecha_fin,
            sucursal_id
        } = req.query

        let query = `
            SELECT
                c.*,

                u.nombre AS usuario_nombre,

                v.cliente_nombre AS venta_cliente,
                v.total AS venta_total,
                v.sucursal_id AS venta_sucursal_id,

                CASE
                    WHEN v.sucursal_id = 1 THEN 'Sucursal 1'
                    WHEN v.sucursal_id = 2 THEN 'Sucursal 2'
                    WHEN v.sucursal_id = 3 THEN 'Sucursal 3'
                    ELSE 'Sin definir'
                END AS sucursal_nombre

            FROM cambios c

            LEFT JOIN usuarios u
                ON c.usuario_id = u.id

            LEFT JOIN ventas v
                ON c.venta_id = v.id

            WHERE 1 = 1
        `

        const params = []
        let index = 1

        if (factura) {
            query += `
                AND c.factura_original ILIKE $${index}
            `

            params.push(
                `%${factura}%`
            )

            index++
        }

        if (estado) {
            query += `
                AND c.estado = $${index}
            `

            params.push(estado)
            index++
        }

        if (fecha_inicio) {
            query += `
                AND DATE(c.fecha) >= $${index}
            `

            params.push(fecha_inicio)
            index++
        }

        if (fecha_fin) {
            query += `
                AND DATE(c.fecha) <= $${index}
            `

            params.push(fecha_fin)
            index++
        }

        if (
            sucursal_id &&
            validarSucursal(
                sucursal_id
            )
        ) {
            query += `
                AND v.sucursal_id = $${index}
            `

            params.push(
                Number(sucursal_id)
            )

            index++
        }

        query += `
            ORDER BY c.fecha DESC
            LIMIT 200
        `

        const result =
            await pool.query(
                query,
                params
            )

        res.json(
            result.rows || []
        )
    } catch (error) {
        console.error(
            'Error GET /cambios:',
            error
        )

        res.status(500).json({
            success: false,
            error:
                'No se pudo cargar el historial'
        })
    }
})

// =====================================================
// GET /cambios/venta/:codigo
// =====================================================

router.get(
    '/venta/:codigo',
    async (req, res) => {
        try {
            const codigo =
                String(
                    req.params.codigo ||
                    ''
                ).trim()

            if (!codigo) {
                return res.status(
                    400
                ).json({
                    success: false,
                    error:
                        'Código de factura requerido'
                })
            }

            const ventaResult =
                await pool.query(
                    `
                    SELECT
                        v.*,

                        u.nombre AS vendedor_nombre,

                        CASE
                            WHEN v.sucursal_id = 1 THEN 'Sucursal 1'
                            WHEN v.sucursal_id = 2 THEN 'Sucursal 2'
                            WHEN v.sucursal_id = 3 THEN 'Sucursal 3'
                            ELSE 'Sin definir'
                        END AS sucursal_nombre

                    FROM ventas v

                    LEFT JOIN usuarios u
                        ON v.usuario_id = u.id

                    WHERE
                        v.codigo_entrega = $1
                        OR v.id::text = $1

                    LIMIT 1
                    `,
                    [codigo]
                )

            if (
                ventaResult.rows.length ===
                0
            ) {
                return res.status(
                    404
                ).json({
                    success: false,
                    error:
                        'Factura no encontrada'
                })
            }

            const venta =
                ventaResult.rows[0]

            const sucursalId =
                Number(
                    venta.sucursal_id
                )

            if (
                !validarSucursal(
                    sucursalId
                )
            ) {
                return res.status(
                    400
                ).json({
                    success: false,
                    error:
                        'La venta no tiene una sucursal válida'
                })
            }

            const detallesResult =
                await pool.query(
                    `
                    SELECT
                        d.*,

                        p.nombre AS producto_nombre,
                        p.precio AS producto_precio

                    FROM detalle_ventas d

                    LEFT JOIN productos p
                        ON d.producto_id = p.id

                    WHERE d.venta_id = $1

                    ORDER BY d.id ASC
                    `,
                    [venta.id]
                )

            res.json({
                success: true,

                venta: {
                    ...venta,

                    factura:
                        venta.codigo_entrega ||
                        venta.id,

                    sucursal_id:
                        sucursalId
                },

                detalles:
                    detallesResult.rows ||
                    []
            })
        } catch (error) {
            console.error(
                'Error GET /cambios/venta:',
                error
            )

            res.status(500).json({
                success: false,
                error:
                    'Error buscando la factura'
            })
        }
    }
)

// =====================================================
// POST /cambios
// =====================================================

router.post(
    '/',
    async (req, res) => {
        const client =
            await pool.connect()

        try {
            const {
                venta_id,
                factura_original,
                cliente_nombre,
                cliente_telefono,
                productos_devueltos,
                producto_nuevo_id,
                producto_nuevo_nombre,
                cantidad_nueva,
                precio_nuevo,
                total_devuelto,
                total_nuevo,
                envio,
                diferencia,
                tipo,
                motivo,
                usuario_id,
                envio_opcional
            } = req.body

            const ventaId =
                entero(venta_id)

            const tipoOperacion =
                normalizarTipo(tipo)

            if (!ventaId) {
                return res.status(
                    400
                ).json({
                    success: false,
                    error:
                        'La venta es requerida'
                })
            }

            if (!tipoOperacion) {
                return res.status(
                    400
                ).json({
                    success: false,
                    error:
                        'Tipo de operación inválido'
                })
            }

            if (
                !String(
                    motivo || ''
                ).trim()
            ) {
                return res.status(
                    400
                ).json({
                    success: false,
                    error:
                        'El motivo es requerido'
                })
            }

            let productos =
                limpiarProductos(
                    productos_devueltos
                )

            productos =
                agruparProductos(
                    productos
                )

            if (
                productos.length ===
                0
            ) {
                return res.status(
                    400
                ).json({
                    success: false,
                    error:
                        'Debes seleccionar productos devueltos'
                })
            }

            const nuevoProductoId =
                producto_nuevo_id
                    ? entero(
                          producto_nuevo_id
                      )
                    : null

            const cantidadNueva =
                entero(
                    cantidad_nueva,
                    0
                )

            const precioNuevo =
                numero(
                    precio_nuevo,
                    0
                )

            const envioNumero =
                numero(
                    envio,
                    0
                )

            if (
                envioNumero < 0
            ) {
                return res.status(
                    400
                ).json({
                    success: false,
                    error:
                        'El envío no puede ser negativo'
                })
            }

            if (
                tipoOperacion ===
                    'cambio' &&
                (!nuevoProductoId ||
                    cantidadNueva <=
                        0)
            ) {
                return res.status(
                    400
                ).json({
                    success: false,
                    error:
                        'Para un cambio debes seleccionar el producto nuevo y su cantidad'
                })
            }

            if (
                tipoOperacion ===
                'devolucion'
            ) {
                productos =
                    productos.map(
                        producto => ({
                            ...producto
                        })
                    )
            }

            await client.query(
                'BEGIN'
            )

            // =================================================
            // 1. OBTENER Y BLOQUEAR LA VENTA
            // =================================================

            const ventaResult =
                await client.query(
                    `
                    SELECT
                        v.*,

                        CASE
                            WHEN v.sucursal_id = 1 THEN 'Sucursal 1'
                            WHEN v.sucursal_id = 2 THEN 'Sucursal 2'
                            WHEN v.sucursal_id = 3 THEN 'Sucursal 3'
                            ELSE 'Sin definir'
                        END AS sucursal_nombre

                    FROM ventas v

                    WHERE v.id = $1

                    FOR UPDATE
                    `,
                    [ventaId]
                )

            if (
                ventaResult.rows.length ===
                0
            ) {
                throw new Error(
                    'La venta no existe'
                )
            }

            const venta =
                ventaResult.rows[0]

            const sucursalId =
                Number(
                    venta.sucursal_id
                )

            if (
                !validarSucursal(
                    sucursalId
                )
            ) {
                throw new Error(
                    'La venta no pertenece a una de las 3 sucursales válidas'
                )
            }

            // =================================================
            // 2. EVITAR DUPLICADOS
            // =================================================

            const cambioExistente =
                await client.query(
                    `
                    SELECT id
                    FROM cambios
                    WHERE
                        venta_id = $1
                        AND estado = 'completado'
                    LIMIT 1
                    `,
                    [ventaId]
                )

            if (
                cambioExistente.rows
                    .length > 0
            ) {
                throw new Error(
                    `Esta venta ya tiene una operación de cambio/devolución completada (#${cambioExistente.rows[0].id})`
                )
            }

            // =================================================
            // 3. OBTENER DETALLES ORIGINALES
            // =================================================

            const detallesResult =
                await client.query(
                    `
                    SELECT
                        d.id,
                        d.producto_id,
                        d.cantidad,
                        d.precio,
                        p.nombre AS producto_nombre

                    FROM detalle_ventas d

                    LEFT JOIN productos p
                        ON p.id = d.producto_id

                    WHERE d.venta_id = $1

                    FOR UPDATE
                    `,
                    [ventaId]
                )

            if (
                detallesResult.rows
                    .length === 0
            ) {
                throw new Error(
                    'La venta no tiene productos registrados'
                )
            }

            // =================================================
            // 4. VALIDAR CANTIDADES DEVUELTAS
            // =================================================

            const vendidosMap =
                new Map()

            for (
                const detalle of detallesResult.rows
            ) {
                const id =
                    Number(
                        detalle.producto_id
                    )

                const cantidad =
                    numero(
                        detalle.cantidad,
                        0
                    )

                const precio =
                    numero(
                        detalle.precio,
                        0
                    )

                if (
                    vendidosMap.has(id)
                ) {
                    const anterior =
                        vendidosMap.get(
                            id
                        )

                    anterior.cantidad +=
                        cantidad
                } else {
                    vendidosMap.set(
                        id,
                        {
                            producto_id:
                                id,
                            producto_nombre:
                                detalle.producto_nombre ||
                                'Producto',
                            cantidad,
                            precio
                        }
                    )
                }
            }

            for (
                const producto of productos
            ) {
                const vendido =
                    vendidosMap.get(
                        Number(
                            producto.producto_id
                        )
                    )

                if (!vendido) {
                    throw new Error(
                        `El producto ${producto.producto_id} no pertenece a la venta original`
                    )
                }

                if (
                    Number(
                        producto.cantidad
                    ) >
                    Number(
                        vendido.cantidad
                    )
                ) {
                    throw new Error(
                        `No puedes devolver ${producto.cantidad} unidades de ${vendido.producto_nombre}. Solo se vendieron ${vendido.cantidad}.`
                    )
                }
            }

            // =================================================
            // 5. RECALCULAR TOTAL DEVUELTO EN SERVIDOR
            // =================================================

            let totalDevueltoServidor =
                0

            for (
                const producto of productos
            ) {
                const vendido =
                    vendidosMap.get(
                        Number(
                            producto.producto_id
                        )
                    )

                const precio =
                    Number(
                        vendido.precio
                    )

                totalDevueltoServidor +=
                    precio *
                    Number(
                        producto.cantidad
                    )
            }

            totalDevueltoServidor =
                Number(
                    totalDevueltoServidor.toFixed(
                        2
                    )
                )

            // =================================================
            // 6. VALIDAR PRODUCTO NUEVO
            // =================================================

            let totalNuevoServidor =
                0

            let productoNuevoNombre =
                ''

            if (
                tipoOperacion ===
                'cambio'
            ) {
                const productoNuevoResult =
                    await client.query(
                        `
                        SELECT
                            id,
                            nombre,
                            precio

                        FROM productos

                        WHERE id = $1

                        FOR UPDATE
                        `,
                        [
                            nuevoProductoId
                        ]
                    )

                if (
                    productoNuevoResult
                        .rows.length ===
                    0
                ) {
                    throw new Error(
                        'El producto nuevo no existe'
                    )
                }

                const productoNuevo =
                    productoNuevoResult
                        .rows[0]

                productoNuevoNombre =
                    productoNuevo.nombre

                const precioActual =
                    numero(
                        productoNuevo.precio,
                        0
                    )

                totalNuevoServidor =
                    Number(
                        (
                            precioActual *
                            cantidadNueva
                        ).toFixed(2)
                    )
            }

            // =================================================
            // 7. CALCULAR DIFERENCIA REAL
            // =================================================

            let diferenciaServidor =
                0

            if (
                tipoOperacion ===
                'devolucion'
            ) {
                diferenciaServidor =
                    Number(
                        (
                            -totalDevueltoServidor
                        ).toFixed(2)
                    )
            } else {
                diferenciaServidor =
                    Number(
                        (
                            totalNuevoServidor +
                            envioNumero -
                            totalDevueltoServidor
                        ).toFixed(2)
                    )
            }

            // =================================================
            // 8. VERIFICAR INVENTARIO DE LA SUCURSAL
            // =================================================

            for (
                const producto of productos
            ) {
                const inventarioResult =
                    await client.query(
                        `
                        SELECT
                            id,
                            stock

                        FROM producto_inventario

                        WHERE
                            producto_id = $1
                            AND sucursal_id = $2

                        FOR UPDATE
                        `,
                        [
                            producto.producto_id,
                            sucursalId
                        ]
                    )

                if (
                    inventarioResult.rows
                        .length === 0
                ) {
                    throw new Error(
                        `El producto ${producto.producto_nombre} no tiene inventario configurado en la sucursal ${sucursalId}`
                    )
                }
            }

            // =================================================
            // 9. VERIFICAR STOCK DEL PRODUCTO NUEVO
            // =================================================

            let inventarioNuevo = null

            if (
                tipoOperacion ===
                'cambio'
            ) {
                const inventarioNuevoResult =
                    await client.query(
                        `
                        SELECT
                            id,
                            stock

                        FROM producto_inventario

                        WHERE
                            producto_id = $1
                            AND sucursal_id = $2

                        FOR UPDATE
                        `,
                        [
                            nuevoProductoId,
                            sucursalId
                        ]
                    )

                if (
                    inventarioNuevoResult
                        .rows.length ===
                    0
                ) {
                    throw new Error(
                        `El producto nuevo no tiene inventario configurado en la sucursal ${sucursalId}`
                    )
                }

                inventarioNuevo =
                    inventarioNuevoResult
                        .rows[0]

                const stockActual =
                    numero(
                        inventarioNuevo.stock,
                        0
                    )

                if (
                    stockActual <
                    cantidadNueva
                ) {
                    throw new Error(
                        `Stock insuficiente de ${productoNuevoNombre} en la sucursal ${sucursalId}. Disponible: ${stockActual}. Necesario: ${cantidadNueva}.`
                    )
                }
            }

            // =================================================
            // 10. GUARDAR EL CAMBIO
            // =================================================

            const insertResult =
                await client.query(
                    `
                    INSERT INTO cambios (
                        venta_id,
                        factura_original,
                        cliente_nombre,
                        cliente_telefono,
                        productos_devueltos,
                        producto_nuevo_id,
                        producto_nuevo_nombre,
                        cantidad_nueva,
                        precio_nuevo,
                        total_devuelto,
                        total_nuevo,
                        envio,
                        diferencia,
                        tipo,
                        motivo,
                        usuario_id,
                        estado
                    )

                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8,
                        $9,
                        $10,
                        $11,
                        $12,
                        $13,
                        $14,
                        $15,
                        $16,
                        'completado'
                    )

                    RETURNING *
                    `,
                    [
                        ventaId,

                        factura_original ||
                            venta.codigo_entrega ||
                            venta.id,

                        cliente_nombre ||
                            venta.cliente_nombre ||
                            '',

                        cliente_telefono ||
                            venta.cliente_telefono ||
                            '',

                        JSON.stringify(
                            productos
                        ),

                        tipoOperacion ===
                        'cambio'
                            ? nuevoProductoId
                            : null,

                        tipoOperacion ===
                        'cambio'
                            ? productoNuevoNombre
                            : '',

                        tipoOperacion ===
                        'cambio'
                            ? cantidadNueva
                            : 0,

                        tipoOperacion ===
                        'cambio'
                            ? precioNuevo
                            : 0,

                        totalDevueltoServidor,

                        totalNuevoServidor,

                        envioNumero,

                        diferenciaServidor,

                        tipoOperacion,

                        String(
                            motivo
                        ).trim(),

                        usuario_id
                            ? entero(
                                  usuario_id
                              )
                            : null
                    ]
                )

            const cambio =
                insertResult.rows[0]

            // =================================================
            // 11. DEVOLVER PRODUCTOS AL INVENTARIO
            //     DE LA SUCURSAL ORIGINAL
            // =================================================

            for (
                const producto of productos
            ) {
                const updateResult =
                    await client.query(
                        `
                        UPDATE producto_inventario

                        SET stock =
                            stock + $1

                        WHERE
                            producto_id = $2
                            AND sucursal_id = $3

                        RETURNING stock
                        `,
                        [
                            Number(
                                producto.cantidad
                            ),
                            Number(
                                producto.producto_id
                            ),
                            sucursalId
                        ]
                    )

                if (
                    updateResult.rows
                        .length === 0
                ) {
                    throw new Error(
                        `No se pudo actualizar el inventario de ${producto.producto_nombre}`
                    )
                }
            }

            // =================================================
            // 12. DESCONTAR PRODUCTO NUEVO
            //     DE LA MISMA SUCURSAL
            // =================================================

            if (
                tipoOperacion ===
                    'cambio' &&
                nuevoProductoId
            ) {
                const updateNuevo =
                    await client.query(
                        `
                        UPDATE producto_inventario

                        SET stock =
                            stock - $1

                        WHERE
                            producto_id = $2
                            AND sucursal_id = $3
                            AND stock >= $1

                        RETURNING stock
                        `,
                        [
                            cantidadNueva,
                            nuevoProductoId,
                            sucursalId
                        ]
                    )

                if (
                    updateNuevo.rows
                        .length === 0
                ) {
                    throw new Error(
                        `No hay suficiente stock de ${productoNuevoNombre} en la sucursal ${sucursalId}`
                    )
                }
            }

            // =================================================
            // 13. MARCAR VENTA
            // =================================================

            await client.query(
                `
                UPDATE ventas

                SET
                    tiene_cambio = TRUE,
                    cambio_id = $1

                WHERE id = $2
                `,
                [
                    cambio.id,
                    ventaId
                ]
            )

            await client.query(
                'COMMIT'
            )

            res.json({
                success: true,

                message:
                    tipoOperacion ===
                    'devolucion'
                        ? 'Devolución registrada correctamente'
                        : 'Cambio registrado correctamente',

                cambio: {
                    ...cambio,

                    sucursal_id:
                        sucursalId,

                    sucursal_nombre:
                        venta.sucursal_nombre,

                    total_devuelto:
                        totalDevueltoServidor,

                    total_nuevo:
                        totalNuevoServidor,

                    diferencia:
                        diferenciaServidor
                }
            })
        } catch (error) {
            try {
                await client.query(
                    'ROLLBACK'
                )
            } catch (
                rollbackError
            ) {
                console.error(
                    'Error ROLLBACK:',
                    rollbackError
                )
            }

            console.error(
                'Error POST /cambios:',
                error
            )

            res.status(500).json({
                success: false,
                error:
                    error.message ||
                    'No se pudo registrar la operación'
            })
        } finally {
            client.release()
        }
    }
)

// =====================================================
// GET /cambios/:id
// =====================================================

router.get(
    '/:id',
    async (req, res) => {
        try {
            const id =
                entero(
                    req.params.id
                )

            if (!id) {
                return res.status(
                    400
                ).json({
                    success: false,
                    error:
                        'ID inválido'
                })
            }

            const result =
                await pool.query(
                    `
                    SELECT
                        c.*,

                        u.nombre AS usuario_nombre,

                        v.sucursal_id AS venta_sucursal_id,

                        CASE
                            WHEN v.sucursal_id = 1 THEN 'Sucursal 1'
                            WHEN v.sucursal_id = 2 THEN 'Sucursal 2'
                            WHEN v.sucursal_id = 3 THEN 'Sucursal 3'
                            ELSE 'Sin definir'
                        END AS sucursal_nombre

                    FROM cambios c

                    LEFT JOIN usuarios u
                        ON c.usuario_id = u.id

                    LEFT JOIN ventas v
                        ON c.venta_id = v.id

                    WHERE c.id = $1
                    `,
                    [id]
                )

            if (
                result.rows.length ===
                0
            ) {
                return res.status(
                    404
                ).json({
                    success: false,
                    error:
                        'Cambio no encontrado'
                })
            }

            const cambio =
                result.rows[0]

            if (
                typeof cambio.productos_devueltos ===
                'string'
            ) {
                try {
                    cambio.productos_devueltos =
                        JSON.parse(
                            cambio.productos_devueltos
                        )
                } catch {
                    cambio.productos_devueltos =
                        []
                }
            }

            res.json({
                success: true,
                cambio
            })
        } catch (error) {
            console.error(
                'Error GET /cambios/:id:',
                error
            )

            res.status(500).json({
                success: false,
                error:
                    'No se pudo obtener el cambio'
            })
        }
    }
)

// =====================================================
// PUT /cambios/:id
// =====================================================

router.put(
    '/:id',
    async (req, res) => {
        try {
            const id =
                entero(
                    req.params.id
                )

            const estado =
                String(
                    req.body.estado ||
                    ''
                ).trim()

            const estadosValidos = [
                'pendiente',
                'completado',
                'cancelado'
            ]

            if (!id) {
                return res.status(
                    400
                ).json({
                    success: false,
                    error:
                        'ID inválido'
                })
            }

            if (
                !estadosValidos.includes(
                    estado
                )
            ) {
                return res.status(
                    400
                ).json({
                    success: false,
                    error:
                        'Estado inválido'
                })
            }

            const result =
                await pool.query(
                    `
                    UPDATE cambios

                    SET
                        estado = $1,
                        updated_at = NOW()

                    WHERE id = $2

                    RETURNING *
                    `,
                    [
                        estado,
                        id
                    ]
                )

            if (
                result.rows.length ===
                0
            ) {
                return res.status(
                    404
                ).json({
                    success: false,
                    error:
                        'Cambio no encontrado'
                })
            }

            res.json({
                success: true,
                message:
                    'Estado actualizado correctamente',
                cambio:
                    result.rows[0]
            })
        } catch (error) {
            console.error(
                'Error PUT /cambios/:id:',
                error
            )

            res.status(500).json({
                success: false,
                error:
                    'No se pudo actualizar el estado'
            })
        }
    }
)

module.exports = router