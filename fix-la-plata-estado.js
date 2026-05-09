#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Buscar credenciales
const credentialPath = path.join(__dirname, 'trafico-map-general-v2-firebase-adminsdk-xyzab-abcdef123456.json');

if (!fs.existsSync(credentialPath)) {
  console.log('❌ Credenciales no encontradas');
  console.log('Descárgalas de: Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}

const serviceAccount = require(credentialPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'trafico-map-general-v2'
});

const db = admin.firestore();

async function fixLaPlata() {
  try {
    console.log('🔧 Reparando estado de La Plata...\n');

    const laPlataRef = db.collection('clientes').doc('laplatamaps-52a3b');
    
    // Leer estado actual
    const laPlataDoc = await laPlataRef.get();
    
    if (!laPlataDoc.exists) {
      console.log('❌ La Plata no encontrada en Firestore');
      process.exit(1);
    }

    const currentData = laPlataDoc.data();
    console.log('📋 Estado actual de La Plata:');
    console.log(`   - nombre: ${currentData.nombre}`);
    console.log(`   - estado: ${currentData.estado}`);
    console.log(`   - plan: ${currentData.plan}`);
    console.log(`   - suscripcion.estado: ${currentData.suscripcion?.estado}`);

    if (currentData.estado === 'activo') {
      console.log('\n✅ La Plata ya está ACTIVO. No hay cambios necesarios.');
      process.exit(0);
    }

    // Cambiar a activo
    console.log('\n🔄 Cambiando estado a "activo"...');
    
    await laPlataRef.update({
      estado: 'activo',
      updated_at: new Date().toISOString()
    });

    console.log('✅ Estado actualizado a: ACTIVO');
    
    // Verificar cambio
    const updatedDoc = await laPlataRef.get();
    console.log('\n📋 Nuevo estado:');
    console.log(`   - estado: ${updatedDoc.data().estado}`);
    console.log(`   - updated_at: ${updatedDoc.data().updated_at}`);

    console.log('\n✅ REPARACIÓN COMPLETADA');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Recarga el admin panel (F5)');
    console.log('   2. Deberías ver "La Plata" en la lista de clientes');
    console.log('   3. Intenta acceder como cliente en /client/');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixLaPlata();
