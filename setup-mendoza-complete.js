#!/usr/bin/env node

/**
 * SETUP-MENDOZA: Script completo que agrega Mendoza y lo prepara para el mapa
 * Este script realiza TODOS los pasos necesarios
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

async function setupMendoza() {
  console.log(`\n${colors.bold}${colors.cyan}🚀 SETUP COMPLETO: Agregando Mendoza al sistema${colors.reset}\n`);

  const cityName = 'Mendoza';
  const cityId = 'mendoza';
  const province = 'Mendoza';
  const latitude = -32.8895;
  const longitude = -68.8458;

  // 1. Actualizar cities-config.json
  console.log(`${colors.bold}${colors.green}PASO 1/5: Actualizando cities-config.json${colors.reset}`);

  const citiesConfigPath = path.join(__dirname, 'public', 'data', 'cities-config.json');
  let citiesConfig = JSON.parse(fs.readFileSync(citiesConfigPath, 'utf8'));

  // Extraer array si tiene estructura { cities: [...] }
  if (citiesConfig.cities) {
    citiesConfig = citiesConfig.cities;
  } else if (!Array.isArray(citiesConfig)) {
    citiesConfig = citiesConfig.cities || [];
  }

  // Verificar si ya existe
  const exists = citiesConfig.some(c => c.id === cityId);
  if (!exists) {
    citiesConfig.push({
      id: cityId,
      name: cityName,
      country: 'Argentina',
      province: province,
      coordinates: {
        lat: latitude,
        lng: longitude
      },
      zoom: 13,
      patrullas: {
        enabled: true,
        dataCollection: `patrullas_${cityId}`,
        chatCollection: `chat_${cityId}`,
        webrtcCollection: `webrtc_${cityId}`
      }
    });
    fs.writeFileSync(citiesConfigPath, JSON.stringify(citiesConfig, null, 2));
    console.log(`  ${colors.green}✅ Mendoza agregado a cities-config.json${colors.reset}\n`);
  }

  // 2. Actualizar testing-patrullas.js
  console.log(`${colors.bold}${colors.green}PASO 2/5: Actualizando testing-patrullas.js${colors.reset}`);

  const testingPath = path.join(__dirname, 'public', 'testing-patrullas.js');
  let testingContent = fs.readFileSync(testingPath, 'utf8');

  const coordinatesSection = `
    // Mendoza
    } else if (currentCity === '${cityId}') {
      latBase = ${latitude};
      lngBase = ${longitude};`;

  if (!testingContent.includes(`currentCity === '${cityId}'`)) {
    const insertPoint = testingContent.lastIndexOf('} else if (currentCity === ');
    if (insertPoint !== -1) {
      const nextBrace = testingContent.indexOf('\n    }', insertPoint) + 6;
      testingContent = testingContent.slice(0, nextBrace) + coordinatesSection + testingContent.slice(nextBrace);
      fs.writeFileSync(testingPath, testingContent);
      console.log(`  ${colors.green}✅ Coordenadas agregadas a testing-patrullas.js${colors.reset}\n`);
    }
  }

  // 3. Actualizar control-center
  console.log(`${colors.bold}${colors.green}PASO 3/5: Actualizando Control Center mapa${colors.reset}`);

  const ccPath = path.join(__dirname, 'public', 'control-center-v2', 'index.html');
  let ccContent = fs.readFileSync(ccPath, 'utf8');

  const cityCoordLine = `'${cityId}': [${latitude}, ${longitude}],`;
  if (!ccContent.includes(`'${cityId}': [`)) {
    const cityCoords = ccContent.indexOf("const CITY_COORDS = {");
    if (cityCoords !== -1) {
      const closingBrace = ccContent.indexOf('};', cityCoords);
      const insertion = ccContent.slice(0, closingBrace) + `    ${cityCoordLine}\n  ` + ccContent.slice(closingBrace);
      fs.writeFileSync(ccPath, insertion);
      console.log(`  ${colors.green}✅ Coordenadas agregadas al mapa del Control Center${colors.reset}\n`);
    }
  }

  // 4. Actualizar firestore.rules
  console.log(`${colors.bold}${colors.green}PASO 4/5: Generando reglas Firestore${colors.reset}`);

  const rulesPath = path.join(__dirname, 'firestore.rules');
  let rulesContent = fs.readFileSync(rulesPath, 'utf8');

  const patrollasBlock = `    // ========== PATRULLAS ${cityId.toUpperCase()} ==========
    match /patrullas_${cityId}/{patrolId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
      match /gps_history/{entry} {
        allow read: if isAuthenticated();
        allow write: if isAuthenticated();
      }
    }`;

  const chatBlock = `    // ========== CHAT ${cityId.toUpperCase()} ==========
    match /chat_${cityId}/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
      allow delete: if isOperadorOrAdmin();
    }`;

  const messagesBlock = `    // ========== MESSAGES ${cityId.toUpperCase()} ==========
    match /messages_${cityId}/{messageId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isOperadorOrAdmin();
    }`;

  const webrtcBlock = `    // ========== WEBRTC ${cityId.toUpperCase()} ==========
    match /webrtc_${cityId}/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }`;

  if (!rulesContent.includes(`patrullas_${cityId}`)) {
    const robosIndex = rulesContent.indexOf('// ========== ROBOS');
    if (robosIndex !== -1) {
      const insertion = `${patrollasBlock}\n\n${chatBlock}\n\n${messagesBlock}\n\n${webrtcBlock}\n\n    `;
      rulesContent = rulesContent.slice(0, robosIndex) + insertion + rulesContent.slice(robosIndex);
      fs.writeFileSync(rulesPath, rulesContent);
      console.log(`  ${colors.green}✅ Reglas Firestore generadas (4 bloques)${colors.reset}\n`);
    }
  }

  // 5. Actualizar setup-users.js
  console.log(`${colors.bold}${colors.green}PASO 5/5: Preparando usuarios para Firebase${colors.reset}`);

  const setupPath = path.join(__dirname, 'setup-users.js');
  let setupContent = fs.readFileSync(setupPath, 'utf8');

  const userSetupCode = `  // ========== MENDOZA ==========
  const ${cityId}Users = [
    {
      email: 'patrulla-${cityId}-01@seguridad.com',
      password: 'patrulla123',
      role: 'patrulla',
      city: '${cityId}'
    },
    {
      email: 'operador-${cityId}-01@seguridad.com',
      password: 'control123',
      role: 'operador',
      city: '${cityId}'
    }
  ];
  users.push(...${cityId}Users);\n`;

  if (!setupContent.includes(`${cityId}Users`)) {
    const insertPoint = setupContent.lastIndexOf('// ========== ');
    if (insertPoint !== -1) {
      const nextBreak = setupContent.indexOf('\n', setupContent.lastIndexOf('];', insertPoint)) + 1;
      setupContent = setupContent.slice(0, nextBreak) + userSetupCode + setupContent.slice(nextBreak);
      fs.writeFileSync(setupPath, setupContent);
      console.log(`  ${colors.green}✅ Usuarios agregados a setup-users.js${colors.reset}\n`);
    }
  }

  // RESUMEN FINAL
  console.log(`\n${colors.bold}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bold}${colors.green}✨ MENDOZA AGREGADO EXITOSAMENTE${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}\n`);

  console.log(`${colors.green}📋 CREDENCIALES GENERADAS:${colors.reset}\n`);
  console.log(`${colors.cyan}  📧 Patrulla: patrulla-mendoza-01@seguridad.com${colors.reset}`);
  console.log(`  🔐 Contraseña: patrulla123\n`);
  console.log(`${colors.cyan}  📧 Operador: operador-mendoza-01@seguridad.com${colors.reset}`);
  console.log(`  🔐 Contraseña: control123\n`);

  console.log(`${colors.green}📁 Archivos actualizados:${colors.reset}`);
  console.log(`  1. public/data/cities-config.json`);
  console.log(`  2. public/testing-patrullas.js`);
  console.log(`  3. public/control-center-v2/index.html`);
  console.log(`  4. firestore.rules`);
  console.log(`  5. setup-users.js\n`);

  console.log(`${colors.yellow}📝 PRÓXIMOS PASOS:${colors.reset}\n`);
  console.log(`  1️⃣  npm run setup-users          ${colors.yellow}(Crear en Firebase)${colors.reset}`);
  console.log(`      → Crea patrulla-mendoza-01@seguridad.com y operador-mendoza-01@seguridad.com\n`);

  console.log(`  2️⃣  firebase deploy --only firestore:rules,hosting`);
  console.log(`      → Publica cambios a producción\n`);

  console.log(`  3️⃣  Abrir: https://trafico-map-general-v2.web.app/control-center-v2/`);
  console.log(`      → Seleccionar Mendoza en el sidebar\n`);

  console.log(`  4️⃣  En consola del navegador, ejecutar:`);
  console.log(`      → currentCity = 'mendoza'`);
  console.log(`      → crearPatrullasPrueba()\n`);

  console.log(`  ${colors.green}✅ Verás 4 patrullas de prueba en el mapa de Mendoza${colors.reset}\n`);

  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}\n`);
}

setupMendoza().catch(e => console.error(e));
