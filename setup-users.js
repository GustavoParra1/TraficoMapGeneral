/**
 * Crear usuarios de demostración en Firebase Authentication
 * Ejecutar: node setup-users.js
 * 
 * IMPORTANTE: Necesitas descargar tu clave de servicio de Firebase primero
 * https://console.firebase.google.com -> Project Settings -> Service Accounts -> Generate new private key
 */

const admin = require('firebase-admin');
const path = require('path');

// Cargar la clave de servicio (descargada de Firebase)
// Guarda el archivo en: ./serviceAccountKey.json
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'trafico-map-general-v2'
  });
} catch (error) {
  console.error('❌ Error: No se encontró serviceAccountKey.json');
  console.error('Por favor:');
  console.error('1. Ve a https://console.firebase.google.com');
  console.error('2. Project Settings -> Service Accounts');
  console.error('3. Generate new private key');
  console.error('4. Guarda el archivo como serviceAccountKey.json en este directorio');
  process.exit(1);
}

const auth = admin.auth();

// Usuarios a crear
const DEMO_USERS = [
  // Patrullas
  {
    email: 'patrulla1@seguridad-mdp.com',
    password: 'patrulla123',
    displayName: 'Patrulla 01',
    role: 'patrulla'
  },
  {
    email: 'patrulla2@seguridad-mdp.com',
    password: 'patrulla123',
    displayName: 'Patrulla 02',
    role: 'patrulla'
  },
  {
    email: 'patrulla3@seguridad-mdp.com',
    password: 'patrulla123',
    displayName: 'Patrulla 03',
    role: 'patrulla'
  },
  {
    email: 'patrulla4@seguridad-mdp.com',
    password: 'patrulla123',
    displayName: 'Patrulla 04',
    role: 'patrulla'
  },
  // Operadores - Capa Norte
  {
    email: 'capa-norte@seguridad-mdp.com',
    password: 'control123',
    displayName: 'Operador Capa Norte',
    role: 'operador'
  },
  // Operadores - Capa Sur
  {
    email: 'capa-sur@seguridad-mdp.com',
    password: 'control123',
    displayName: 'Operador Capa Sur',
    role: 'operador'
  },
  // Otros operadores
  {
    email: 'mac@seguridad-mdp.com',
    password: 'control123',
    displayName: 'MAC Operador',
    role: 'operador'
  },
  {
    email: 'uppl@seguridad-mdp.com',
    password: 'control123',
    displayName: 'UPPL Operador',
    role: 'operador'
  },
  {
    email: 'multiagencia@seguridad-mdp.com',
    password: 'control123',
    displayName: 'Multi-agencia Operador',
    role: 'operador'
  },
  {
    email: 'encargado-sala@seguridad-mdp.com',
    password: 'control123',
    displayName: 'Encargado de Sala',
    role: 'operador'
  },
  // Admin
  {
    email: 'admin@seguridad-mdp.com',
    password: 'admin123',
    displayName: 'Administrador',
    role: 'admin'
  }
];

async function createUsers() {
  console.log('🚀 Iniciando creación de usuarios...\n');
  
  const results = {
    created: [],
    failed: [],
    exists: []
  };

  for (const user of DEMO_USERS) {
    try {
      // Verificar si el usuario ya existe
      const existingUser = await auth.getUserByEmail(user.email).catch(() => null);
      
      if (existingUser) {
        console.log(`⚠️  ${user.email} - Ya existe`);
        results.exists.push(user.email);
        continue;
      }

      // Crear usuario
      const newUser = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.displayName,
        disabled: false
      });

      // Establecer claims personalizados (para verificación de rol)
      await auth.setCustomUserClaims(newUser.uid, {
        role: user.role,
        createdAt: new Date().toISOString()
      });

      console.log(`✅ ${user.email} - Creado correctamente`);
      console.log(`   UID: ${newUser.uid}`);
      console.log(`   Contraseña: ${user.password}`);
      console.log(`   Rol: ${user.role}\n`);

      results.created.push({
        email: user.email,
        uid: newUser.uid,
        role: user.role,
        password: user.password
      });

    } catch (error) {
      console.error(`❌ ${user.email} - Error: ${error.message}`);
      results.failed.push({
        email: user.email,
        error: error.message
      });
    }
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN');
  console.log('='.repeat(60));
  console.log(`✅ Creados: ${results.created.length}`);
  console.log(`⚠️  Ya existentes: ${results.exists.length}`);
  console.log(`❌ Errores: ${results.failed.length}`);
  console.log('='.repeat(60));

  if (results.failed.length > 0) {
    console.log('\n❌ Errores:');
    results.failed.forEach(item => {
      console.log(`   ${item.email}: ${item.error}`);
    });
  }

  console.log('\n✅ Usuarios disponibles para login:\n');
  results.created.forEach(user => {
    console.log(`  📧 ${user.email}`);
    console.log(`     Contraseña: ${user.password}`);
    console.log(`     Rol: ${user.role}\n`);
  });

  console.log('🔗 URL de login: http://localhost:5000/login.html');
  console.log('   o en production: https://trafico-map-general-v2.web.app/login.html');
}

// Ejecutar
createUsers()
  .then(() => {
    console.log('\n✅ Proceso completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
