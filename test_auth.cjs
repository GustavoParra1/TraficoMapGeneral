const admin = require('firebase-admin');
const serviceAccount = require('./trafico-map-general-v2-firebase-adminsdk-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  try {
    const coleccion = 'patrullas_laplata';
    console.log('Buscando en:', coleccion);
    const snapshot = await db.collection(coleccion).get();
    console.log('Documentos encontrados:', snapshot.size);
    let eliminadas = 0;
    for (const doc of snapshot.docs) {
      if (!/^PATRULLA_/.test(doc.id)) {
        await doc.ref.delete();
        eliminadas++;
      }
    }
    console.log('Eliminados:', eliminadas);
  } catch (e) {
    console.error('Error durante la ejecucion:', e.message);
  }
}

run();
