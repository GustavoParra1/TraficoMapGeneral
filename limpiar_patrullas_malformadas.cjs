// Script para eliminar documentos malformados de patrullas
const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase
const serviceAccountPath = path.join(__dirname, 'functions', 'trafico-map-general-v2-firebase-adminsdk-fbsvc-c8f1cfe957.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://trafico-map-general-v2.firebaseio.com'
  });
}

const db = admin.firestore();

async function limpiarPatullasMalformadas() {
  try {
    console.log('🧹 Iniciando limpieza de patrullas...\n');

    // 1. Eliminar de clientes/laplata/patrullas (documentos malformados)
    console.log('📍 Limpiando clientes/laplata/patrullas/...');
    const clienteId = 'laplata';
    const coleccionCliente = `clientes/${clienteId}/patrullas`;
    
    const docsClienteAEliminar = [
      'PATRULLA_PATRULLA_070',
      'PATRULLA_PATRULLA_90'
    ];

    for (const docId of docsClienteAEliminar) {
      try {
        await db.collection(coleccionCliente).doc(docId).delete();
        console.log(`  ✅ Eliminado: ${coleccionCliente}/${docId}`);
      } catch (err) {
        console.error(`  ❌ Error eliminando ${docId}:`, err.message);
      }
    }

    // 2. Eliminar TODA la colección patrullas_laplata (legado, no se usa más)
    console.log('\n📍 Limpiando patrullas_laplata/ (colección legada)...');
    const coleccionGlobal = 'patrullas_laplata';
    const snapshot = await db.collection(coleccionGlobal).get();
    
    if (snapshot.empty) {
      console.log('  ℹ️ La colección ya está vacía');
    } else {
      for (const doc of snapshot.docs) {
        try {
          await db.collection(coleccionGlobal).doc(doc.id).delete();
          console.log(`  ✅ Eliminado: ${coleccionGlobal}/${doc.id}`);
        } catch (err) {
          console.error(`  ❌ Error eliminando ${doc.id}:`, err.message);
        }
      }
    }

    console.log('\n✅ Limpieza completada');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error en limpieza:', error);
    process.exit(1);
  }
}

limpiarPatullasMalformadas();
