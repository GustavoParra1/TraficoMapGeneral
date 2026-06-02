// Script para eliminar documentos malformados de patrullas
const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase
const serviceAccountPath = path.join(__dirname, 'trafico-map-general-v2-firebase-adminsdk.json');
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
    console.log('🧹 Iniciando limpieza de patrullas malformadas...\n');

    const clienteId = 'laplata';
    const coleccion = `clientes/${clienteId}/patrullas`;

    // Documentos malformados a eliminar
    const docsAEliminar = [
      'PATRULLA_PATRULLA_070',
      'PATRULLA_PATRULLA_90'
    ];

    for (const docId of docsAEliminar) {
      try {
        await db.collection(coleccion).doc(docId).delete();
        console.log(`✅ Eliminado: ${coleccion}/${docId}`);
      } catch (err) {
        console.error(`❌ Error eliminando ${docId}:`, err.message);
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
