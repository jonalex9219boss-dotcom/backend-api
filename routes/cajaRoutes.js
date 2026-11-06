const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); 
const CajaConfig = require('../models/CajaConfig');

// 1. Obtener el historial de todas las inyecciones
router.get('/', async (req, res) => {
    try {
        const inyecciones = await CajaConfig.find().sort({ fecha: -1 });
        res.json(inyecciones);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener el historial de inyecciones' });
    }
});

// 2. Registrar una nueva inyección (Soporta capital propio y banco)
router.post('/', async (req, res) => {
    try {
        const { montoInicial, origen } = req.body;

        const nuevaInyeccion = new CajaConfig({
            montoInicial: Number(montoInicial) || 0,
            origen: origen || 'propio', // Recibe 'propio' o 'banco' según lo que mande el frontend
            fecha: new Date()           // Asigna la fecha actual para que el .sort() no falle nunca
        });

        await nuevaInyeccion.save();
        res.json({ message: 'Inyección registrada con éxito', nuevaInyeccion });
    } catch (err) {
        console.error("--> Error al registrar la inyección:", err);
        res.status(500).json({ error: 'Error al registrar la inyección' });
    }
});

// 3. Editar una inyección existente por su ID (Corrección de errores humanos)
router.put('/:id', async (req, res) => {
    try {
        const { montoInicial, origen } = req.body;
        const inyeccionActualizada = await CajaConfig.findByIdAndUpdate(
            req.params.id,
            { 
                montoInicial: Number(montoInicial) || 0, 
                origen: origen || 'propio' 
            },
            { new: true }
        );
        res.json({ message: 'Inyección actualizada correctamente', inyeccionActualizada });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar la inyección' });
    }
});

// 4. Eliminar / Revertir una inyección por su ID
router.delete('/:id', async (req, res) => {
    try {
        await CajaConfig.findByIdAndDelete(req.params.id);
        res.json({ message: 'Inyección eliminada / revertida con éxito' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar la inyección' });
    }
});

module.exports = mongoose.model('CajaConfig', CajaConfigSchema, 'cajaconfigs');