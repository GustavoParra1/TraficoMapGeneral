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

    const clienteId = 'laplatamaps-52a3b';
    const email = 'admin@laplatamaps.com.ar';

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
      
      // Credenciales de Firebase del cliente
      firebase_cliente: {
        apiKey: 'AIzaSyAY2jYGrXdwv3eyH19r8p7sw7iy5V5ApXg',
        authDomain: 'laplatamaps-52a3b.firebaseapp.com',
        projectId: 'laplatamaps-52a3b',
        storageBucket: 'laplatamaps-52a3b.firebasestorage.app',
        messagingSenderId: '9948736453',
        appId: '1:9948736453:web:0f607caf88bb9478bdf9ac',
        databaseURL: 'https://laplatamaps-52a3b-default-rtdb.firebaseio.com'
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
    console.log(`   Firebase Project: laplatamaps-52a3b`);
    console.log('\n🔑 Credenciales de Firebase guardadas en Firestore');
    console.log('\n🎯 PRÓXIMO PASO:');
    console.log('   1. Entra en: https://trafico-map-general-v2.web.app/client/');
    console.log(`   2. Email: ${email}`);
    console.log('   3. Contraseña: (la que creaste en laplatamaps-52a3b)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupTestCliente();
