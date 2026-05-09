#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Buscar credenciales
let credentialPath = path.join(__dirname, 'trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json');

if (!fs.existsSync(credentialPath)) {
  const downloadPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads', 'trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json');
  if (fs.existsSync(downloadPath)) {
    credentialPath = downloadPath;
  }
}

if (!fs.existsSync(credentialPath)) {
  console.log('❌ Credenciales no encontradas');
  process.exit(1);
}

const serviceAccount = require(credentialPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'trafico-map-general-v2'
});

const auth = admin.auth();
const db = admin.firestore();

async function fixAdminPanel() {
  try {
    console.log('🔧 REPARANDO ADMIN PANEL\n');

    // 1. Verificar y arreglar claims del admin
    console.log('1️⃣ Verificando admin@trafico-map.com...');
    const adminUser = await auth.getUserByEmail('admin@trafico-map.com');
    console.log(`   UID: ${adminUser.uid}`);
    console.log(`   Claims actuales:`, adminUser.customClaims);

    const requiredClaims = { role: 'admin' };
    const currentClaims = adminUser.customClaims || {};
    
    if (currentClaims.role !== 'admin') {
      console.log('   ❌ Claims incorrectos. Asignando...');
      await auth.setCustomUserClaims(adminUser.uid, requiredClaims);
      console.log('   ✅ Claims actualizados');
    } else {
      console.log('   ✅ Claims OK');
    }

    // 2. Verificar acceso a clientes
    console.log('\n2️⃣ Probando acceso a clientes en Firestore...');
    try {
      const clientesSnapshot = await db.collection('clientes').get();
      console.log(`   ✅ Acceso OK - ${clientesSnapshot.size} clientes encontrados:`);
      clientesSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`      - ${data.nombre} (${doc.id}) - Estado: ${data.estado}`);
      });
    } catch (err) {
      if (err.message.includes('Missing or insufficient permissions')) {
        console.log('   ❌ ERROR DE PERMISOS EN FIRESTORE');
        console.log('   Necesitas actualizar las Firestore Rules');
        console.log('\n   Las rules deben permitir:');
        console.log('   match /clientes/{document=**} {');
        console.log('     allow read, write: if isAdmin();');
        console.log('   }');
      } else {
        throw err;
      }
    }

    // 3. Verificar La Plata
    console.log('\n3️⃣ Verificando La Plata...');
    const laPlataDoc = await db.collection('clientes').doc('laplatamaps-52a3b').get();
    if (laPlataDoc.exists) {
      const data = laPlataDoc.data();
      console.log(`   ✅ Encontrada`);
      console.log(`      - Nombre: ${data.nombre}`);
      console.log(`      - Estado: ${data.estado}`);
      console.log(`      - Plan: ${data.plan}`);
    } else {
      console.log('   ❌ No encontrada');
    }

    console.log('\n✅ DIAGNÓSTICO COMPLETADO\n');
    console.log('📝 PRÓXIMOS PASOS:');
    console.log('   1. Cierra completamente el navegador');
    console.log('   2. Borra cookies/caché (o usa ventana incógnita)');
    console.log('   3. Intenta login en /admin/ con admin@trafico-map.com');
    console.log('   4. Si sigue fallando, comparte los errores de la consola');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAdminPanel();
