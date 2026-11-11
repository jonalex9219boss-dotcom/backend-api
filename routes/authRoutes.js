const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Ajusta la ruta si tu modelo está en otra carpeta
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Ruta para el Login del Administrador Central
router.post('/login', async (req, res) => {
    try {
        const { usuario, password } = req.body;

        // 1. Buscar el usuario en la base de datos
        const user = await User.findOne({ usuario });
        if (!user) {
            return res.status(400).json({ mensaje: 'Usuario o contraseña incorrectos' });
        }

        // 2. Validar la contraseña encriptada
        const esValida = await bcrypt.compare(password, user.password);
        if (!esValida) {
            return res.status(400).json({ mensaje: 'Usuario o contraseña incorrectos' });
        }

        // 3. Generar un Token de sesión seguro (JWT) que dura 8 horas
        const token = jwt.sign(
            { id: user._id, usuario: user.usuario, rol: user.rol },
            process.env.JWT_SECRET || 'clave_secreta_super_segura',
            { expiresIn: '8h' }
        );

        res.json({
            mensaje: '¡Ingreso exitoso!',
            token,
            usuario: { usuario: user.usuario, rol: user.rol }
        });

    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
    }
});

module.exports = router;