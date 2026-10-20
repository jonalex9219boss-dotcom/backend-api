const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    cedula: { type: String, required: true, unique: true },
    telefono: { type: String, required: true },
    direccion: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);