#!/usr/bin/env node
/**
 * Script para crear/actualizar usuario cliente en Firebase Auth
 * Uso: node setup-client-user.js <email> <password>
 */

import admin from 'firebase-admin';
import fs from 'fs';
import { readFileSync } from 'fs';

// Cargar credenciales
const serviceAccountPath = './service-account-key.json';

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: Falta service-account-key.json');
  console.log('📝 Descárgalo desde: Firebase Console → Settings → Service Accounts → Generate new private key');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://trafico-map-general-v2.firebaseio.com'
});

const auth = admin.auth();
const db = admin.firestore();

// Obtener parámetros
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('\n📖 USO:');
  console.log('   node setup-client-user.js <email> <password>\n');
  console.log('📝 EJEMPLO:');
  console.log('   node setup-client-user.js admin@laplatamaps.com.ar "MiContraseña123!"');
  console.log();
  process.exit(1);
}

async function setupClientUser() {
  try {
    console.log(`\n🔐 Configurando usuario cliente: ${email}`);
    console.log(`📝 Contraseña: ${password}\n`);

    // Buscar si el usuario existe
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log(`✅ Usuario existente encontrado (UID: ${user.uid})`);
      console.log(`📝 Actualizando contraseña...`);
      
      // Actualizar contraseña
      await auth.updateUser(user.uid, {
        password: password
      });
      console.log(`✅ Contraseña actualizada`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`👤 Usuario no existe. Creando nuevo...`);
        
        user = await auth.createUser({
          email: email,
          password: password,
          displayName: `Cliente - ${email.split('@')[0]}`,
          emailVerified: false
        });
        
        console.log(`✅ Usuario creado (UID: ${user.uid})`);
      } else {
        throw error;
      }
    }

    // Buscar cliente en Firestore por email
    console.log(`\n🔍 Buscando cliente en Firestore...`);
    const clientesRef = db.collection('clientes');
    const snapshot = await clientesRef.where('email', '==', email).get();

    if (snapshot.empty) {
      console.warn(`⚠️  Cliente no encontrado en Firestore`);
      console.log(`   Asegúrate de que el cliente fue creado desde el admin panel`);
      process.exit(1);
    }

    const clientDoc = snapshot.docs[0];
    const clienteId = clientDoc.id;
    const clientData = clientDoc.data();

    console.log(`✅ Cliente encontrado: ${clientData.nombre} (ID: ${clienteId})`);

    // Crear entrada en usuarios_clientes
    console.log(`\n👤 Registrando en usuarios_clientes...`);
    await db.collection('usuarios_clientes').doc(user.uid).set({
      uid: user.uid,
      email: email,
      cliente_id: clienteId,
      role: 'client',
      created_at: new Date(),
      activo: true
    });
    console.log(`✅ Usuario registrado en Firestore`);

    // Actualizar cliente con UID
    console.log(`\n🔗 Asociando usuario con cliente...`);
    await db.collection('clientes').doc(clienteId).update({
      usuario_uid: user.uid
    });
    console.log(`✅ Cliente actualizado`);

    // Establecer custom claims (requiere Admin SDK)
    console.log(`\n⚙️  Estableciendo custom claims...`);
    await auth.setCustomUserClaims(user.uid, {
      role: 'client',
      cliente_id: clienteId,
      email: email
    });
    console.log(`✅ Custom claims establecidos`);

    // Resumen final
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ ¡USUARIO CONFIGURADO EXITOSAMENTE!\n`);
    console.log(`📧 Email:      ${email}`);
    console.log(`🔑 Contraseña: ${password}`);
    console.log(`🆔 UID:        ${user.uid}`);
    console.log(`🏛️  Cliente:    ${clientData.nombre}`);
    console.log(`\n🌐 Panel del Cliente: https://trafico-map-general-v2.web.app/client/\n`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Cerrar Firebase
    await admin.app().delete();
  }
}

// Ejecutar
setupClientUser();
