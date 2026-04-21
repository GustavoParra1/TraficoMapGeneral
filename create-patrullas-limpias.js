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

async function createPatrullas() {
  console.log('🚀 Creando patrullas limpias...\n');

  // Córdoba - 3 patrullas
  const cordobaPatrullas = [
    {
      id: 'centro',
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
      id: 'norte',
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
      id: 'sur',
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
      id: 'centro',
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
      id: 'balneario',
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
      console.log(`  ✅ ${patrulla.nombre}`);
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n📍 MAR DEL PLATA');
  for (const patrulla of mdpPatrullas) {
    try {
      await db.collection('patrullas_mardelplata').doc(patrulla.id).set(patrulla);
      console.log(`  ✅ ${patrulla.nombre}`);
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n✅ Patrullas creadas exitosamente');
  process.exit(0);
}

createPatrullas().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
