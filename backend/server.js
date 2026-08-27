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

// Ruta de solicitudes de descuento
try {
    const solicitudesPath = path.join(__dirname, './routes/solicitudesdescuento.js');
    if (fs.existsSync(solicitudesPath)) {
        app.use('/solicitudes-descuento', require(solicitudesPath));
        console.log('✅ Ruta cargada: /solicitudes-descuento');
    } else {
        console.log('⚠️ Ruta no encontrada: ./routes/solicitudesdescuento.js');
        app.use('/solicitudes-descuento', (req, res) => {
            res.json({ message: 'Solicitudes de descuento - módulo en construcción' });
        });
    }
} catch (error) {
    console.log('⚠️ Error con /solicitudes-descuento:', error.message);
    app.use('/solicitudes-descuento', (req, res) => {
        res.json({ message: 'Solicitudes de descuento - módulo en construcción' });
    });
}

// ============================================
// SERVIDOR DE ARCHIVOS ESTÁTICOS (FRONTEND)
// ============================================
const posiblesPaths = [
    path.join(__dirname, '..', 'frontend', 'dist'),
    path.join(__dirname, 'frontend', 'dist'),
    path.join(process.cwd(), 'frontend', 'dist'),
    path.join(process.cwd(), 'dist'),
    path.join(__dirname, '..', 'dist'),
    path.join(__dirname, '..', '..', 'frontend', 'dist'), // En Render puede estar aquí
    path.join('/opt/render/project/src/frontend/dist'), // Ruta absoluta en Render
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
    } else {
        console.log('❌ Carpeta frontend no existe en:', frontendDir);
    }
}

// ============================================
// MANEJADOR DE RUTAS DE REACT - VA AL FINAL
// ============================================
app.get('*', (req, res) => {
    // Excluir rutas de API
    const apiPaths = ['/auth', '/productos', '/ventas', '/inventario', '/clientes', 
                      '/produccion', '/entregas', '/reportes', '/materiales', '/usuarios',
                      '/creditos', '/operarios', '/recetas', '/sucursales', '/historial',
                      '/dashboard', '/transferencias', '/cambios', '/nomina', '/empleados',
                      '/cuentas-pagar', '/gastos', '/costos-productos', '/pedidos', '/uploads',
                      '/solicitudes-descuento', '/api'];
    
    for (const apiPath of apiPaths) {
        if (req.path.startsWith(apiPath)) {
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
    
    // Fallback: servir el index.html si está en la raíz
    const rootIndex = path.join(__dirname, '..', 'index.html');
    if (fs.existsSync(rootIndex)) {
        return res.sendFile(rootIndex);
    }
    
    res.status(404).json({ 
        error: 'Frontend no disponible',
        message: 'El frontend no se ha construido correctamente',
        path: req.path,
        frontendPath: frontendPath,
        cwd: process.cwd(),
        dirname: __dirname
    });
});

// ============================================
// RUTA DE DIAGNÓSTICO
// ============================================
app.get('/debug', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    const directorios = [
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
    
    const resultado = {};
    for (const dir of directorios) {
        try {
            if (fs.existsSync(dir)) {
                const contenido = fs.readdirSync(dir);
                resultado[dir] = {
                    existe: true,
                    contenido: contenido.slice(0, 20)
                };
            } else {
                resultado[dir] = { existe: false };
            }
        } catch (e) {
            resultado[dir] = { existe: false, error: e.message };
        }
    }
    
    res.json(resultado);
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
    console.log(`📁 __dirname: ${__dirname}`);
    console.log(`📁 process.cwd(): ${process.cwd()}`);
});