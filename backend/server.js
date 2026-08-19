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
// 👇 SERVIR EL FRONTEND - RUTA FIJA
// ============================================
// En Render, el dist está en /opt/render/project/src/frontend/dist
const distPath = path.join(__dirname, '..', 'frontend', 'dist');

console.log('📁 Buscando frontend en:', distPath);

if (fs.existsSync(distPath)) {
    console.log('✅ Frontend encontrado en:', distPath);
    
    // Servir archivos estáticos
    app.use(express.static(distPath));
    
    // También servir desde la raíz (para assets)
    app.use('/assets', express.static(path.join(distPath, 'assets')));
    
    console.log('📁 Contenido de dist:', fs.readdirSync(distPath));
} else {
    console.log('❌ Frontend NO encontrado en:', distPath);
    console.log('📁 Buscando en ubicaciones alternativas...');
    
    // Ubicaciones alternativas
    const alternativas = [
        path.join(__dirname, 'frontend', 'dist'),
        path.join(process.cwd(), 'frontend', 'dist'),
        path.join(process.cwd(), 'dist')
    ];
    
    for (const alt of alternativas) {
        if (fs.existsSync(alt)) {
            console.log('✅ Frontend encontrado en:', alt);
            app.use(express.static(alt));
            break;
        }
    }
}

// ============================================
// MANEJAR TODAS LAS RUTAS DE REACT
// ============================================
app.get('*', (req, res) => {
    // Excluir rutas de la API
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
    
    // Si es una petición de asset (css, js, etc.), no hacer nada (ya lo sirve static)
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|json)$/)) {
        return res.status(404).send('Archivo no encontrado');
    }
    
    // Para todas las demás rutas, enviar index.html
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        console.log('📄 Sirviendo index.html para:', req.path);
        return res.sendFile(indexPath);
    }
    
    // Fallback
    res.status(404).json({
        error: 'Frontend no disponible',
        path: req.path,
        distPath: distPath
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
    console.log(`📁 Dist path: ${distPath}`);
    console.log(`📁 Dist existe: ${fs.existsSync(distPath)}`);
});