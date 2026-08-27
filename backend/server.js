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
// CREAR CARPETAS SI NO EXISTEN
// ============================================
const carpetas = ['./uploads', './uploads/pedidos', './uploads/productos'];
for (const carpeta of carpetas) {
    if (!fs.existsSync(carpeta)) {
        try {
            fs.mkdirSync(carpeta, { recursive: true });
            console.log(`📁 Carpeta creada: ${carpeta}`);
        } catch (err) {
            console.error(`❌ Error creando carpeta ${carpeta}:`, err);
        }
    }
}

// ============================================
// SERVIDOR DE ARCHIVOS ESTÁTICOS (IMÁGENES)
// ============================================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// RUTAS DE LA API - CON /api
// ============================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/ventas', require('./routes/ventas'));
app.use('/api/inventario', require('./routes/inventario'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/produccion', require('./routes/produccion'));
app.use('/api/entregas', require('./routes/entregas'));
app.use('/api/reportes', require('./routes/reportes'));
app.use('/api/materiales', require('./routes/materiales'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/creditos', require('./routes/creditos'));
app.use('/api/operarios', require('./routes/operarios'));
app.use('/api/recetas', require('./routes/recetas'));
app.use('/api/sucursales', require('./routes/sucursales'));
app.use('/api/historial', require('./routes/historial'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/transferencias', require('./routes/transferencias'));
app.use('/api/cambios', require('./routes/cambios'));
app.use('/api/nomina', require('./routes/nomina'));
app.use('/api/empleados', require('./routes/empleados'));
app.use('/api/cuentas-pagar', require('./routes/cuentasPagar'));
app.use('/api/gastos', require('./routes/gastos'));
app.use('/api/costos-productos', require('./routes/costosProductos'));
app.use('/api/pedidos', require('./routes/pedidos'));

// Ruta de solicitudes de descuento
try {
    const solicitudesPath = path.join(__dirname, './routes/solicitudesdescuento.js');
    if (fs.existsSync(solicitudesPath)) {
        app.use('/api/solicitudes-descuento', require(solicitudesPath));
        console.log('✅ Ruta cargada: /api/solicitudes-descuento');
    } else {
        console.log('⚠️ Ruta no encontrada: ./routes/solicitudesdescuento.js');
        app.use('/api/solicitudes-descuento', (req, res) => {
            res.json({ message: 'Solicitudes de descuento - módulo en construcción' });
        });
    }
} catch (error) {
    console.log('⚠️ Error con /api/solicitudes-descuento:', error.message);
    app.use('/api/solicitudes-descuento', (req, res) => {
        res.json({ message: 'Solicitudes de descuento - módulo en construcción' });
    });
}

// ============================================
// RUTAS SIN /api - PARA COMPATIBILIDAD CON EL FRONTEND
// ============================================
app.use('/solicitudes-descuento', require('./routes/solicitudesdescuento'));
app.use('/ventas', require('./routes/ventas'));
app.use('/entregas', require('./routes/entregas'));
app.use('/historial', require('./routes/historial'));
app.use('/productos', require('./routes/productos'));
app.use('/clientes', require('./routes/clientes'));
app.use('/inventario', require('./routes/inventario'));
app.use('/produccion', require('./routes/produccion'));
app.use('/reportes', require('./routes/reportes'));
app.use('/materiales', require('./routes/materiales'));
app.use('/usuarios', require('./routes/usuarios'));
app.use('/creditos', require('./routes/creditos'));
app.use('/operarios', require('./routes/operarios'));
app.use('/recetas', require('./routes/recetas'));
app.use('/sucursales', require('./routes/sucursales'));
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
// RUTA DE PRUEBA
// ============================================
app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'Backend funcionando' });
});

// ============================================
// RUTA DE DIAGNÓSTICO
// ============================================
app.get('/debug', (req, res) => {
    const resultado = {
        cwd: process.cwd(),
        __dirname: __dirname,
        frontendPath: null,
        carpetas: {}
    };
    
    const carpetasBuscar = [
        __dirname,
        path.join(__dirname, '..'),
        path.join(__dirname, '..', 'frontend'),
        path.join(__dirname, '..', 'frontend', 'dist'),
        process.cwd(),
        path.join(process.cwd(), 'frontend'),
        path.join(process.cwd(), 'frontend', 'dist'),
        '/opt/render/project/src/frontend',
        '/opt/render/project/src/frontend/dist'
    ];
    
    for (const carpeta of carpetasBuscar) {
        try {
            if (fs.existsSync(carpeta)) {
                const contenido = fs.readdirSync(carpeta);
                resultado.carpetas[carpeta] = {
                    existe: true,
                    contenido: contenido.slice(0, 15)
                };
                if (contenido.includes('dist') || contenido.includes('index.html')) {
                    resultado.frontendPath = carpeta;
                }
            } else {
                resultado.carpetas[carpeta] = { existe: false };
            }
        } catch (e) {
            resultado.carpetas[carpeta] = { existe: false, error: e.message };
        }
    }
    
    res.json(resultado);
});

// ============================================
// SERVIDOR DE ARCHIVOS ESTÁTICOS (FRONTEND)
// ============================================
const posiblesPaths = [
    path.join(__dirname, '..', 'frontend', 'dist'),
    path.join(__dirname, 'frontend', 'dist'),
    path.join(process.cwd(), 'frontend', 'dist'),
    path.join(process.cwd(), 'dist'),
    path.join(__dirname, '..', 'dist'),
    '/opt/render/project/src/frontend/dist',
];

console.log('🔍 Buscando frontend...');
let frontendPath = null;
for (const p of posiblesPaths) {
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
    
    // Verificar si existe la carpeta frontend
    const frontendDir = path.join(__dirname, '..', 'frontend');
    if (fs.existsSync(frontendDir)) {
        console.log(`📁 Contenido de frontend:`, fs.readdirSync(frontendDir));
    }
}

// ============================================
// MANEJADOR DE RUTAS DE REACT - VA AL FINAL
// ============================================
app.get('*', (req, res) => {
    // Excluir rutas de API y debug
    const excludePaths = ['/api', '/debug', '/uploads', '/solicitudes-descuento', '/ventas', '/entregas', '/historial'];
    
    for (const excludePath of excludePaths) {
        if (req.path.startsWith(excludePath)) {
            return res.status(404).json({ error: 'Ruta no encontrada' });
        }
    }
    
    // Si es un asset (js, css, etc.), no hacer nada
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
        path: req.path
    });
});

// ============================================
// RUTA DE PRUEBA API
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