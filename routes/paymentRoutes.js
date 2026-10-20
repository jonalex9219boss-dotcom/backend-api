const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Loan = require('../models/Loan');

// 1. REGISTRAR UN PAGO
router.post('/', async (req, res) => {
    try {
        const { prestamoId, montoPago, metodoPago, comentarios, tipoAbono } = req.body;
        
        // Poblamos la información del préstamo
       const loan = await Loan.findById(prestamoId).populate('clienteId', 'nombre cedula documento cedulaCiudadania identificacion');
        
        if (!loan) {
            return res.status(404).json({ message: 'Préstamo no encontrado' });
        }

        const monto = Number(montoPago);
        
      // 1. Cálculo de ganancia proporcional por cuota (Opción B)
        const montoPrestado = Number(loan.montoPrestado || 0);
        const meses = Number(loan.plazoMeses || loan.meses || 1);
        const porcentaje = Number(loan.interesPorcentaje || loan.interes || 0);

        let gananciaCalculada = 0;

        if (montoPrestado > 0 && meses > 0 && porcentaje > 0) {
            // Interés total generado por todo el préstamo
            const interesTotal = montoPrestado * (porcentaje / 100) * meses;
            
            // Ganancia exacta por cada cuota mensual abonada
            gananciaCalculada = Math.round(interesTotal / meses);
        }

        // Imprimir en consola de la terminal para verificación
        console.log('DATOS DEL PRÉSTAMO EN MONGO:', loan);
        console.log(`[PAGO REGISTRADO] Monto: $${monto} | Tasa detectada: ${porcentaje}% | Ganancia: $${gananciaCalculada}`);

        // --- CÁLCULO DE DÍAS DE RETRASO Y CALIFICACIÓN ---
let diasRetraso = 0;
let calificacion = '🟢 Cliente Confiable';

if (loan.fechaVencimiento) {
    const fechaVencOriginal = new Date(loan.fechaVencimiento);
    const fechaPagoReal = new Date();
    
    const diferenciaMs = fechaPagoReal - fechaVencOriginal;
    diasRetraso = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));

    if (diasRetraso <= 2) {
        calificacion = '🟢 Cliente Confiable';
    } else if (diasRetraso <= 5) {
        calificacion = '🟡 Riesgo Bajo (Sobresaliente)';
    } else if (diasRetraso <= 15) {
        calificacion = '🟠 Riesgo Medio (En Duda)';
    } else {
        calificacion = '🔴 Alto Riesgo (Moroso)';
    }
}

console.log('--- REPORTE DE PAGO ---');
console.log('Días de retraso:', diasRetraso);
console.log('Calificación asignada:', calificacion);
console.log('Nueva fecha de vencimiento:', loan.fechaVencimiento);

// Crear el pago guardando la ganancia y la calificación
const nuevoPago = new Payment({
    prestamoId: loan._id,
    monto: monto,
    ganancia: gananciaCalculada,
    metodoPago: metodoPago || 'EFECTIVO',
    comentarios: comentarios || '',
    fechaPago: new Date(),
    diasRetraso: Math.max(0, diasRetraso),
    calificacion: calificacion
});

        await nuevoPago.save();

       // Actualizar saldos del préstamo
        const saldoAnterior = loan.saldoPendiente !== undefined ? loan.saldoPendiente : loan.montoTotal;
        const nuevoSaldo = Math.max(0, saldoAnterior - monto);
        loan.saldoPendiente = nuevoSaldo;

        // Si es un préstamo viejo que no tiene el campo, lo inicializamos
        if (loan.saldoCapital === undefined) {
            loan.saldoCapital = loan.montoPrestado;
        }

        // --- CÁLCULO MATEMÁTICO CORRECTO PARA PROTEGER LA EMPRESA ---
        let capitalARestar = 0;

        if (tipoAbono === 'SOLO_CAPITAL') {
            capitalARestar = monto;
        } else if (tipoAbono === 'SOLO_INTERES') {
            capitalARestar = 0; // No reduce capital, todo va a la ganancia de intereses
        } else {
            // Abono Normal (Capital + Interés):
            // Del pago total de $267,000, se separan los $100,000 de intereses (gananciaCalculada)
            // y los $167,000 restantes son los que bajan el capital real.
            capitalARestar = Math.max(0, monto - gananciaCalculada);
        }

        // Descontar únicamente el capital real al saldo capital
        loan.saldoCapital = Math.max(0, loan.saldoCapital - capitalARestar);

        // 1. Si el saldo llega a cero, el préstamo se liquida
if (nuevoSaldo <= 0 || loan.saldoCapital <= 0) {
    loan.saldoPendiente = 0;
    loan.estado = 'CANCELADO';
} else {
    // 2. Si aún debe y es a cuotas múltiples, avanzamos la fecha de cobro 1 mes para que no siga en mora
    if (loan.fechaVencimiento) {
    let fechaActualVenc = new Date(loan.fechaVencimiento);
    // Forzamos la suma de un mes de forma segura
    fechaActualVenc.setMonth(fechaActualVenc.getMonth() + 1);
    fechaActualVenc.setHours(0, 0, 0, 0);
    loan.fechaVencimiento = fechaActualVenc;
}
}

        await loan.save();

        // Contar cuántos pagos lleva este préstamo en total (incluyendo este actual)
        const numeroCuotaActual = await Payment.countDocuments({ prestamoId: loan._id });

        // Enviar los datos limpios al frontend incluyendo la cuota actual
        res.status(201).json({
            message: 'Pago registrado exitosamente',
            pago: nuevoPago,
            nuevoSaldo,
            saldoCapital: loan.saldoCapital,
            cuotaActual: numeroCuotaActual,
            plazoTotal: loan.plazoMeses || loan.meses || 12,
            cliente: loan.clienteId?.nombre || 'N/A',
            cedula: loan.clienteId?.cedula || loan.clienteId?.documento || loan.clienteId?.cedulaCiudadania || loan.clienteId?.identificacion || 'N/A'
        });
    } catch (error) {
        console.error('Error en POST /payments:', error);
        res.status(500).json({ message: 'Error al registrar el pago', error: error.message });
    }
});

// 2. OBTENER MÉTRICAS DE GANANCIAS (HOY Y MES)
router.get('/metricas/ganancias', async (req, res) => {
    try {
        const ahora = new Date();
        
        // Inicio y fin del día de hoy (en zona horaria local)
        const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
        const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);

        // Inicio y fin del mes actual
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0);
        const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);

        // Suma de ganancias de hoy
        const pagosHoy = await Payment.find({
            fechaPago: { $gte: inicioHoy, $lte: finHoy }
        });
        const gananciaHoy = pagosHoy.reduce((acc, p) => acc + (p.ganancia || 0), 0);

        // Suma de ganancias del mes
        const pagosMes = await Payment.find({
            fechaPago: { $gte: inicioMes, $lte: finMes }
        });
        const gananciaMes = pagosMes.reduce((acc, p) => acc + (p.ganancia || 0), 0);

        res.json({
            gananciaHoy,
            gananciaMes
        });
    } catch (error) {
        console.error('Error al calcular métricas de ganancias:', error);
        res.status(500).json({ message: 'Error al obtener métricas', error: error.message });
    }
});

// 3. OBTENER HISTORIAL DE PAGOS POR PRÉSTAMO
router.get('/prestamo/:prestamoId', async (req, res) => {
    try {
        const pagos = await Payment.find({ prestamoId: req.params.prestamoId })
            .sort({ fechaPago: -1 });
        res.json(pagos);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el historial de pagos', error: error.message });
    }
});

// OBTENER HISTORIAL DE PAGOS DE UN CLIENTE ESPECÍFICO
router.get('/cliente/:clienteId', async (req, res) => {
    try {
        const { clienteId } = req.params;

        // 1. Buscamos todos los préstamos que pertenecen a este cliente
        const prestamosCliente = await Loan.find({ clienteId }).select('_id');
        const prestamoIds = prestamosCliente.map(p => p._id);

        // 2. Buscamos los pagos asociados a esos préstamos
        const historialPagos = await Payment.find({ prestamoId: { $in: prestamoIds } })
            .populate('prestamoId', 'montoPrestado interesPorcentaje')
            .sort({ fechaPago: -1 }); // Del más reciente al más antiguo

        res.json(historialPagos);
    } catch (error) {
        console.error('Error al obtener historial del cliente:', error);
        res.status(500).json({ message: 'Error al obtener el historial de pagos', error: error.message });
    }
});
// Obtener resumen de cobros filtrado por mes y año
router.get('/mensual/:anio/:mes', async (req, res) => {
    try {
        const { anio, mes } = req.params;
        
        // Definir inicio y fin del mes seleccionado
        const inicioMes = new Date(Number(anio), Number(mes) - 1, 1, 0, 0, 0);
        const finMes = new Date(Number(anio), Number(mes), 0, 23, 59, 59, 999);

        // Buscar en la base de datos los pagos dentro de este rango de fechas
        const pagos = await Payment.find({
            fechaPago: { $gte: inicioMes, $lte: finMes }
        }).populate('clientId', 'nombre');

        let totalRecaudado = 0;
        let totalInteres = 0;
        let totalCapital = 0;

        pagos.forEach(pago => {
            totalRecaudado += Number(pago.monto || pago.montoPagado || 0);
            totalInteres += Number(pago.montoInteres || 0);
            totalCapital += Number(pago.montoCapital || 0);
        });

        res.json({
            anio,
            mes,
            cantidadPagos: pagos.length,
            totalRecaudado,
            totalInteres,
            totalCapital,
            pagos
        });
    } catch (err) {
        res.status(500).json({ mensaje: 'Error al consultar cobros mensuales', error: err.message });
    }
});
module.exports = router;