const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    usuario: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    rol: { type: String, default: 'admin' } // Para diferenciar tu cuenta central de otras
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema, 'Usuarios');