const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
    clienteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    montoPrestado: {
        type: Number,
        required: true
    },
    interesPorcentaje: {
        type: Number,
        default: 0
    },
    plazoMeses: {
        type: Number,
        default: 1
    },
    montoTotal: {
        type: Number,
        required: true
    },
    saldoPendiente: {
        type: Number,
        required: true
    },
    saldoCapital: {
        type: Number,
        required: true
    },
    estado: {
    type: String,
    default: 'activo'
},
    fechaCreacion: {
        type: Date,
        default: Date.now
    },
    fechaVencimiento: {
        type: Date
    }
});

module.exports = mongoose.model('Loan', loanSchema);