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

async function listPatrullas() {
  console.log('📋 Listando todas las patrullas en Firestore...\n');

  const ciudades = ['mardelplata', 'cordoba', 'san-martin-del-mar'];
  
  for (const ciudad of ciudades) {
    const coleccion = `patrullas_${ciudad}`;
    
    try {
      const snapshot = await db.collection(coleccion).get();
      
      console.log(`\n📍 ${ciudad.toUpperCase()}: ${snapshot.size} patrullas`);
      console.log('='.repeat(60));
      
      if (snapshot.empty) {
        console.log('  (ninguna patrulla)');
      } else {
        snapshot.forEach(doc => {
          const data = doc.data();
          console.log(`\n  🚗 ID: ${doc.id}`);
          console.log(`     Nombre: ${data.nombre || 'N/A'}`);
          console.log(`     Online: ${data.online ? '🟢 SÍ' : '🔴 NO'}`);
          console.log(`     Ubicación: [${data.lat}, ${data.lng}]`);
          console.log(`     Velocidad: ${data.velocidad || 0} km/h`);
          console.log(`     Creada: ${data.createdAt ? new Date(data.createdAt.toDate()).toLocaleString('es-AR') : 'N/A'}`);
        });
      }
    } catch (error) {
      console.error(`❌ Error en ${coleccion}: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Listado completado');
  process.exit(0);
}

listPatrullas().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
