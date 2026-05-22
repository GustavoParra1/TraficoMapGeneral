// Script para limpiar patrullas de prueba en Firestore
// Ejecutar con Node.js: node limpiar_patrullas_laplata.js

const admin = require('firebase-admin');
const serviceAccount = require('./trafico-map-general-v2-firebase-adminsdk-fbsvc-014247ac02.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function limpiarPatrullasLaplata() {
  const coleccion = 'patrullas_laplata';
  const snapshot = await db.collection(coleccion).get();
  const docs = snapshot.docs;
  const patentesPermitidas = ['AA000']; // Solo dejar la patrulla real

  for (const doc of docs) {
    if (!patentesPermitidas.includes(doc.id)) {
      console.log('Eliminando patrulla de prueba:', doc.id);
      await db.collection(coleccion).doc(doc.id).delete();
    } else {
      console.log('Manteniendo patrulla real:', doc.id);
    }
  }
  console.log('Limpieza completada.');
  process.exit(0);
}

limpiarPatrullasLaplata().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
