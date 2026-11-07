const mongoose = require('mongoose');
require('dotenv').config();

async function limpiar() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectado a Atlas para limpieza...');
    
    const buenas = ['Clientes', 'Préstamos', 'Pagos', 'CajaConfig', 'CierreCaja', 'Gastos', 'SolicitudAsesor', 'asesores'];
    const cols = await mongoose.connection.db.listCollections().toArray();
    
    for (let col of cols) {
      if (!buenas.includes(col.name)) {
        await mongoose.connection.db.dropCollection(col.name);
        console.log(`> Eliminada: ${col.name}`);
      } else {
        console.log(`(Protegida): ${col.name}`);
      }
    }
    
    console.log('¡Base de datos limpia y protegida!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

limpiar();