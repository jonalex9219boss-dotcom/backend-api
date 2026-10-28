const mongoose = require('mongoose');

const CajaConfigSchema = new mongoose.Schema({
    montoInicial: { type: Number, required: true },
    origen: { type: String, enum: ['propio', 'banco'], default: 'propio' },
    fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CajaConfig', CajaConfigSchema);