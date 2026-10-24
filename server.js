const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const clientRoutes = require('./routes/clientRoutes');
const loanRoutes = require('./routes/loanRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const Client = require('./models/Client');
const Loan = require('./models/Loan');
const Payment = require('./models/Payment');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Esquema para Gastos / Pasivos Bancarios
const ExpenseSchema = new mongoose.Schema({
    descripcion: { type: String, required: true },
    monto: { type: Number, required: true },
    categoria: { type: String, default: 'Cuota Banco' },
    fecha: { type: Date, default: Date.now }
});
const Expense = mongoose.model('Expense', ExpenseSchema);

app.use('/api/clients', clientRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payments', paymentRoutes);

let cajaInicial = 0;

// Obtener estadísticas globales
app.get('/api/stats', async (req, res) => {
    try {
        const prestamos = await Loan.find();
        const pagos = await Payment.find();
        const gastos = await Expense.find();

        let totalPrestado = 0;
        let totalSaldoPendiente = 0;
        let totalMontoConInteres = 0;

        prestamos.forEach(p => {
            totalPrestado += p.montoPrestado || 0;
            totalSaldoPendiente += p.saldoPendiente || 0;
            totalMontoConInteres += p.montoTotal || 0;
        });

        let totalRecaudadoAbonos = 0;
        pagos.forEach(p => {
            totalRecaudadoAbonos += p.montoPago || 0;
        });

        let totalGastosBancarios = 0;
        gastos.forEach(g => {
            totalGastosBancarios += g.monto || 0;
        });

        const totalInteresesProyectados = totalMontoConInteres - totalPrestado;
        const cajaDisponible = cajaInicial + totalRecaudadoAbonos - totalPrestado - totalGastosBancarios;

        res.json({
            cajaInicial,
            cajaDisponible,
            totalPrestado,
            totalSaldoPendiente,
            totalRecaudadoAbonos,
            totalGastosBancarios,
            totalInteresesProyectados,
            prestamosActivos: prestamos.filter(p => p.saldoPendiente > 0).length
        });
    } catch (err) {
        res.status(500).json({ mensaje: err.message });
    }
});

app.post('/api/stats/caja-inicial', (req, res) => {
    const { monto } = req.body;
    cajaInicial = Number(monto) || 0;
    res.json({ mensaje: 'Caja inicial actualizada', cajaInicial });
});

// Rutas para Gastos / Pasivos Bancarios
app.get('/api/expenses', async (req, res) => {
    try {
        const gastos = await Expense.find().sort({ fecha: -1 });
        res.json(gastos);
    } catch (err) {
        res.status(500).json({ mensaje: err.message });
    }
});

app.post('/api/expenses', async (req, res) => {
    try {
        const { descripcion, monto, categoria } = req.body;
        const nuevoGasto = new Expense({ descripcion, monto: Number(monto), categoria });
        await nuevoGasto.save();
        res.status(201).json(nuevoGasto);
    } catch (err) {
        res.status(400).json({ mensaje: err.message });
    }
});

app.delete('/api/expenses/:id', async (req, res) => {
    try {
        await Expense.findByIdAndDelete(req.params.id);
        res.json({ mensaje: 'Gasto/Pago eliminado' });
    } catch (err) {
        res.status(500).json({ mensaje: err.message });
    }
});

// Endpoint para Copia de Seguridad (Backup completo JSON)
app.get('/api/backup', async (req, res) => {
    try {
        const clientes = await Client.find();
        const prestamos = await Loan.find();
        const pagos = await Payment.find();
        const gastos = await Expense.find();

        const backupData = {
            fechaBackup: new Date(),
            cajaInicial,
            clientes,
            prestamos,
            pagos,
            gastos
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=Backup_PyS_${new Date().toISOString().slice(0,10)}.json`);
        res.json(backupData);
    } catch (err) {
        res.status(500).json({ mensaje: err.message });
    }
});
// actualizacion de clientes
app.put('/actualizar-cliente', async (req, res) => {
    try {
        const { nombreOriginal, nuevoNombre, nuevaCedula, nuevaTelefono, nuevaDireccion } = req.body;
        
        console.log("Buscando al cliente:", nombreOriginal);

        // Búsqueda flexible: encuentra al cliente aunque tenga variaciones menores o espacios
        const regexNombre = new RegExp(nombreOriginal.trim(), 'i');

        const resultado = await Client.findOneAndUpdate(
            { nombre: { $regex: regexNombre } },
            { 
                nombre: nuevoNombre, 
                cedula: nuevaCedula, 
                telefono: nuevaTelefono, 
                direccion: nuevaDireccion 
            },
            { new: true }
        );

        if (!resultado) {
            return res.status(404).json({ exito: false, mensaje: "Cliente no encontrado en la base de datos." });
        }

        res.json({ exito: true, mensaje: "¡Cliente actualizado correctamente!" });
    } catch (error) {
        console.error("Error al actualizar el cliente:", error);
        res.status(500).json({ exito: false, mensaje: "Error interno en el servidor." });
    }
});

const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI 

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ Conectado exitosamente a MongoDB');
        app.listen(PORT, () => {
            console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ Error de conexión a MongoDB:', err.message);
    });