/**
 * Script para crear cliente de prueba manualmente en Firestore
 * Ejecutar: node setup-test-cliente.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'trafico-map-general-v2'
});

const db = admin.firestore();
const auth = admin.auth();

async function setupTestCliente() {
  try {
    console.log('🚀 Creando cliente de prueba La Plata...\n');

    const clienteId = 'laplata';
    const email = 'admin@laplata.com';

    // PASO 1: Crear documento cliente en Firestore
    console.log('📝 PASO 1: Creando documento cliente...');
    const datosCliente = {
      id: clienteId,
      nombre: 'La Plata',
      email: email,
      plan: 'profesional',
      estado: 'activo',
      ciudad: 'La Plata',
      telefono: '+54 221 123-4567',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // ⭐ CREDENCIALES DE FIREBASE COMPARTIDAS (trafico-map-general-v2)
      // Todos los clientes usan el mismo Firebase pero datos aislados en clientes/{clienteId}
      firebase_cliente: {
        apiKey: 'AIzaSyCkYYx5n-gKaKtTqOv2R1Glz1D_TA_Y5KA',
        authDomain: 'trafico-map-general-v2.firebaseapp.com',
        projectId: 'trafico-map-general-v2',
        storageBucket: 'trafico-map-general-v2.firebasestorage.app',
        messagingSenderId: '540631719751',
        appId: '1:540631719751:web:bd410f1bbee18e9fabb662',
        databaseURL: 'https://trafico-map-general-v2-default-rtdb.firebaseio.com'
      },
      
      suscripcion: {
        plan: 'profesional',
        estado: 'activo',
        expiration_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
      }
    };

    await db.collection('clientes').doc(clienteId).set(datosCliente);
    console.log('✅ Cliente guardado en Firestore\n');

    // PASO 2: Crear usuario en Firebase Auth
    console.log('🔐 PASO 2: Creando usuario en Firebase Auth...');
    let userAdmin;
    try {
      userAdmin = await auth.createUser({
        email: email,
        displayName: 'Admin La Plata',
        disabled: false
      });
      console.log(`✅ Usuario creado: ${email}`);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log(`⚠️ Usuario ya existe, obteniendo UID...`);
        userAdmin = await auth.getUserByEmail(email);
      } else {
        throw error;
      }
    }

    // PASO 3: Asignar custom claims
    console.log('\n🏷️ PASO 3: Asignando custom claims...');
    await auth.setCustomUserClaims(userAdmin.uid, {
      role: 'admin',
      cliente_id: clienteId
    });
    console.log(`✅ Custom claims asignados: cliente_id=${clienteId}\n`);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ CLIENTE CREADO EXITOSAMENTE\n');
    console.log('📋 Datos del cliente:');
    console.log(`   ID: ${clienteId}`);
    console.log(`   Nombre: La Plata`);
    console.log(`   Email: ${email}`);
    console.log(`   Plan: Profesional`);
    console.log(`   Firebase Project: trafico-map-general-v2 (Compartido)`);
    console.log('\n🔑 Credenciales de Firebase guardadas en Firestore');
    console.log('\n🎯 PRÓXIMO PASO:');
    console.log('   1. Entra en: https://trafico-map-general-v2.web.app/client/');
    console.log(`   2. Email: ${email}`);
    console.log('   3. Contraseña: (la que asignaste)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupTestCliente();
