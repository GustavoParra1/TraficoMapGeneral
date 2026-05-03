#!/usr/bin/env node
/**
 * crear-usuarios-firebase.js
 * 
 * Crea usuarios en Firebase Auth basado en usuarios-iniciales.json
 * Se ejecuta después de que el Firebase project esté configurado
 * 
 * Uso:
 *   node crear-usuarios-firebase.js --proyecto=laplatamaps
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Parsear argumentos
const args = process.argv.slice(2);
const projectArg = args.find(arg => arg.startsWith('--proyecto'));
const projectId = projectArg ? projectArg.split('=')[1] : null;
const usuariosFile = args.find(arg => arg.startsWith('--usuarios')) 
  ? args.find(arg => arg.startsWith('--usuarios')).split('=')[1]
  : 'usuarios-iniciales.json';

if (!projectId) {
  console.error('❌ Error: Debes especificar --proyecto=<firebase-project-id>');
  console.error('Uso: node crear-usuarios-firebase.js --proyecto=laplatamaps');
  process.exit(1);
}

console.log('🔧 Inicializando Firebase Admin SDK...');

// Inicializar Firebase con credenciales de service account
// Asume que existe ./firebase-service-account.json
const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`❌ Error: No encontrado ${serviceAccountPath}`);
  console.error('\nPara obtenerlo:');
  console.error('1. Ve a https://console.firebase.google.com/project/' + projectId + '/settings/serviceaccounts/adminsdk');
  console.error('2. Haz clic en "Generar nueva clave privada"');
  console.error('3. Guarda como firebase-service-account.json en este directorio');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: projectId
  });
  console.log('✅ Firebase Admin SDK inicializado');
} catch (error) {
  console.error('❌ Error inicializando Firebase:', error.message);
  process.exit(1);
}

// Leer usuarios a crear
console.log(`\n📖 Leyendo usuarios desde: ${usuariosFile}`);

if (!fs.existsSync(usuariosFile)) {
  console.error(`❌ Error: No encontrado ${usuariosFile}`);
  process.exit(1);
}

const usuariosData = JSON.parse(fs.readFileSync(usuariosFile, 'utf8'));
const todosLosUsuarios = [
  usuariosData.admin,
  ...usuariosData.operadores,
  ...usuariosData.patrullas
];

console.log(`📋 Usuarios a crear: ${todosLosUsuarios.length}`);
console.log(`  • 1 Admin`);
console.log(`  • ${usuariosData.operadores.length} Operadores`);
console.log(`  • ${usuariosData.patrullas.length} Patrullas`);

// Crear usuarios
async function crearUsuarios() {
  const auth = admin.auth();
  const db = admin.firestore();
  const resultados = {
    exitosos: 0,
    errores: 0,
    detalles: []
  };

  console.log('\n🔐 Creando usuarios en Firebase Auth...\n');

  for (const usuario of todosLosUsuarios) {
    try {
      // Crear en Auth
      const userRecord = await auth.createUser({
        email: usuario.email,
        password: usuario.password,
        displayName: usuario.nombre,
        emailVerified: false
      });

      console.log(`✅ Creado: ${usuario.email} (${usuario.role})`);

      // Guardar en Firestore: /users/{uid}
      await db.collection('users').doc(userRecord.uid).set({
        email: usuario.email,
        nombre: usuario.nombre,
        role: usuario.role,
        vehiculo: usuario.vehiculo || null,
        placa: usuario.placa || null,
        creado_en: admin.firestore.FieldValue.serverTimestamp(),
        estado: 'activo'
      });

      // Asignar role personalizado (para verificación en Firestore rules)
      await auth.setCustomUserClaims(userRecord.uid, {
        role: usuario.role
      });

      resultados.exitosos++;
      resultados.detalles.push({
        email: usuario.email,
        role: usuario.role,
        uid: userRecord.uid,
        estado: 'exitoso'
      });

    } catch (error) {
      console.error(`❌ Error creando ${usuario.email}: ${error.message}`);
      resultados.errores++;
      resultados.detalles.push({
        email: usuario.email,
        role: usuario.role,
        error: error.message,
        estado: 'error'
      });
    }
  }

  return resultados;
}

// Ejecutar creación
crearUsuarios()
  .then(resultados => {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN');
    console.log('='.repeat(60));
    console.log(`✅ Exitosos: ${resultados.exitosos}`);
    console.log(`❌ Errores: ${resultados.errores}`);
    
    if (resultados.errores > 0) {
      console.log('\nDetalles de errores:');
      resultados.detalles
        .filter(d => d.estado === 'error')
        .forEach(d => {
          console.log(`  • ${d.email}: ${d.error}`);
        });
    }

    // Guardar resultados
    fs.writeFileSync(
      'usuarios-creados.json',
      JSON.stringify(resultados, null, 2)
    );
    console.log('\n📁 Resultados guardados en: usuarios-creados.json');
    
    console.log('\n✅ Proceso completado!');
    process.exit(resultados.errores > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
