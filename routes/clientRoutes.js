const express = require('express');
const router = express.Router();
const Client = require('../models/Client');

// Registrar cliente
router.post('/', async (req, res) => {
    try {
        const nuevoCliente = new Client(req.body);
        await nuevoCliente.save();
        res.status(201).json(nuevoCliente);
    } catch (err) {
        res.status(400).json({ mensaje: err.message });
    }
});

// Listar clientes
router.get('/', async (req, res) => {
    try {
        const clientes = await Client.find();
        res.json(clientes);
    } catch (err) {
        res.status(500).json({ mensaje: err.message });
    }
});

module.exports = router;