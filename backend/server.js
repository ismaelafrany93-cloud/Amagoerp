const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// CORS
// ============================================
app.use(cors());
app.use(express.json());

// ============================================
// 👇 SERVIDOR DE ARCHIVOS ESTÁTICOS (IMÁGENES)
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
// 👇 SERVIR EL FRONTEND (REACT BUILD)
// ============================================
// Servir archivos estáticos del frontend (desde la carpeta dist)
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
console.log('📁 Frontend path:', frontendPath);

// Verificar si la carpeta dist existe
if (fs.existsSync(frontendPath)) {
    console.log('✅ Carpeta frontend/dist encontrada');
    app.use(express.static(frontendPath));
} else {
    console.log('⚠️ Carpeta frontend/dist NO encontrada. Build el frontend primero.');
}

// ============================================
// 👇 MANEJAR TODAS LAS RUTAS DE REACT
// ============================================
// Cualquier ruta que no sea de la API, enviar index.html
app.get('*', (req, res) => {
    // Excluir rutas de la API (que ya están definidas arriba)
    if (req.path.startsWith('/auth') || 
        req.path.startsWith('/productos') || 
        req.path.startsWith('/ventas') || 
        req.path.startsWith('/inventario') || 
        req.path.startsWith('/clientes') || 
        req.path.startsWith('/produccion') || 
        req.path.startsWith('/entregas') || 
        req.path.startsWith('/reportes') || 
        req.path.startsWith('/materiales') || 
        req.path.startsWith('/usuarios') || 
        req.path.startsWith('/creditos') || 
        req.path.startsWith('/operarios') || 
        req.path.startsWith('/recetas') || 
        req.path.startsWith('/sucursales') || 
        req.path.startsWith('/historial') || 
        req.path.startsWith('/dashboard') || 
        req.path.startsWith('/transferencias') || 
        req.path.startsWith('/cambios') || 
        req.path.startsWith('/nomina') || 
        req.path.startsWith('/empleados') || 
        req.path.startsWith('/cuentas-pagar') || 
        req.path.startsWith('/gastos') || 
        req.path.startsWith('/costos-productos') || 
        req.path.startsWith('/pedidos') || 
        req.path.startsWith('/uploads')) {
        return res.status(404).json({ error: 'Ruta no encontrada' });
    }
    
    // Para todas las demás rutas, enviar index.html (React Router se encarga)
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({ 
            error: 'Frontend no construido. Ejecuta npm run build en la carpeta frontend',
            path: indexPath
        });
    }
});

// ============================================
// TEST ROUTE
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
    console.log(`📁 Serviendo frontend desde: ${frontendPath}`);
});