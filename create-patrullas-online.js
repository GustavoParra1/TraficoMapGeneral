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

// Patrullas ONLINE para Córdoba
const PATRULLAS_CORDOBA = [
  {
    id: 'patrulla-01',
    nombre: 'Patrulla 01 - Centro',
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
    nombre: 'Patrulla 02 - Norte',
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
    nombre: 'Patrulla 03 - Sur',
    lat: -31.43,
    lng: -64.19,
    online: true,
    velocidad: 35,
    heading: 180,
    emergencia: false,
    createdAt: new Date()
  }
];

// Patrullas ONLINE para Mar del Plata
const PATRULLAS_MARDELPLATA = [
  {
    id: 'patrulla-01',
    nombre: 'Patrulla 01 - Centro',
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
    nombre: 'Patrulla 02 - Balneario',
    lat: -38.0,
    lng: -57.54,
    online: true,
    velocidad: 15,
    heading: 0,
    emergencia: false,
    createdAt: new Date()
  }
];

async function createPatrullas() {
  console.log('🚀 Creando patrullas ONLINE...\n');

  // Córdoba
  console.log('📍 CÓRDOBA');
  for (const patrulla of PATRULLAS_CORDOBA) {
    try {
      await db.collection('patrullas_cordoba').doc(patrulla.id).set(patrulla, { merge: true });
      console.log(`  ✅ ${patrulla.nombre} (ONLINE)`);
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  // Mar del Plata
  console.log('\n📍 MAR DEL PLATA');
  for (const patrulla of PATRULLAS_MARDELPLATA) {
    try {
      await db.collection('patrullas_mardelplata').doc(patrulla.id).set(patrulla, { merge: true });
      console.log(`  ✅ ${patrulla.nombre} (ONLINE)`);
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
