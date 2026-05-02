#!/usr/bin/env node

/**
 * CREATE-CITY.JS
 * ===============
 * Script automático para agregar una nueva ciudad al sistema TraficoMap
 * 
 * Uso: node create-city.js
 * 
 * El script realiza:
 * ✅ Crea entrada en cities-config.json
 * ✅ Actualiza public/testing-patrullas.js con coordenadas
 * ✅ Usa firestore.rules genérico (sin cambios necesarios)
 * ✅ Proporciona comando para crear usuarios en Firebase
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => {
  rl.question(`${colors.cyan}${prompt}${colors.reset}`, resolve);
});

async function createCity() {
  console.log(`\n${colors.bright}${colors.green}🏙️  CREATE CITY - TraficoMap${colors.reset}\n`);

  // Recopilar información de entrada
  const cityName = await question('📍 Nombre de la ciudad (ej: Rosario): ');
  const cityId = await question('🆔 ID único (minúsculas, sin espacios, ej: rosario): ');
  const province = await question('🏛️  Provincia (ej: Santa Fe): ');
  const latitude = await question('📐 Latitud (ej: -32.9517): ');
  const longitude = await question('📐 Longitud (ej: -60.6631): ');
  const numPatrullas = await question('👮 Cantidad de patrullas a crear (ej: 3): ');
  const numOperadores = await question('👤 Cantidad de operadores (ej: 1): ');

  // Validar inputs
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const numP = parseInt(numPatrullas);
  const numO = parseInt(numOperadores);

  if (isNaN(lat) || isNaN(lng) || lat < -56 || lat > -20 || lng < -75 || lng > -50) {
    console.error(`${colors.red}❌ Coordenadas inválidas${colors.reset}`);
    rl.close();
    return;
  }

  if (isNaN(numP) || isNaN(numO) || numP < 0 || numO < 0) {
    console.error(`${colors.red}❌ Cantidad de usuarios inválida${colors.reset}`);
    rl.close();
    return;
  }

  console.log(`\n${colors.bright}${colors.yellow}⏳ Procesando...${colors.reset}\n`);

  // 1. ACTUALIZAR cities-config.json
  const citiesConfigPath = path.join(__dirname, 'public', 'data', 'cities-config.json');
  let citiesConfig = JSON.parse(fs.readFileSync(citiesConfigPath, 'utf8'));

  const newCity = {
    id: cityId,
    name: cityName,
    country: 'Argentina',
    province: province,
    coordinates: {
      lat: lat,
      lng: lng
    },
    zoom: 13,
    patrullas: {
      enabled: true,
      dataCollection: `patrullas_${cityId}`,
      chatCollection: `chat_${cityId}`,
      webrtcCollection: `webrtc_${cityId}`
    }
  };

  // Verificar si ya existe
  if (citiesConfig.some(c => c.id === cityId)) {
    console.log(`${colors.yellow}⚠️  La ciudad "${cityId}" ya existe en cities-config.json${colors.reset}`);
  } else {
    citiesConfig.push(newCity);
    fs.writeFileSync(citiesConfigPath, JSON.stringify(citiesConfig, null, 2));
    console.log(`${colors.green}✅ Actualizado: public/data/cities-config.json${colors.reset}`);
  }

  // 2. ACTUALIZAR testing-patrullas.js
  const testingPath = path.join(__dirname, 'public', 'testing-patrullas.js');
  let testingContent = fs.readFileSync(testingPath, 'utf8');

  // Buscar dónde agregar la nueva ciudad en el switch
  const coordinatesSection = `
    // ${cityName}
    } else if (currentCity === '${cityId}') {
      latBase = ${lat};
      lngBase = ${lng};`;

  if (!testingContent.includes(`currentCity === '${cityId}'`)) {
    // Encontrar la última ciudad y agregar después
    const insertPoint = testingContent.lastIndexOf('} else if (currentCity === ');
    if (insertPoint !== -1) {
      const nextBrace = testingContent.indexOf('\n    }', insertPoint) + 6;
      testingContent = testingContent.slice(0, nextBrace) + coordinatesSection + testingContent.slice(nextBrace);
      fs.writeFileSync(testingPath, testingContent);
      console.log(`${colors.green}✅ Actualizado: public/testing-patrullas.js${colors.reset}`);
    }
  }

  // 3. ACTUALIZAR control-center-v2/index.html con coordenadas
  const ccPath = path.join(__dirname, 'public', 'control-center-v2', 'index.html');
  let ccContent = fs.readFileSync(ccPath, 'utf8');

  const cityCoordLine = `'${cityId}': [${lat}, ${lng}],`;
  if (!ccContent.includes(`'${cityId}': [`)) {
    // Buscar la sección CITY_COORDS y agregar la nueva entrada
    const cityCoords = ccContent.indexOf("const CITY_COORDS = {");
    if (cityCoords !== -1) {
      const closingBrace = ccContent.indexOf('};', cityCoords);
      const insertion = ccContent.slice(0, closingBrace) + `    ${cityCoordLine}\n  ` + ccContent.slice(closingBrace);
      fs.writeFileSync(ccPath, insertion);
      console.log(`${colors.green}✅ Actualizado: public/control-center-v2/index.html${colors.reset}`);
    }
  }

  // 4. ACTUALIZAR firestore.rules con nuevas colecciones
  const rulesPath = path.join(__dirname, 'firestore.rules');
  let rulesContent = fs.readFileSync(rulesPath, 'utf8');

  // Generar bloques de reglas para la nueva ciudad
  const patrollasBlock = generatePatrollasRules(cityId);
  const chatBlock = generateChatRules(cityId);
  const messagesBlock = generateMessagesRules(cityId);
  const webrtcBlock = generateWebrtcRules(cityId);

  // Insertar antes de "// ========== ROBOS"
  const robosIndex = rulesContent.indexOf('// ========== ROBOS');
  if (robosIndex !== -1 && !rulesContent.includes(`patrullas_${cityId}`)) {
    const insertion = `${patrollasBlock}\n\n${chatBlock}\n\n${messagesBlock}\n\n${webrtcBlock}\n\n    `;
    rulesContent = rulesContent.slice(0, robosIndex) + insertion + rulesContent.slice(robosIndex);
    fs.writeFileSync(rulesPath, rulesContent);
    console.log(`${colors.green}✅ Actualizado: firestore.rules${colors.reset}`);
  }

  // 4. GENERAR USUARIOS FIREBASE
  console.log(`\n${colors.bright}${colors.yellow}👥 Generando credenciales de usuarios...${colors.reset}\n`);

  let patrullaUsers = [];
  let operadorUsers = [];

  for (let i = 1; i <= numP; i++) {
    const email = `patrulla-${cityId}-${String(i).padStart(2, '0')}@seguridad.com`;
    const password = generatePassword();
    patrullaUsers.push({
      email,
      password,
      role: 'patrulla',
      city: cityId
    });
  }

  for (let i = 1; i <= numO; i++) {
    const email = `operador-${cityId}-${String(i).padStart(2, '0')}@seguridad.com`;
    const password = generatePassword();
    operadorUsers.push({
      email,
      password,
      role: 'operador',
      city: cityId
    });
  }

  console.log(`${colors.bright}🔑 CREDENCIALES PATRULLAS:${colors.reset}`);
  patrullaUsers.forEach(u => {
    console.log(`  📧 ${u.email}`);
    console.log(`  🔐 ${u.password}`);
    console.log();
  });

  console.log(`${colors.bright}🔑 CREDENCIALES OPERADORES:${colors.reset}`);
  operadorUsers.forEach(u => {
    console.log(`  📧 ${u.email}`);
    console.log(`  🔐 ${u.password}`);
    console.log();
  });

  // 5. GUARDAR EN setup-users.js
  const setupPath = path.join(__dirname, 'setup-users.js');
  let setupContent = fs.readFileSync(setupPath, 'utf8');

  const allUsers = [...patrullaUsers, ...operadorUsers];
  const userSetupCode = `  // ========== ${cityName.toUpperCase()} ==========
  const ${cityId}Users = [
${allUsers.map(u => `    {
      email: '${u.email}',
      password: '${u.password}',
      role: '${u.role}',
      city: '${u.city}'
    }`).join(',\n')}
  ];
  users.push(...${cityId}Users);\n`;

  // Agregar antes del "// Retornar conforme final"
  if (!setupContent.includes(`${cityId}Users`)) {
    const insertPoint = setupContent.lastIndexOf('// ========== ');
    if (insertPoint !== -1) {
      const nextBreak = setupContent.indexOf('\n', setupContent.lastIndexOf('];', insertPoint)) + 1;
      setupContent = setupContent.slice(0, nextBreak) + userSetupCode + setupContent.slice(nextBreak);
      fs.writeFileSync(setupPath, setupContent);
      console.log(`\n${colors.green}✅ Actualizado: setup-users.js${colors.reset}`);
    }
  }

  // 6. INSTRUCCIONES FINALES
  console.log(`\n${colors.bright}${colors.green}✨ ¡CIUDAD AGREGADA EXITOSAMENTE!${colors.reset}\n`);

  console.log(`${colors.bright}📋 PRÓXIMOS PASOS:${colors.reset}\n`);

  console.log(`1️⃣  Crear usuarios en Firebase:`);
  console.log(`   ${colors.cyan}npm run setup-users${colors.reset}\n`);

  console.log(`2️⃣  Deploy de cambios a Firebase:`);
  console.log(`   ${colors.cyan}firebase deploy --only firestore:rules,hosting${colors.reset}\n`);

  console.log(`3️⃣  Probar patrullas en la consola:`);
  console.log(`   ${colors.cyan}currentCity = '${cityId}'${colors.reset}`);
  console.log(`   ${colors.cyan}crearPatrullasPrueba()${colors.reset}\n`);

  console.log(`${colors.bright}📁 ARCHIVOS MODIFICADOS:${colors.reset}`);
  console.log(`  ✅ public/data/cities-config.json`);
  console.log(`  ✅ public/testing-patrullas.js`);
  console.log(`  ✅ public/control-center-v2/index.html`);
  console.log(`  ✅ setup-users.js`);
  console.log(`  ℹ️  firestore.rules (sin cambios necesarios - ya es genérico)\n`);

  // Guardar credenciales en archivo
  const credsFile = path.join(__dirname, `${cityId}-credentials.json`);
  fs.writeFileSync(credsFile, JSON.stringify({
    ciudad: cityName,
    id: cityId,
    coordenadas: { lat, lng },
    patrullas: patrullaUsers,
    operadores: operadorUsers
  }, null, 2));

  console.log(`${colors.green}💾 Credenciales guardadas en: ${cityId}-credentials.json${colors.reset}\n`);

  rl.close();
}

function generatePassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';

  const all = uppercase + lowercase + numbers + symbols;
  let password = '';

  // Asegurar al menos uno de cada tipo
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Llenar el resto
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Mezclar
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

function generatePatrollasRules(cityId) {
  return `    // ========== PATRULLAS ${cityId.toUpperCase()} ==========
    match /patrullas_${cityId}/{patrolId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
      match /gps_history/{entry} {
        allow read: if isAuthenticated();
        allow write: if isAuthenticated();
      }
    }`;
}

function generateChatRules(cityId) {
  return `    // ========== CHAT ${cityId.toUpperCase()} ==========
    match /chat_${cityId}/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
      allow delete: if isOperadorOrAdmin();
    }`;
}

function generateMessagesRules(cityId) {
  return `    // ========== MESSAGES ${cityId.toUpperCase()} ==========
    match /messages_${cityId}/{messageId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isOperadorOrAdmin();
    }`;
}

function generateWebrtcRules(cityId) {
  return `    // ========== WEBRTC ${cityId.toUpperCase()} ==========
    match /webrtc_${cityId}/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }`;
}

// Ejecutar
createCity().catch(err => {
  console.error(`${colors.red}❌ Error:${colors.reset}`, err.message);
  rl.close();
  process.exit(1);
});
