const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pool = require('./db');

const app = express();
const PORT = 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Crear carpeta uploads si no existe
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// ============================================
// RUTAS
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

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('🚀 AMAGO ERP Backend funcionando');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});