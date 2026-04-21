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

async function cleanAndCreate() {
  console.log('🗑️ Limpiando patrullas antiguas...\n');

  // Limpiar
  const colecciones = ['patrullas_mardelplata', 'patrullas_cordoba'];
  for (const coleccion of colecciones) {
    const snapshot = await db.collection(coleccion).get();
    for (const doc of snapshot.docs) {
      await db.collection(coleccion).doc(doc.id).delete();
    }
  }

  console.log('✅ Limpieza completa\n');
  console.log('🚀 Creando patrullas con números...\n');

  // Córdoba - 3 patrullas
  const cordobaPatrullas = [
    {
      id: 'patrulla-01',
      nombre: 'Centro',
      lat: -31.4201,
      lng: -64.1888,
      online: true,
      velocidad: 25,
      heading: 45,
      emergencia: false,
      createdAt: new Date()
    },
    {
      id: 'patrulla-02',
      nombre: 'Norte',
      lat: -31.41,
      lng: -64.18,
      online: true,
      velocidad: 0,
      heading: 0,
      emergencia: false,
      createdAt: new Date()
    },
    {
      id: 'patrulla-03',
      nombre: 'Sur',
      lat: -31.43,
      lng: -64.19,
      online: true,
      velocidad: 35,
      heading: 180,
      emergencia: false,
      createdAt: new Date()
    }
  ];

  // Mar del Plata - 2 patrullas
  const mdpPatrullas = [
    {
      id: 'patrulla-01',
      nombre: 'Centro',
      lat: -38.0,
      lng: -57.55,
      online: true,
      velocidad: 20,
      heading: 90,
      emergencia: false,
      createdAt: new Date()
    },
    {
      id: 'patrulla-02',
      nombre: 'Balneario',
      lat: -38.0,
      lng: -57.54,
      online: true,
      velocidad: 15,
      heading: 0,
      emergencia: false,
      createdAt: new Date()
    }
  ];

  console.log('📍 CÓRDOBA');
  for (const patrulla of cordobaPatrullas) {
    try {
      await db.collection('patrullas_cordoba').doc(patrulla.id).set(patrulla);
      console.log(`  ✅ ${patrulla.id} - ${patrulla.nombre}`);
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n📍 MAR DEL PLATA');
  for (const patrulla of mdpPatrullas) {
    try {
      await db.collection('patrullas_mardelplata').doc(patrulla.id).set(patrulla);
      console.log(`  ✅ ${patrulla.id} - ${patrulla.nombre}`);
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n✅ Patrullas creadas con números en los IDs');
  process.exit(0);
}

cleanAndCreate().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
