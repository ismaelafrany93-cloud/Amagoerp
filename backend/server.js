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
// 👇 DIAGNÓSTICO - VER ESTRUCTURA DE CARPETAS
// ============================================
app.get('/debug-carpetas', (req, res) => {
    const resultado = {
        cwd: process.cwd(),
        __dirname: __dirname,
        carpetas: {}
    };
    
    const carpetas = [
        __dirname,
        path.join(__dirname, '..'),
        path.join(__dirname, '..', 'frontend'),
        path.join(__dirname, 'frontend'),
        path.join(process.cwd(), 'frontend'),
        path.join(process.cwd(), 'frontend', 'dist'),
        path.join(__dirname, '..', 'frontend', 'dist'),
        path.join(__dirname, 'dist'),
        path.join(process.cwd(), 'dist')
    ];
    
    for (const carpeta of carpetas) {
        try {
            const existe = fs.existsSync(carpeta);
            resultado.carpetas[carpeta] = { existe };
            if (existe) {
                const contenido = fs.readdirSync(carpeta);
                resultado.carpetas[carpeta].contenido = contenido.slice(0, 20);
                resultado.carpetas[carpeta].esDist = contenido.includes('index.html');
            }
        } catch (e) {
            resultado.carpetas[carpeta] = { existe: false, error: e.message };
        }
    }
    
    res.json(resultado);
});

// ============================================
// 👇 SERVIR EL FRONTEND - CON DIAGNÓSTICO
// ============================================
let distPath = null;

// Buscar el dist en las ubicaciones más probables
const posiblesUbicaciones = [
    path.join(__dirname, '..', 'frontend', 'dist'),      // /backend/../frontend/dist
    path.join(process.cwd(), 'frontend', 'dist'),        // /frontend/dist
    path.join(__dirname, 'frontend', 'dist'),            // /backend/frontend/dist
    path.join(process.cwd(), 'dist'),                    // /dist
    path.join(__dirname, '..', 'dist')                   // /dist
];

console.log('🔍 Buscando carpeta dist...');

for (const ubicacion of posiblesUbicaciones) {
    console.log(`📁 Verificando: ${ubicacion}`);
    if (fs.existsSync(ubicacion)) {
        const indexFile = path.join(ubicacion, 'index.html');
        if (fs.existsSync(indexFile)) {
            distPath = ubicacion;
            console.log(`✅ ¡DIST ENCONTRADO! en: ${ubicacion}`);
            console.log(`📄 Contenido de dist:`, fs.readdirSync(ubicacion));
            break;
        }
    }
}

if (distPath) {
    // Servir archivos estáticos
    app.use(express.static(distPath));
    console.log(`📁 Sirviendo frontend desde: ${distPath}`);
} else {
    console.log('❌ No se encontró la carpeta dist');
    console.log('📌 Ubicaciones buscadas:', posiblesUbicaciones);
}

// ============================================
// MANEJAR TODAS LAS RUTAS DE REACT
// ============================================
app.get('*', (req, res) => {
    // Si es una ruta de API, ignorar
    const apiPaths = ['/auth', '/productos', '/ventas', '/inventario', '/clientes', 
                      '/produccion', '/entregas', '/reportes', '/materiales', '/usuarios',
                      '/creditos', '/operarios', '/recetas', '/sucursales', '/historial',
                      '/dashboard', '/transferencias', '/cambios', '/nomina', '/empleados',
                      '/cuentas-pagar', '/gastos', '/costos-productos', '/pedidos', '/uploads',
                      '/debug-carpetas', '/api'];
    
    for (const apiPath of apiPaths) {
        if (req.path.startsWith(apiPath)) {
            return res.status(404).json({ error: 'Ruta no encontrada' });
        }
    }
    
    // Si es un archivo estático (css, js, etc.)
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|json|woff|woff2|ttf)$/)) {
        return res.status(404).send('Archivo no encontrado');
    }
    
    // Si hay dist, enviar index.html
    if (distPath) {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            console.log(`📄 Sirviendo index.html para: ${req.path}`);
            return res.sendFile(indexPath);
        }
    }
    
    // Fallback
    res.status(404).json({
        error: 'Frontend no disponible',
        message: 'No se encontró el frontend',
        distPath: distPath,
        path: req.path
    });
});

// ============================================
// RUTA DE PRUEBA
// ============================================
app.get('/api', (req, res) => {
    res.json({
        message: '🚀 AMAGO ERP Backend funcionando',
        modulos: [
            'auth', 'productos', 'ventas', 'inventario', 'clientes',
            'produccion', 'entregas', 'reportes', 'materiales', 'usuarios',
            'creditos', 'operarios', 'recetas', 'sucursales', 'historial',
            'dashboard', 'transferencias', 'cambios', 'nomina', 'empleados',
            'cuentas-pagar', 'gastos', 'costos-productos', 'pedidos'
        ]
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
    console.log(`📁 Dist path: ${distPath || 'No encontrado'}`);
});