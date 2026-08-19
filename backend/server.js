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
// 👇 SERVIR EL FRONTEND - SOLO LA RUTA RAÍZ
// ============================================
const distPath = path.join(__dirname, '..', 'frontend', 'dist');

console.log('📁 Buscando frontend en:', distPath);

if (fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'))) {
    // Servir archivos estáticos
    app.use(express.static(distPath));
    console.log('✅ Frontend encontrado en:', distPath);
    console.log('📁 Contenido:', fs.readdirSync(distPath));
} else {
    console.log('❌ Frontend NO encontrado en:', distPath);
}

// ============================================
// MANEJAR RUTAS - SOLO LA RAÍZ PARA EL FRONTEND
// ============================================
app.get('/', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.json({ message: 'Frontend no disponible' });
    }
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
    console.log(`📁 Dist path: ${distPath}`);
    console.log(`📁 Dist existe: ${fs.existsSync(distPath)}`);
});