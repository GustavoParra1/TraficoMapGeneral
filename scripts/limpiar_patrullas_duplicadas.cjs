// Script para limpiar patrullas duplicadas en Firestore
// Elimina el documento con nombre en mayúsculas si existe uno igual en minúsculas

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // Debes descargar tu clave de servicio

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const MUNICIPIO = 'laplata'; // Cambia por el municipio que corresponda
const COLECCION = `patrullas_${MUNICIPIO}`;

async function limpiarDuplicados() {
  const snapshot = await db.collection(COLECCION).get();
  const docs = {};

  snapshot.forEach(doc => {
    const id = doc.id;
    const idLower = id.toLowerCase();
    if (!docs[idLower]) docs[idLower] = [];
    docs[idLower].push(id);
  });

  let eliminados = 0;
  for (const ids of Object.values(docs)) {
    if (ids.length > 1) {
      // Mantener solo el primero en minúsculas, eliminar los otros
      const keep = ids.find(x => x === x.toLowerCase()) || ids[0];
      for (const id of ids) {
        if (id !== keep) {
          await db.collection(COLECCION).doc(id).delete();
          console.log(`Eliminado duplicado: ${id}`);
          eliminados++;
        }
      }
    }
  }
  console.log(`Listo. Eliminados: ${eliminados}`);
}

limpiarDuplicados().then(() => process.exit(0));
