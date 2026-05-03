/**
 * Crear usuarios de demostración en Firebase Authentication
 * Ejecutar: node setup-users.js
 * 
 * IMPORTANTE: Necesitas descargar tu clave de servicio de Firebase primero
 * https://console.firebase.google.com -> Project Settings -> Service Accounts -> Generate new private key
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar la clave de servicio (descargada de Firebase)
// Guarda el archivo en: ./serviceAccountKey.json
const serviceAccountPath = join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccountData = readFileSync(serviceAccountPath, 'utf8');
  const serviceAccount = JSON.parse(serviceAccountData);
  
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
  // Patrullas Mar del Plata
  {
    email: 'patrulla-mardelplata-01@seguridad-mdp.com',
    password: 'patrulla123',
    displayName: 'Patrulla MDP 01',
    role: 'patrulla',
    city: 'mardelplata'
  },
  {
    email: 'patrulla-mardelplata-02@seguridad-mdp.com',
    password: 'patrulla123',
    displayName: 'Patrulla MDP 02',
    role: 'patrulla',
    city: 'mardelplata'
  },
  // Patrullas Córdoba
  {
    email: 'patrulla-cordoba-01@seguridad-mdp.com',
    password: 'patrulla123',
    displayName: 'Patrulla Córdoba 01',
    role: 'patrulla',
    city: 'cordoba'
  },
  {
    email: 'patrulla-cordoba-02@seguridad-mdp.com',
    password: 'patrulla123',
    displayName: 'Patrulla Córdoba 02',
    role: 'patrulla',
    city: 'cordoba'
  },
  {
    email: 'patrulla-cordoba-03@seguridad-mdp.com',
    password: 'patrulla123',
    displayName: 'Patrulla Córdoba 03',
    role: 'patrulla',
    city: 'cordoba'
  },
  // Operadores - Capa Norte (Mar del Plata)
  {
    email: 'capa-norte@seguridad-mdp.com',
    password: 'control123',
    displayName: 'Operador Capa Norte',
    role: 'operador',
    city: 'mardelplata'
  },
  // Operadores - Capa Sur (Mar del Plata)
  {
    email: 'capa-sur@seguridad-mdp.com',
    password: 'control123',
    displayName: 'Operador Capa Sur',
    role: 'operador',
    city: 'mardelplata'
  },
  // Otros operadores Mar del Plata
  {
    email: 'mac@seguridad-mdp.com',
    password: 'control123',
    displayName: 'MAC Operador',
    role: 'operador',
    city: 'mardelplata'
  },
  {
    email: 'uppl@seguridad-mdp.com',
    password: 'control123',
    displayName: 'UPPL Operador',
    role: 'operador',
    city: 'mardelplata'
  },
  {
    email: 'multiagencia@seguridad-mdp.com',
    password: 'control123',
    displayName: 'Multi-agencia Operador',
    role: 'operador',
    city: 'mardelplata'
  },
  {
    email: 'encargado-sala@seguridad-mdp.com',
    password: 'control123',
    displayName: 'Encargado de Sala',
    role: 'operador',
    city: 'mardelplata'
  },
  // Patrullas La Plata
  {
    email: 'patrulla-laplata-01@seguridad.com',
    password: 'patrulla123',
    displayName: 'Patrulla La Plata 01',
    role: 'patrulla',
    city: 'laplata'
  },
  {
    email: 'patrulla-laplata-02@seguridad.com',
    password: 'patrulla123',
    displayName: 'Patrulla La Plata 02',
    role: 'patrulla',
    city: 'laplata'
  },
  // Operadores La Plata
  {
    email: 'operador-la-plata-01@seguridad.com',
    password: 'control123',
    displayName: 'Operador La Plata 01',
    role: 'operador',
    city: 'laplata'
  },
  // Patrullas Mendoza
  {
    email: 'patrulla-mendoza-01@seguridad.com',
    password: 'patrulla123',
    displayName: 'Patrulla Mendoza 01',
    role: 'patrulla',
    city: 'mendoza'
  },
  // Operadores Mendoza
  {
    email: 'operador-mendoza-01@seguridad.com',
    password: 'control123',
    displayName: 'Operador Mendoza 01',
    role: 'operador',
    city: 'mendoza'
  },
  // Admin (acceso a todas las ciudades)
  {
    email: 'admin@trafico-map.com',
    password: 'Admin123456',
    displayName: 'Administrador',
    role: 'admin',
    city: null
  }
;


// ========== MENDOZA ==========
const mendozaUsers = [
  {
    email: 'patrulla-mendoza-01@seguridad.com',
    password: 'GeneratedByCreateCity',
    role: 'patrulla',
    city: 'mendoza'
  },
  {
    email: 'patrulla-mendoza-02@seguridad.com',
    password: 'GeneratedByCreateCity',
    role: 'patrulla',
    city: 'mendoza'
  },
  {
    email: 'patrulla-mendoza-03@seguridad.com',
    password: 'GeneratedByCreateCity',
    role: 'patrulla',
    city: 'mendoza'
  },
  {
    email: 'operador-mendoza-01@seguridad.com',
    password: 'GeneratedByCreateCity',
    role: 'operador',
    city: 'mendoza'
  },
];
users.push(...mendozaUsers);
const users = [


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
        // Actualizar custom claims del usuario existente
        await auth.setCustomUserClaims(existingUser.uid, {
          role: user.role,
          city: user.city,
          createdAt: new Date().toISOString()
        });
        
        console.log(`✏️  ${user.email} - Actualizado con custom claims`);
        console.log(`   UID: ${existingUser.uid}`);
        console.log(`   Rol: ${user.role}`);
        console.log(`   Ciudad: ${user.city || 'Acceso global'}\n`);
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
        city: user.city,
        createdAt: new Date().toISOString()
      });

      console.log(`✅ ${user.email} - Creado correctamente`);
      console.log(`   UID: ${newUser.uid}`);
      console.log(`   Contraseña: ${user.password}`);
      console.log(`   Rol: ${user.role}`);
      console.log(`   Ciudad: ${user.city || 'Acceso global'}\n`);

      results.created.push({
        email: user.email,
        uid: newUser.uid,
        role: user.role,
        city: user.city,
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
    console.log(`     Rol: ${user.role}`);
    console.log(`     Ciudad: ${user.city || 'Acceso global'}\n`);
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
