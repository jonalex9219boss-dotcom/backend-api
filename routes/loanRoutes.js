const express = require('express');
const router = express.Router();
const Loan = require('../models/Loan');
const Payment = require('../models/Payment'); // <--- ¡Agrega esta línea aquí arriba!

// Crear un nuevo préstamo
router.post('/', async (req, res) => {
    try {
        const { clienteId, montoPrestado, interesPorcentaje, plazoMeses, fechaVencimientoCustom } = req.body;

        const monto = Number(montoPrestado) || 0;
        const interesMensual = Number(interesPorcentaje) || 0;
        const meses = Number(plazoMeses) || 1;

        // Cálculo con redondeo al próximo mil
        const interesTotal = monto * (interesMensual / 100) * meses;
        const cuotaBase = (monto / meses) + (monto * (interesMensual / 100));
        const cuotaRedondeada = Math.ceil(cuotaBase / 1000) * 1000;
        const montoTotal = cuotaRedondeada * meses;

        let fechaVenc = fechaVencimientoCustom ? new Date(fechaVencimientoCustom) : new Date();
if (!fechaVencimientoCustom) {
    fechaVenc.setMonth(fechaVenc.getMonth() + 1);
}
// Normalizar las horas a cero para evitar desfases de días
fechaVenc.setHours(0, 0, 0, 0);

        const nuevoPrestamo = new Loan({
        clienteId,
        montoPrestado: monto,
        interesPorcentaje: interesMensual,
        plazoMeses: meses,
        montoTotal,
        saldoPendiente: montoTotal,
        saldoCapital: monto, // <--- NUEVO: Inicializamos el capital real con el monto prestado
        fechaVencimiento: fechaVenc
    });

        await nuevoPrestamo.save();
        res.status(201).json(nuevoPrestamo);
    } catch (err) {
        res.status(400).json({ mensaje: err.message });
    }
});

// Obtener todos los préstamos con su conteo de cuotas pagadas
router.get('/', async (req, res) => {
    try {
        const prestamos = await Loan.find().populate('clienteId').lean();

        // Contar los pagos para cada préstamo en tiempo real
        const prestamosConCuotas = await Promise.all(prestamos.map(async (prestamo) => {
            const cuotasPagadas = await Payment.countDocuments({ prestamoId: prestamo._id });
            return {
                ...prestamo,
                cuotasPagadas // <--- Le inyectamos el número de cuotas exacto
            };
        }));

        res.json(prestamosConCuotas);
    } catch (err) {
        res.status(500).json({ mensaje: err.message });
    }
});

// Editar/Actualizar un préstamo existente por ID
router.put('/:id', async (req, res) => {
    try {
        const { montoPrestado, interesPorcentaje, plazoMeses, fechaVencimiento } = req.body;
        
        const prestamo = await Loan.findById(req.params.id);
        if (!prestamo) {
            return res.status(404).json({ mensaje: 'Préstamo no encontrado' });
        }

        const monto = Number(montoPrestado) || prestamo.montoPrestado;
        const interesMensual = Number(interesPorcentaje) !== undefined ? Number(interesPorcentaje) : prestamo.interesPorcentaje;
        const meses = Number(plazoMeses) || prestamo.plazoMeses;

        const interesTotal = monto * (interesMensual / 100) * meses;
        const nuevoMontoTotal = monto + interesTotal;

        // Calcular la diferencia si ya se habían hecho abonos
       const abonosRealizados = (prestamo.montoTotal || 0) - (prestamo.saldoPendiente || 0);
        const nuevoSaldo = Math.max(0, nuevoMontoTotal - abonosRealizados);

        // Agregamos esta línea aquí para que Mongoose no rechace el guardado
        prestamo.saldoCapital = prestamo.saldoCapital || monto;

        prestamo.montoPrestado = monto;
        prestamo.interesPorcentaje = interesMensual;
        prestamo.plazoMeses = meses;
        prestamo.montoTotal = nuevoMontoTotal;
        prestamo.saldoPendiente = nuevoSaldo;
        if (fechaVencimiento) {
            prestamo.fechaVencimiento = new Date(fechaVencimiento);
        }
        if (nuevoSaldo === 0) {
            prestamo.estado = 'PAGADO';
        }

        await prestamo.save({ runValidators: false });
        await prestamo.save({ runValidators: false });
const prestamoPoblado = await Loan.findById(req.params.id).populate('clienteId');
res.json(prestamoPoblado);
    } catch (err) {
        res.status(400).json({ mensaje: err.message });
    }
});

// Ruta para editar o ampliar un préstamo existente (Ej: subir de 500k a 700k)
router.put('/:id', async (req, res) => {
    try {
        const { montoPrestado, interesPorcentaje, plazoMeses } = req.body;
        const loan = await Loan.findById(req.params.id);

        if (!loan) return res.status(404).json({ mensaje: 'Préstamo no encontrado' });

        // Tomamos los nuevos valores o mantenemos los anteriores si no se envían
        const monto = Number(montoPrestado) || loan.montoPrestado;
        const interesMensual = Number(interesPorcentaje) || loan.interesPorcentaje;
        const meses = Number(plazoMeses) || loan.plazoMeses;

        // Recálculo del nuevo monto total basado en el capital ampliado
        const cuotaBase = (monto / meses) + (monto * (interesMensual / 100));
        const cuotaRedondeada = Math.ceil(cuotaBase / 1000) * 1000;
        const nuevoMontoTotal = cuotaRedondeada * meses;

        // Consultar los abonos que el cliente ya haya hecho históricamente para restarlos bien
        const pagosRealizados = await Payment.find({ loanId: loan._id });
        const totalAbonado = pagosRealizados.reduce((acc, p) => acc + (p.monto || 0), 0);

        // Actualizamos capital y saldos, CONSERVANDO las fechas originales intactas
        loan.montoPrestado = monto;
        loan.interesPorcentaje = interesMensual;
        loan.plazoMeses = meses;
        loan.montoTotal = nuevoMontoTotal;
        loan.saldoCapital = monto;
        loan.saldoPendiente = Math.max(0, nuevoMontoTotal - totalAbonado);

        await loan.save();
        res.json({ mensaje: 'Préstamo actualizado exitosamente', loan });
    } catch (err) {
        res.status(400).json({ mensaje: err.message });
    }
});

// Eliminar un préstamo por ID
router.delete('/:id', async (req, res) => {
    try {
        const prestamoEliminado = await Loan.findByIdAndDelete(req.params.id);
        if (!prestamoEliminado) {
            return res.status(404).json({ mensaje: 'Préstamo no encontrado' });
        }
        res.json({ mensaje: 'Préstamo eliminado exitosamente' });
    } catch (err) {
        res.status(500).json({ mensaje: err.message });
    }
});

module.exports = router;