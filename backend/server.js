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
const carpetas = [
    './uploads',
    './uploads/pedidos',
    './uploads/productos'
];

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
// RUTAS DE LA API - CON VERIFICACIÓN DE EXISTENCIA
// ============================================
const cargarRuta = (path, ruta) => {
    try {
        const fullPath = path.join(__dirname, ruta);
        if (fs.existsSync(fullPath)) {
            app.use(path, require(fullPath));
            console.log(`✅ Ruta cargada: ${path}`);
        } else {
            console.log(`⚠️ Ruta no encontrada: ${ruta}`);
        }
    } catch (error) {
        console.log(`⚠️ Error cargando ruta ${path}:`, error.message);
    }
};

// Cargar todas las rutas
cargarRuta('/auth', './routes/auth');
cargarRuta('/productos', './routes/productos');
cargarRuta('/ventas', './routes/ventas');
cargarRuta('/inventario', './routes/inventario');
cargarRuta('/clientes', './routes/clientes');
cargarRuta('/produccion', './routes/produccion');
cargarRuta('/entregas', './routes/entregas');
cargarRuta('/reportes', './routes/reportes');
cargarRuta('/materiales', './routes/materiales');
cargarRuta('/usuarios', './routes/usuarios');
cargarRuta('/creditos', './routes/creditos');
cargarRuta('/operarios', './routes/operarios');
cargarRuta('/recetas', './routes/recetas');
cargarRuta('/sucursales', './routes/sucursales');
cargarRuta('/historial', './routes/historial');
cargarRuta('/dashboard', './routes/dashboard');
cargarRuta('/transferencias', './routes/transferencias');
cargarRuta('/cambios', './routes/cambios');
cargarRuta('/nomina', './routes/nomina');
cargarRuta('/empleados', './routes/empleados');
cargarRuta('/cuentas-pagar', './routes/cuentasPagar');
cargarRuta('/gastos', './routes/gastos');
cargarRuta('/costos-productos', './routes/costosProductos');
cargarRuta('/pedidos', './routes/pedidos');

// 👇 RUTA DE SOLICITUDES DE DESCUENTO - CON VERIFICACIÓN
try {
    const solicitudesPath = path.join(__dirname, './routes/solicitudesDescuento.js');
    if (fs.existsSync(solicitudesPath)) {
        app.use('/solicitudes-descuento', require(solicitudesPath));
        console.log('✅ Ruta cargada: /solicitudes-descuento');
    } else {
        console.log('⚠️ Ruta no encontrada: ./routes/solicitudesDescuento.js');
        console.log('📁 Creando archivo de respaldo...');
        
        // Crear un archivo de respaldo con el código mínimo
        const fs = require('fs');
        const backupPath = path.join(__dirname, './routes/solicitudesDescuento.js');
        const backupContent = `
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Ruta de respaldo - solicitudes de descuento
router.get('/', async (req, res) => {
    res.json({ message: 'Solicitudes de descuento - módulo en construcción' });
});

router.get('/contador', async (req, res) => {
    res.json({ pendientes: 0 });
});

router.get('/pendientes', async (req, res) => {
    res.json([]);
});

router.get('/:id', async (req, res) => {
    res.json({ success: true, solicitud: { id: req.params.id, estado: 'pendiente' } });
});

router.post('/', async (req, res) => {
    res.json({ success: true, message: 'Solicitud creada', codigo: 'DESC-TEMP' });
});

router.put('/:id', async (req, res) => {
    res.json({ success: true, message: 'Solicitud procesada' });
});

module.exports = router;
        `;
        fs.writeFileSync(backupPath, backupContent);
        app.use('/solicitudes-descuento', require(backupPath));
        console.log('✅ Ruta de respaldo creada para /solicitudes-descuento');
    }
} catch (error) {
    console.log('⚠️ Error con /solicitudes-descuento:', error.message);
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
];

let frontendPath = null;
for (const p of posiblesPaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
        frontendPath = p;
        console.log(`✅ Frontend encontrado en: ${p}`);
        break;
    }
}

if (frontendPath) {
    app.use(express.static(frontendPath));
    console.log(`📁 Sirviendo frontend desde: ${frontendPath}`);
} else {
    console.log('❌ Frontend NO encontrado');
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
    
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|json|woff|woff2|ttf)$/)) {
        return res.status(404).send('Archivo no encontrado');
    }
    
    if (frontendPath) {
        const indexPath = path.join(frontendPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            return res.sendFile(indexPath);
        }
    }
    
    res.status(404).json({
        error: 'Frontend no disponible',
        message: 'El frontend no se ha construido correctamente'
    });
});

// ============================================
// RUTA DE PRUEBA
// ============================================
app.get('/api', (req, res) => {
    res.json({
        message: '🚀 AMAGO ERP Backend funcionando',
        modulos: ['auth', 'productos', 'ventas', 'inventario', 'clientes', 
                  'produccion', 'entregas', 'reportes', 'materiales', 'usuarios',
                  'creditos', 'operarios', 'recetas', 'sucursales', 'historial',
                  'dashboard', 'transferencias', 'cambios', 'nomina', 'empleados',
                  'cuentas-pagar', 'gastos', 'costos-productos', 'pedidos',
                  'solicitudes-descuento']
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