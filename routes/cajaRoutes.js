const express = require('express');
const router = express.Router();
const CajaConfig = require('../models/CajaConfig');

// Obtener la configuración actual de la caja
router.get('/', async (req, res) => {
    try {
        let config = await CajaConfig.findOne({ tipo: 'global' });
        if (!config) {
            config = new CajaConfig({ tipo: 'global', montoInicial: 0, origen: 'propio' });
            await config.save();
        }
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener la caja' });
    }
});

// Actualizar o fijar la inyección de capital de forma permanente
router.post('/', async (req, res) => {
    try {
        const { montoInicial, origen } = req.body;
        let config = await CajaConfig.findOne({ tipo: 'global' });
        
        if (!config) {
            config = new CajaConfig({ tipo: 'global', montoInicial, origen });
        } else {
            config.montoInicial = montoInicial;
            config.origen = origen || 'propio';
        }
        
        await config.save();
        res.json({ message: 'Caja actualizada y guardada permanentemente', config });
    } catch (err) {
        res.status(500).json({ error: 'Error al guardar la caja' });
    }
});

module.exports = router;