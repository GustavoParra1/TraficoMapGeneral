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

async function deleteTestPatrullas() {
  console.log('🗑️ Eliminando patrullas de prueba...\n');

  // Patrullas de prueba a eliminar
  const testPatrullas = [
    { coleccion: 'patrullas_cordoba', id: 'patrulla-cordoba-01' },
    { coleccion: 'patrullas_cordoba', id: 'patrulla-cordoba-02' },
    { coleccion: 'patrullas_mardelplata', id: 'patrulla-mardelplata-01' },
    { coleccion: 'patrullas_mardelplata', id: 'patrulla-mardelplata-02' },
    { coleccion: 'patrullas_san-martin-del-mar', id: 'patrulla-sanmartin-01' }
  ];

  let eliminadas = 0;

  for (const patrulla of testPatrullas) {
    try {
      const docRef = db.collection(patrulla.coleccion).doc(patrulla.id);
      const docSnapshot = await docRef.get();
      
      if (docSnapshot.exists) {
        await docRef.delete();
        console.log(`✅ Eliminada: ${patrulla.coleccion}/${patrulla.id}`);
        eliminadas++;
      } else {
        console.log(`⏭️  No existe: ${patrulla.coleccion}/${patrulla.id}`);
      }
    } catch (error) {
      console.error(`❌ Error en ${patrulla.coleccion}/${patrulla.id}: ${error.message}`);
    }
  }

  console.log(`\n✅ Proceso completado - ${eliminadas} patrullas eliminadas`);
  process.exit(0);
}

deleteTestPatrullas().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
