const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    prestamoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true },
    montoPago: { type: Number, required: true },
    ganancia: { type: Number, default: 0 }, // <-- VERIFICA ESTA LÍNEA
    metodoPago: { type: String, enum: ['EFECTIVO', 'NEQUI', 'DAVIPLATA'], default: 'EFECTIVO' },
    fechaPago: { type: Date, default: Date.now },
    comentarios: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);