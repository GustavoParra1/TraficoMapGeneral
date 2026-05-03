#!/usr/bin/env node
/**
 * crear-suscripcion.js
 * 
 * Crea el documento de suscripción en el Firebase de administración
 * (trafico-map-general-v2) para verificación de clientes
 * 
 * Este script crea la suscripción en tu Firebase, no en el del cliente
 * 
 * Uso:
 *   node crear-suscripcion.js --cliente=La-Plata --plan=profesional --firebase-admin-key=./admin-key.json
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Parsear argumentos
const args = process.argv.slice(2);
const clienteArg = args.find(arg => arg.startsWith('--cliente'));
const planArg = args.find(arg => arg.startsWith('--plan'));
const keyArg = args.find(arg => arg.startsWith('--firebase-admin-key'));

const clienteId = clienteArg ? clienteArg.split('=')[1] : null;
const plan = planArg ? planArg.split('=')[1] : 'profesional';
const keyPath = keyArg ? keyArg.split('=')[1] : null;

if (!clienteId) {
  console.error('❌ Error: Debes especificar --cliente=<cliente-id>');
  console.error('Uso: node crear-suscripcion.js --cliente=La-Plata --plan=profesional');
  process.exit(1);
}

console.log('🔧 Inicializando Firebase Admin (trafico-map-general-v2)...');

// Buscar credenciales del admin Firebase
let serviceAccountPath = keyPath;
if (!serviceAccountPath) {
  // Buscar en ubicaciones comunes
  const ubicacionesComunes = [
    './trafico-map-general-v2-key.json',
    './admin-key.json',
    path.join(process.env.USERPROFILE || process.env.HOME, '.firebase/trafico-map-general-v2-key.json')
  ];
  
  for (const loc of ubicacionesComunes) {
    if (fs.existsSync(loc)) {
      serviceAccountPath = loc;
      break;
    }
  }
}

if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: No encontradas credenciales de Firebase admin');
  console.error('\nOpciones:');
  console.error('1. Especifica la ruta: --firebase-admin-key=./ruta/a/clave.json');
  console.error('2. Coloca el archivo en una ubicación común:');
  console.error('   • ./trafico-map-general-v2-key.json');
  console.error('   • ./admin-key.json');
  console.error('\nPara obtenerlo:');
  console.error('1. Ve a https://console.firebase.google.com/project/trafico-map-general-v2/settings/serviceaccounts/adminsdk');
  console.error('2. Haz clic en "Generar nueva clave privada"');
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'trafico-map-general-v2'
  });
  console.log('✅ Firebase Admin inicializado');
} catch (error) {
  console.error('❌ Error inicializando Firebase:', error.message);
  process.exit(1);
}

// Definir características por plan
const caracteristicasPorPlan = {
  basico: {
    cameras: 10,
    users: 2,
    storage_gb: 5,
    features: ['cameras', 'patrullas'],
    patrullas_enabled: true,
    chat_enabled: false,
    analytics_enabled: false,
    custom_alerts: 3
  },
  profesional: {
    cameras: 50,
    users: 5,
    storage_gb: 25,
    features: ['cameras', 'patrullas', 'chat'],
    patrullas_enabled: true,
    chat_enabled: true,
    analytics_enabled: true,
    custom_alerts: 10
  },
  enterprise: {
    cameras: 500,
    users: 50,
    storage_gb: 100,
    features: ['cameras', 'patrullas', 'chat', 'api'],
    patrullas_enabled: true,
    chat_enabled: true,
    analytics_enabled: true,
    custom_alerts: 100,
    api_access: true,
    priority_support: true
  }
};

const caracteristicas = caracteristicasPorPlan[plan] || caracteristicasPorPlan.profesional;

// Crear suscripción
async function crearSuscripcion() {
  const db = admin.firestore();
  
  console.log(`\n📝 Creando suscripción:`);
  console.log(`  • Cliente: ${clienteId}`);
  console.log(`  • Plan: ${plan}`);
  console.log(`  • Características:`);
  console.log(`    - Cámaras: ${caracteristicas.cameras}`);
  console.log(`    - Usuarios: ${caracteristicas.users}`);
  console.log(`    - Storage: ${caracteristicas.storage_gb}GB`);

  try {
    const suscripcionId = `${clienteId.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const ahora = admin.firestore.FieldValue.serverTimestamp();
    const proximoRenovacion = new Date();
    proximoRenovacion.setMonth(proximoRenovacion.getMonth() + 1);

    const suscripcionDoc = {
      cliente_id: clienteId,
      plan: plan,
      estado: 'activa',
      creado_en: ahora,
      proximo_renovacion: admin.firestore.Timestamp.fromDate(proximoRenovacion),
      caracteristicas: caracteristicas,
      limites: {
        camaras_activas: caracteristicas.cameras,
        usuarios: caracteristicas.users,
        almacenamiento_gb: caracteristicas.storage_gb
      },
      uso_actual: {
        camaras: 0,
        usuarios: 0,
        almacenamiento_gb: 0
      },
      historial: [{
        fecha: ahora,
        accion: 'creacion',
        plan: plan,
        detalles: 'Suscripción creada automáticamente'
      }]
    };

    // Guardar en /suscripciones/{cliente_id}
    await db.collection('suscripciones').doc(clienteId).set(suscripcionDoc);
    
    console.log(`\n✅ Suscripción creada exitosamente`);
    console.log(`   Documento: /suscripciones/${clienteId}`);
    console.log(`   Próxima renovación: ${proximoRenovacion.toLocaleDateString('es-AR')}`);

    // Guardar resultado
    const resultado = {
      cliente_id: clienteId,
      documento: `suscripciones/${clienteId}`,
      plan: plan,
      creado_en: new Date().toISOString(),
      proxima_renovacion: proximoRenovacion.toISOString(),
      caracteristicas: caracteristicas,
      estado: 'exitoso'
    };

    fs.writeFileSync(
      'suscripcion-creada.json',
      JSON.stringify(resultado, null, 2)
    );

    console.log'\n📁 Resultado guardado en: suscripcion-creada.json');
    return true;

  } catch (error) {
    console.error(`\n❌ Error creando suscripción: ${error.message}`);
    return false;
  }
}

// Ejecutar
crearSuscripcion()
  .then(exitoso => {
    process.exit(exitoso ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
