#!/usr/bin/env node

/**
 * CREATE-CITY-COMPLETE.JS
 * =======================
 * Script COMPLETO y AUTOMÁTICO para agregar una nueva ciudad
 * 
 * Usa: node create-city-complete.js
 * 
 * Automatiza:
 * ✅ cities-config.json
 * ✅ firestore.rules
 * ✅ setup-users.js (para referencia)
 * ✅ Crea USUARIOS en Firebase Auth (automático)
 * ✅ Crea PATRULLAS en Firestore (automático)
 * ✅ Asigna custom claims a usuarios
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colores
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => {
  rl.question(`${colors.cyan}${prompt}${colors.reset}`, resolve);
});

// Inicializar Firebase Admin
let db = null;
let auth = null;

function initializeFirebase() {
  try {
    const serviceAccountPath = path.join(__dirname, 'trafico-map-general-v2-firebase-adminsdk-key.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.error(`\n${colors.red}❌ No se encontró la clave de Firebase Admin.${colors.reset}`);
      console.log(`\n${colors.yellow}📝 Sigue estos pasos:${colors.reset}`);
      console.log(`1. Ve a: https://console.firebase.google.com/project/trafico-map-general-v2`);
      console.log(`2. Proyecto → Configuración → Cuentas de servicio`);
      console.log(`3. Generar nueva clave privada (JSON)`);
      console.log(`4. Descarga el archivo y renómbralo a:`);
      console.log(`   trafico-map-general-v2-firebase-adminsdk-key.json`);
      console.log(`5. Colócalo en: ${colors.cyan}${__dirname}${colors.reset}\n`);
      process.exit(1);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'trafico-map-general-v2'
    });

    db = admin.firestore();
    auth = admin.auth();

    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Error inicializando Firebase:${colors.reset}`, error.message);
    return false;
  }
}

async function createCityComplete() {
  console.log(`\n${colors.bright}${colors.blue}🏙️  CREATE CITY - AUTOMATICO COMPLETO${colors.reset}\n`);

  // Recopilar información
  const cityName = await question('📍 Nombre de la ciudad (ej: Mendoza): ');
  const cityId = await question('🆔 ID único (minúsculas, ej: mendoza): ');
  const province = await question('🏛️  Provincia (ej: Mendoza): ');
  const latitude = await question('📐 Latitud (ej: -32.8895): ');
  const longitude = await question('📐 Longitud (ej: -68.8458): ');
  const numPatrullas = await question('👮 Cantidad de patrullas (ej: 3): ');
  const numOperadores = await question('👤 Cantidad de operadores (ej: 1): ');

  // Validar
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const numP = parseInt(numPatrullas);
  const numO = parseInt(numOperadores);

  if (isNaN(lat) || isNaN(lng) || lat < -56 || lat > -20 || lng < -75 || lng > -50) {
    console.error(`${colors.red}❌ Coordenadas inválidas${colors.reset}`);
    rl.close();
    return;
  }

  if (isNaN(numP) || isNaN(numO) || numP < 1 || numO < 1) {
    console.error(`${colors.red}❌ Cantidad de usuarios debe ser >= 1${colors.reset}`);
    rl.close();
    return;
  }

  console.log(`\n${colors.bright}${colors.yellow}⏳ Procesando - Esto puede tardar unos segundos...${colors.reset}\n`);

  // 1. ACTUALIZAR cities-config.json
  console.log(`${colors.cyan}1. Actualizando cities-config.json...${colors.reset}`);
  const citiesConfigPath = path.join(__dirname, 'public', 'data', 'cities-config.json');
  let citiesConfig = JSON.parse(fs.readFileSync(citiesConfigPath, 'utf8'));

  if (!citiesConfig.some(c => c.id === cityId)) {
    citiesConfig.push({
      id: cityId,
      name: cityName,
      country: 'Argentina',
      province: province,
      coordinates: { lat, lng },
      zoom: 13,
      files: {
        barrios: null,
        siniestros: null,
        cameras: null,
        private_cameras: null
      },
      optionalLayers: {
        semaforos: null,
        colegios: null,
        corredores: null,
        aforos: null,
        colectivos: null,
        flujo: null,
        robo: null,
        alertas: null,
        zonas: null
      },
      patrullas: {
        enabled: true,
        dataCollection: `patrullas_${cityId}`,
        chatCollection: `chat_${cityId}`,
        webrtcCollection: `webrtc_${cityId}`
      }
    });
    fs.writeFileSync(citiesConfigPath, JSON.stringify(citiesConfig, null, 2));
    console.log(`   ${colors.green}✅ cities-config.json actualizado${colors.reset}`);
  }

  // 2. ACTUALIZAR firestore.rules
  console.log(`${colors.cyan}2. Actualizando firestore.rules...${colors.reset}`);
  const rulesPath = path.join(__dirname, 'firestore.rules');
  let rulesContent = fs.readFileSync(rulesPath, 'utf8');

  if (!rulesContent.includes(`patrullas_${cityId}`)) {
    const rulesBlock = `
    // ========== PATRULLAS ${cityId.toUpperCase()} ==========
    match /patrullas_${cityId}/{patrolId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
      match /gps_history/{entry} {
        allow read: if isAuthenticated();
        allow write: if isAuthenticated();
      }
    }

    // ========== CHAT ${cityId.toUpperCase()} ==========
    match /chat_${cityId}/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
      allow delete: if isOperadorOrAdmin();
    }

    // ========== MESSAGES ${cityId.toUpperCase()} ==========
    match /messages_${cityId}/{messageId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isOperadorOrAdmin();
    }

    // ========== WEBRTC ${cityId.toUpperCase()} ==========
    match /webrtc_${cityId}/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
`;

    const robosIndex = rulesContent.indexOf('// ========== ROBOS');
    if (robosIndex !== -1) {
      rulesContent = rulesContent.slice(0, robosIndex) + rulesBlock + '\n    ' + rulesContent.slice(robosIndex);
      fs.writeFileSync(rulesPath, rulesContent);
      console.log(`   ${colors.green}✅ firestore.rules actualizado${colors.reset}`);
    }
  }

  // 3. ACTUALIZAR testing-patrullas.js
  console.log(`${colors.cyan}3. Actualizando testing-patrullas.js...${colors.reset}`);
  const testingPath = path.join(__dirname, 'public', 'testing-patrullas.js');
  let testingContent = fs.readFileSync(testingPath, 'utf8');

  if (!testingContent.includes(`currentCity === '${cityId}'`)) {
    // Buscar dónde insertar (después del último else if)
    const lastElseIf = testingContent.lastIndexOf('} else if (currentCity ===');
    if (lastElseIf !== -1) {
      const closingBrace = testingContent.indexOf('\n  }', lastElseIf) + 4;
      const insertion = `\n  } else if (currentCity === '${cityId}') {\n    latBase = ${lat};\n    lngBase = ${lng};`;
      testingContent = testingContent.slice(0, closingBrace) + insertion + testingContent.slice(closingBrace);
      fs.writeFileSync(testingPath, testingContent);
      console.log(`   ${colors.green}✅ testing-patrullas.js actualizado${colors.reset}`);
    }
  }

  // 4. ACTUALIZAR setup-users.js (solo referencia)
  console.log(`${colors.cyan}4. Actualizando setup-users.js...${colors.reset}`);
  const setupPath = path.join(__dirname, 'setup-users.js');
  let setupContent = fs.readFileSync(setupPath, 'utf8');

  if (!setupContent.includes(`${cityId}Users`)) {
    const userCode = generateUserSetupCode(cityId, cityName, numP, numO);
    const lastUsersArray = setupContent.lastIndexOf('];');
    if (lastUsersArray !== -1) {
      setupContent = setupContent.slice(0, lastUsersArray) + ';\n\n' + userCode + '\nconst users = [\n' + setupContent.slice(lastUsersArray + 2);
      fs.writeFileSync(setupPath, setupContent);
      console.log(`   ${colors.green}✅ setup-users.js actualizado${colors.reset}`);
    }
  }

  // 5. CREAR USUARIOS EN FIREBASE AUTH
  console.log(`${colors.cyan}5. Creando usuarios en Firebase Auth...${colors.reset}`);
  
  if (!initializeFirebase()) {
    console.error(`${colors.red}❌ No se pudo inicializar Firebase Admin${colors.reset}`);
    rl.close();
    return;
  }

  const patrullaCredentials = [];
  const operadorCredentials = [];

  // Crear usuarios de patrullas
  for (let i = 1; i <= numP; i++) {
    const email = `patrulla-${cityId}-${String(i).padStart(2, '0')}@seguridad.com`;
    const password = generatePassword();
    
    try {
      const userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: `Patrulla ${cityName} ${i}`
      });

      await auth.setCustomUserClaims(userRecord.uid, {
        role: 'patrulla',
        city: cityId
      });

      patrullaCredentials.push({ email, password, uid: userRecord.uid });
      console.log(`   ${colors.green}✅${colors.reset} Patrulla ${i}: ${email}`);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log(`   ${colors.yellow}⚠️${colors.reset}  Patrulla ${i} ya existe: ${email}`);
      } else {
        console.error(`   ${colors.red}❌${colors.reset}  Error creando patrulla ${i}: ${error.message}`);
      }
    }
  }

  // Crear usuarios de operadores
  for (let i = 1; i <= numO; i++) {
    const email = `operador-${cityId}-${String(i).padStart(2, '0')}@seguridad.com`;
    const password = generatePassword();
    
    try {
      const userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: `Operador ${cityName} ${i}`
      });

      await auth.setCustomUserClaims(userRecord.uid, {
        role: 'operador',
        city: cityId
      });

      operadorCredentials.push({ email, password, uid: userRecord.uid });
      console.log(`   ${colors.green}✅${colors.reset} Operador ${i}: ${email}`);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log(`   ${colors.yellow}⚠️${colors.reset}  Operador ${i} ya existe: ${email}`);
      } else {
        console.error(`   ${colors.red}❌${colors.reset}  Error creando operador ${i}: ${error.message}`);
      }
    }
  }

  // 6. CREAR PATRULLAS EN FIRESTORE
  console.log(`${colors.cyan}6. Creando patrullas en Firestore...${colors.reset}`);

  const coleccion = `patrullas_${cityId}`;
  for (let i = 1; i <= numP; i++) {
    const patrolId = `patrulla-${String(i).padStart(2, '0')}`;
    const offsetLat = Math.random() * 0.05 - 0.025; // ±0.025
    const offsetLng = Math.random() * 0.05 - 0.025;

    try {
      await db.collection(coleccion).doc(patrolId).set({
        lat: lat + offsetLat,
        lng: lng + offsetLng,
        online: i === 1 ? false : true, // Primera offline
        emergencia: false,
        estado: i === 1 ? 'offline' : 'activo',
        speed: 0,
        heading: 0,
        accuracy: 10,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`   ${colors.green}✅${colors.reset} ${patrolId} creado en Firestore`);
    } catch (error) {
      console.error(`   ${colors.red}❌${colors.reset}  Error creando ${patrolId}: ${error.message}`);
    }
  }

  // 7. GUARDAR CREDENCIALES
  console.log(`${colors.cyan}7. Guardando credenciales...${colors.reset}`);
  const credsFile = path.join(__dirname, `${cityId}-credentials.json`);
  fs.writeFileSync(credsFile, JSON.stringify({
    ciudad: cityName,
    id: cityId,
    coordenadas: { lat, lng },
    patrullas: patrullaCredentials,
    operadores: operadorCredentials,
    fechaCreacion: new Date().toISOString()
  }, null, 2));

  console.log(`   ${colors.green}✅${colors.reset} Credenciales guardadas en: ${cityId}-credentials.json`);

  // 8. PRÓXIMOS PASOS
  console.log(`\n${colors.bright}${colors.green}✨ ¡CIUDAD CREADA COMPLETAMENTE!${colors.reset}\n`);

  console.log(`${colors.bright}📋 PRÓXIMOS PASOS:${colors.reset}\n`);

  console.log(`1️⃣  Deploy de firestore.rules a Firebase:`);
  console.log(`   ${colors.cyan}firebase deploy --only firestore:rules,hosting${colors.reset}\n`);

  console.log(`2️⃣  Verificar patrullas en el mapa: Ir a `);
  console.log(`   https://trafico-map-general-v2.web.app/\n`);

  console.log(`${colors.bright}📝 CREDENCIALES:${colors.reset}\n`);
  console.log(`   Ver archivo: ${colors.cyan}${cityId}-credentials.json${colors.reset}\n`);

  rl.close();
  process.exit(0);
}

function generatePassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';

  const all = uppercase + lowercase + numbers;
  let password = '';

  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];

  for (let i = 3; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
}

function generateUserSetupCode(cityId, cityName, numP, numO) {
  let users = [];
  
  for (let i = 1; i <= numP; i++) {
    users.push({
      email: `patrulla-${cityId}-${String(i).padStart(2, '0')}@seguridad.com`,
      password: 'GeneratedByCreateCity',
      role: 'patrulla',
      city: cityId
    });
  }

  for (let i = 1; i <= numO; i++) {
    users.push({
      email: `operador-${cityId}-${String(i).padStart(2, '0')}@seguridad.com`,
      password: 'GeneratedByCreateCity',
      role: 'operador',
      city: cityId
    });
  }

  let code = `\n// ========== ${cityName.toUpperCase()} ==========\nconst ${cityId}Users = [\n`;
  users.forEach(u => {
    code += `  {\n`;
    code += `    email: '${u.email}',\n`;
    code += `    password: '${u.password}',\n`;
    code += `    role: '${u.role}',\n`;
    code += `    city: '${u.city}'\n`;
    code += `  },\n`;
  });
  code += `];\nusers.push(...${cityId}Users);`;

  return code;
}

// Ejecutar
createCityComplete().catch(err => {
  console.error(`${colors.red}❌ Error:${colors.reset}`, err.message);
  rl.close();
  process.exit(1);
});
