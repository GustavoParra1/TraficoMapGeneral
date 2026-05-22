// Script para unificar patrullas duplicadas en Firestore (por ejemplo, PATRULLA_20 y patrulla_20)
// Ejecutar con Node.js y tener credenciales de admin SDK

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Ajusta el path si es necesario

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Configura tu ciudad aquí:
const municipio = 'mardelplata'; // Cambia por el municipio correcto
const coleccion = `patrullas_${municipio}`;

async function unifyPatrullas() {
  const snapshot = await db.collection(coleccion).get();
  const patrullas = {};

  snapshot.forEach(doc => {
    const idNorm = doc.id.toUpperCase();
    if (!patrullas[idNorm]) {
      patrullas[idNorm] = [];
    }
    patrullas[idNorm].push(doc);
  });

  for (const idNorm in patrullas) {
    if (patrullas[idNorm].length > 1) {
      console.log(`Encontradas duplicadas para ${idNorm}:`, patrullas[idNorm].map(d => d.id));
      // Mantener la primera, migrar datos si es necesario
      const keep = patrullas[idNorm][0];
      for (let i = 1; i < patrullas[idNorm].length; i++) {
        const del = patrullas[idNorm][i];
        // Opcional: migrar datos de del a keep aquí
        await db.collection(coleccion).doc(del.id).delete();
        console.log(`Eliminada duplicada: ${del.id}`);
      }
    }
  }
  console.log('Unificación terminada.');
}

unifyPatrullas().then(() => process.exit(0));
