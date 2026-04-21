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

// Actualizar nombres de patrullas de prueba
const updates = {
  'patrullas_cordoba': {
    'patrulla-01': { nombre: 'Centro' },
    'patrulla-02': { nombre: 'Norte' },
    'patrulla-03': { nombre: 'Sur' }
  },
  'patrullas_mardelplata': {
    'patrulla-01': { nombre: 'Centro' },
    'patrulla-02': { nombre: 'Balneario' }
  }
};

async function updatePatrullas() {
  console.log('🔄 Actualizando nombres de patrullas...\n');

  for (const [coleccion, patrullas] of Object.entries(updates)) {
    console.log(`📍 ${coleccion}`);
    
    for (const [docId, updateData] of Object.entries(patrullas)) {
      try {
        await db.collection(coleccion).doc(docId).update(updateData);
        console.log(`  ✅ ${docId} → ${updateData.nombre}`);
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
      }
    }
  }

  console.log('\n✅ Actualización completada');
  process.exit(0);
}

updatePatrullas().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
