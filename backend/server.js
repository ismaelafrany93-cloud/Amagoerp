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

// 👇 RUTA DE SOLICITUDES DE DESCUENTO
app.use('/solicitudes-descuento', require('./routes/solicitudesDescuento'));

// ============================================
// 👇 SERVIDOR DE ARCHIVOS ESTÁTICOS (FRONTEND) - BUSQUEDA MEJORADA
// ============================================
// En Render, el build se ejecuta en la raíz y el dist se genera en frontend/dist
const posiblesPaths = [
    path.join(__dirname, '..', 'frontend', 'dist'),     // /backend/../frontend/dist
    path.join(__dirname, 'frontend', 'dist'),           // /backend/frontend/dist
    path.join(process.cwd(), 'frontend', 'dist'),       // /frontend/dist (desde la raíz)
    path.join(process.cwd(), 'dist'),                   // /dist (desde la raíz)
    path.join(__dirname, '..', 'dist'),                 // /dist (desde backend)
];

let frontendPath = null;
for (const p of posiblesPaths) {
    console.log(`🔍 Buscando frontend en: ${p}`);
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
        frontendPath = p;
        console.log(`✅ Frontend encontrado en: ${p}`);
        console.log(`📁 Contenido:`, fs.readdirSync(p));
        break;
    }
}

if (frontendPath) {
    app.use(express.static(frontendPath));
    console.log(`📁 Sirviendo frontend desde: ${frontendPath}`);
} else {
    console.log('❌ Frontend NO encontrado');
    console.log('📌 Ubicaciones buscadas:', posiblesPaths);
}

// ============================================
// MANEJAR RUTAS - REACT ROUTER
// ============================================
app.get('*', (req, res) => {
    // Excluir rutas de API
    const apiPaths = ['/auth', '/productos', '/ventas', '/inventario', '/clientes', 
                      '/produccion', '/entregas', '/reportes', '/materiales', '/usuarios',
                      '/creditos', '/operarios', '/recetas', '/sucursales', '/historial',
                      '/dashboard', '/transferencias', '/cambios', '/nomina', '/empleados',
                      '/cuentas-pagar', '/gastos', '/costos-productos', '/pedidos', '/uploads',
                      '/solicitudes-descuento'];
    
    for (const apiPath of apiPaths) {
        if (req.path.startsWith(apiPath)) {
            return res.status(404).json({ error: 'Ruta no encontrada' });
        }
    }
    
    // Si es un asset (js, css, etc.), no hacer nada (ya lo sirve express.static)
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|json|woff|woff2|ttf)$/)) {
        return res.status(404).send('Archivo no encontrado');
    }
    
    // Si hay frontend, enviar index.html
    if (frontendPath) {
        const indexPath = path.join(frontendPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            return res.sendFile(indexPath);
        }
    }
    
    // Fallback
    res.status(404).json({
        error: 'Frontend no disponible',
        message: 'El frontend no se ha construido correctamente',
        frontendPath: frontendPath
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
            'cuentas-pagar', 'gastos', 'costos-productos', 'pedidos',
            'solicitudes-descuento'
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
    console.log(`📁 Frontend path: ${frontendPath || 'No encontrado'}`);
});