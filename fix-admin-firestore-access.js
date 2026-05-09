#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Buscar el archivo de credenciales de Firebase
const credentialPath = path.join(__dirname, 'trafico-map-general-v2-firebase-adminsdk-xyzab-abcdef123456.json');

if (!fs.existsSync(credentialPath)) {
  console.log('❌ Archivo de credenciales no encontrado');
  console.log('   Por favor, descárgalo de Firebase Console:');
  console.log('   1. Ve a Project Settings → Service Accounts');
  console.log('   2. Haz click en "Generate New Private Key"');
  console.log('   3. Colócalo en:', credentialPath);
  process.exit(1);
}

try {
  const serviceAccount = require(credentialPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'trafico-map-general-v2'
  });

  const auth = admin.auth();
  const db = admin.firestore();

  async function fixAdminAccess() {
    try {
      console.log('🔧 Configurando acceso del admin a Firestore...\n');

      // 1. Obtener el user del admin
      console.log('1️⃣ Buscando admin@trafico-map.com...');
      const adminUser = await auth.getUserByEmail('admin@trafico-map.com');
      console.log(`✅ Admin encontrado: ${adminUser.uid}`);

      // 2. Verificar y asignar custom claims si es necesario
      console.log('\n2️⃣ Verificando custom claims...');
      const currentClaims = adminUser.customClaims || {};
      console.log(`   Claims actuales:`, JSON.stringify(currentClaims, null, 2));

      if (currentClaims.role !== 'admin') {
        console.log('   ⚠️ El admin no tiene role=admin. Asignando...');
        await auth.setCustomUserClaims(adminUser.uid, {
          ...currentClaims,
          role: 'admin'
        });
        console.log('   ✅ Role admin asignado');
      } else {
        console.log('   ✅ Ya tiene role=admin');
      }

      // 3. Intentar leer clientes para verificar Firestore access
      console.log('\n3️⃣ Verificando acceso a Firestore...');
      try {
        const clientesSnapshot = await db.collection('clientes').get();
        console.log(`✅ Firestore access funcionando. Clientes: ${clientesSnapshot.size}`);
        
        clientesSnapshot.forEach((doc) => {
          console.log(`   - ${doc.id}: ${doc.data().nombre} (${doc.data().estado})`);
        });
      } catch (err) {
        if (err.message.includes('Missing or insufficient permissions')) {
          console.log('❌ Error: Las Firestore Security Rules no permiten lectura');
          console.log('   Solución: Vuelve a abrir `/admin/` en 30 segundos después de actualizar las rules');
        } else {
          throw err;
        }
      }

      console.log('\n✅ Configuración completada');

    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    } finally {
      process.exit(0);
    }
  }

  fixAdminAccess();

} catch (error) {
  console.error('❌ Error cargando credenciales:', error.message);
  process.exit(1);
}
