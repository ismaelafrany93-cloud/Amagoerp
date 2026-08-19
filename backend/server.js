const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// CORS
// ============================================
app.use(cors());
app.use(express.json());

// ============================================
// SERVIDOR DE ARCHIVOS ESTÁTICOS (IMÁGENES)
// ============================================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// CREAR CARPETAS SI NO EXISTEN
// ============================================
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}
if (!fs.existsSync('./uploads/pedidos')) {
    fs.mkdirSync('./uploads/pedidos', { recursive: true });
}

// ============================================
// RUTAS DE LA API
// ============================================
app.use('/auth', require('./routes/auth'));
app.use('/productos', require('./routes/productos'));
app.use('/ventas', require('./routes/ventas'));
app.use('/inventario', require('./routes/inventario'));
app.use('/clientes', require('./routes/clientes'));
app.use('/produccion', require('./routes/produccion'));
app.use('/entregas', require('./routes/entregas'));
app.use('/reportes', require('./routes/reportes'));
app.use('/materiales', require('./routes/materiales'));
app.use('/usuarios', require('./routes/usuarios'));
app.use('/creditos', require('./routes/creditos'));
app.use('/operarios', require('./routes/operarios'));
app.use('/recetas', require('./routes/recetas'));
app.use('/sucursales', require('./routes/sucursales'));
app.use('/historial', require('./routes/historial'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/transferencias', require('./routes/transferencias'));
app.use('/cambios', require('./routes/cambios'));
app.use('/nomina', require('./routes/nomina'));
app.use('/empleados', require('./routes/empleados'));
app.use('/cuentas-pagar', require('./routes/cuentasPagar'));
app.use('/gastos', require('./routes/gastos'));
app.use('/costos-productos', require('./routes/costosProductos'));
app.use('/pedidos', require('./routes/pedidos'));

// ============================================
// 👇 SERVIR EL FRONTEND (VERSIÓN SIMPLIFICADA)
// ============================================
// Servir archivos estáticos desde la raíz del proyecto
// En Render, el frontend se construye en la carpeta raíz
const staticPaths = [
    path.join(__dirname, '..', 'frontend', 'dist'),  // Estructura normal
    path.join(__dirname, 'frontend', 'dist'),        // En la misma carpeta
    path.join(__dirname, 'dist'),                    // En la raíz
    path.join(__dirname, '..', 'dist')               // Una carpeta arriba
];

let frontendPath = null;
for (const p of staticPaths) {
    console.log(`🔍 Buscando frontend en: ${p}`);
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
        const indexPath = path.join(p, 'index.html');
        if (fs.existsSync(indexPath)) {
            frontendPath = p;
            console.log(`✅ Frontend encontrado en: ${p}`);
            break;
        }
    }
}

if (frontendPath) {
    app.use(express.static(frontendPath));
    console.log(`📁 Sirviendo frontend desde: ${frontendPath}`);
} else {
    console.log('⚠️ No se encontró el frontend. Las rutas no-API devolverán mensaje JSON.');
}

// ============================================
// MANEJAR TODAS LAS RUTAS DE REACT
// ============================================
app.get('*', (req, res) => {
    // Si la ruta empieza con /api, es una ruta de API
    if (req.path.startsWith('/api')) {
        return res.json({
            message: 'API de AMAGO ERP',
            endpoints: [
                '/auth', '/productos', '/ventas', '/inventario', '/clientes',
                '/produccion', '/entregas', '/reportes', '/materiales', '/usuarios',
                '/creditos', '/operarios', '/recetas', '/sucursales', '/historial',
                '/dashboard', '/transferencias', '/cambios', '/nomina', '/empleados',
                '/cuentas-pagar', '/gastos', '/costos-productos', '/pedidos'
            ]
        });
    }
    
    // Si la ruta es de la API, devolver 404
    const apiPaths = ['/auth', '/productos', '/ventas', '/inventario', '/clientes', 
                      '/produccion', '/entregas', '/reportes', '/materiales', '/usuarios',
                      '/creditos', '/operarios', '/recetas', '/sucursales', '/historial',
                      '/dashboard', '/transferencias', '/cambios', '/nomina', '/empleados',
                      '/cuentas-pagar', '/gastos', '/costos-productos', '/pedidos', '/uploads'];
    
    for (const apiPath of apiPaths) {
        if (req.path.startsWith(apiPath)) {
            return res.status(404).json({ error: 'Ruta no encontrada' });
        }
    }
    
    // Si hay frontend, enviar index.html
    if (frontendPath) {
        const indexPath = path.join(frontendPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            return res.sendFile(indexPath);
        }
    }
    
    // Si no hay frontend, devolver mensaje JSON
    res.json({
        message: '🚀 AMAGO ERP Backend funcionando correctamente',
        status: 'OK',
        frontend: 'No disponible - Construye el frontend con npm run build'
    });
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: "Server error" });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📋 Módulos cargados: auth, productos, ventas, inventario, clientes, produccion, entregas, reportes, materiales, usuarios, creditos, operarios, recetas, sucursales, historial, dashboard, transferencias, cambios, nomina, empleados, cuentas-pagar, gastos, costos-productos, pedidos`);
});