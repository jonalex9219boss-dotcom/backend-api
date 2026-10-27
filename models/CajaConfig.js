const mongoose = require('mongoose');

const cajaConfigSchema = new mongoose.Schema({
    tipo: { type: String, required: true, unique: true }, // Ej: 'global'
    montoInicial: { type: Number, required: true, default: 0 },
    origen: { type: String, default: 'propio' } // 'propio' o 'banco'
}, { timestamps: true });

module.exports = mongoose.model('CajaConfig', cajaConfigSchema);