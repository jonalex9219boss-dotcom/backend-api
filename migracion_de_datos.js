const mongoose = require('mongoose');

const MONGO_LOCAL = 'mongodb://127.0.0.1:27017/sistema_prestamos';
const MONGO_ATLAS = 'mongodb+srv://jonalex9219boss_db_user:6BXglyziwbcUNDGv@cluster0.v5peubx.mongodb.net/sistema-prestamos?retryWrites=true&w=majority';

async function migrarDefinitivo() {
    try {
        console.log("Conectando a la base de datos local correcta (sistema_prestamos)...");
        const connLocal = await mongoose.createConnection(MONGO_LOCAL).asPromise();
        
        const collections = await connLocal.db.collections();
        const datos = {};
        
        for (let collection of collections) {
            const name = collection.collectionName;
            const documentos = await connLocal.db.collection(name).find({}.toArray?.() || {}).toArray();
            datos[name] = documentos;
            console.log(`> Encontrados ${documentos.length} documentos en la colección local: "${name}"`);
        }
        await connLocal.close();

        console.log("\nConectando a MongoDB ATLAS (Nube) para subirlos...");
        const connAtlas = await mongoose.createConnection(MONGO_ATLAS).asPromise();
        
        for (let name in datos) {
            if (datos[name].length > 0) {
                // Borramos lo que hubiera antes en Atlas para evitar duplicados y subimos los reales
                await connAtlas.db.collection(name).deleteMany({});
                await connAtlas.db.collection(name).insertMany(datos[name]);
                console.log(`✅ ¡Éxito! Subidos ${datos[name].length} documentos reales a la nube en la colección: "${name}"`);
            } else {
                console.log(`⚠️ La colección local "${name}" estaba vacía.`);
            }
        }
        
        await connAtlas.close();
        console.log("\n🚀 ¡Ahora sí, migración completada con éxito total, compite!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error durante la migración:", error);
        process.exit(1);
    }
}

migrarDefinitivo();