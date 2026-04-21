import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

const serviceAccountPath = join('.', 'serviceAccountKey.json');

try {
  const serviceAccountData = readFileSync(serviceAccountPath, 'utf8');
  const serviceAccount = JSON.parse(serviceAccountData);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'trafico-map-general-v2'
  });
} catch (error) {
  console.error('❌ Error: No se encontró serviceAccountKey.json');
  process.exit(1);
}

const db = admin.firestore();

async function cleanPatrullas() {
  console.log('🗑️ Limpiando patrullas antiguas...\n');

  const colecciones = ['patrullas_mardelplata', 'patrullas_cordoba'];

  for (const coleccion of colecciones) {
    try {
      const snapshot = await db.collection(coleccion).get();
      console.log(`\n📍 ${coleccion}: Eliminando ${snapshot.size} documentos`);
      
      for (const doc of snapshot.docs) {
        await db.collection(coleccion).doc(doc.id).delete();
        console.log(`  🗑️  ${doc.id}`);
      }
    } catch (error) {
      console.error(`❌ Error en ${coleccion}: ${error.message}`);
    }
  }

  console.log('\n✅ Limpieza completada');
  process.exit(0);
}

cleanPatrullas().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
