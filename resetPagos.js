require('dotenv').config();
const mongoose = require('mongoose');

// Cargar tus modelos
const Payment = require('./models/Payment'); // Ajusta el nombre según tu archivo de modelo de pagos
const Loan = require('./models/Loan');

async function resetearSistema() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('Conectado a MongoDB...');

        // 1. Eliminar todo el historial de pagos/abonos realizados en las pruebas
        await Payment.deleteMany({});
        console.log('✔ Historial de pagos/abonos eliminado.');

        // 2. Opcional: Reiniciar el estado y saldo de los préstamos a su monto original si los afectaste
        // await Loan.updateMany({}, { estado: 'activo' });

        console.log('✔ Proceso completado exitosamente. El recaudo total ahora está en $0.');
        process.exit(0);
    } catch (error) {
        console.error('Error al reiniciar los pagos:', error);
        process.exit(1);
    }
}

resetearSistema();