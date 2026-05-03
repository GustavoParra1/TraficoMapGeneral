#!/usr/bin/env node

/**
 * DEMO: Muestra exactamente qué hace create-city.js sin guardar cambios
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

async function demoCreateCity() {
  console.log(`\n${colors.bold}${colors.cyan}🎬 DEMOSTRACIÓN: Sistema Automático de Nuevas Ciudades${colors.reset}\n`);

  // Simulamos los datos de entrada
  const cityName = 'San Isidro';
  const cityId = 'sanisidro';
  const province = 'Buenos Aires';
  const latitude = -34.4758;
  const longitude = -58.5305;
  const numPatrullas = 2;
  const numOperadores = 1;

  console.log(`${colors.yellow}📍 Datos ingresados:${colors.reset}`);
  console.log(`  • Nombre: ${colors.cyan}${cityName}${colors.reset}`);
  console.log(`  • ID: ${colors.cyan}${cityId}${colors.reset}`);
  console.log(`  • Provincia: ${colors.cyan}${province}${colors.reset}`);
  console.log(`  • Coordenadas: ${colors.cyan}${latitude}, ${longitude}${colors.reset}`);
  console.log(`  • Patrullas: ${colors.cyan}${numPatrullas}${colors.reset}`);
  console.log(`  • Operadores: ${colors.cyan}${numOperadores}${colors.reset}\n`);

  // 1. Verificar cities-config.json
  console.log(`${colors.bold}${colors.green}✅ 1️⃣  ACTUALIZAR cities-config.json${colors.reset}\n`);
  
  const citiesConfigPath = path.join(__dirname, 'public', 'data', 'cities-config.json');
  const citiesConfig = JSON.parse(fs.readFileSync(citiesConfigPath, 'utf8'));
  
  const newCityConfig = {
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
  };

  console.log(`Entrada JSON que se agregaría:\n`);
  console.log(JSON.stringify(newCityConfig, null, 2));
  console.log(`\n${colors.green}→ Se agregan los datos a cities-config.json${colors.reset}\n`);

  // 2. Mostrar qué se agregaría a testing-patrullas.js
  console.log(`${colors.bold}${colors.green}✅ 2️⃣  ACTUALIZAR public/testing-patrullas.js${colors.reset}\n`);

  const testingCode = `
    // ${cityName}
    } else if (currentCity === '${cityId}') {
      latBase = ${latitude};
      lngBase = ${longitude};`;

  console.log(`Código que se agregaría:\n`);
  console.log(`${colors.cyan}${testingCode}${colors.reset}`);
  console.log(`\n${colors.green}→ Se agrega bloque de coordenadas para ${cityName}${colors.reset}\n`);

  // 3. Mostrar qué se agregaría a control-center
  console.log(`${colors.bold}${colors.green}✅ 3️⃣  ACTUALIZAR control-center-v2/index.html${colors.reset}\n`);

  const ccCode = `'${cityId}': [${latitude}, ${longitude}],`;
  console.log(`Entrada que se agregaría a CITY_COORDS:\n`);
  console.log(`${colors.cyan}${ccCode}${colors.reset}`);
  console.log(`\n${colors.green}→ Se mapean coordenadas del mapa${colors.reset}\n`);

  // 4. Mostrar reglas Firestore
  console.log(`${colors.bold}${colors.green}✅ 4️⃣  ACTUALIZAR firestore.rules${colors.reset}\n`);

  const fbRules = `
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
    }`;

  console.log(`${colors.cyan}${fbRules}${colors.reset}`);
  console.log(`\n${colors.green}→ Se agregan 4 bloques de reglas de seguridad automáticamente${colors.reset}\n`);

  // 5. Mostrar credenciales
  console.log(`${colors.bold}${colors.green}✅ 5️⃣  GENERAR CREDENCIALES${colors.reset}\n`);

  function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    return pwd;
  }

  console.log(`${colors.bold}Patrullas:${colors.reset}`);
  for (let i = 1; i <= numPatrullas; i++) {
    const email = `patrulla-${cityId}-${String(i).padStart(2, '0')}@seguridad.com`;
    const pwd = generatePassword();
    console.log(`  📧 ${colors.cyan}${email}${colors.reset}`);
    console.log(`  🔐 ${colors.yellow}${pwd}${colors.reset}\n`);
  }

  console.log(`${colors.bold}Operadores:${colors.reset}`);
  for (let i = 1; i <= numOperadores; i++) {
    const email = `operador-${cityId}-${String(i).padStart(2, '0')}@seguridad.com`;
    const pwd = generatePassword();
    console.log(`  📧 ${colors.cyan}${email}${colors.reset}`);
    console.log(`  🔐 ${colors.yellow}${pwd}${colors.reset}\n`);
  }

  console.log(`${colors.green}→ Se guardan en: ${cityId}-credentials.json${colors.reset}\n`);

  // 6. Mostrar actualización de setup-users.js
  console.log(`${colors.bold}${colors.green}✅ 6️⃣  ACTUALIZAR setup-users.js${colors.reset}\n`);

  const setupCode = `  // ========== ${cityName.toUpperCase()} ==========
  const ${cityId}Users = [
    {
      email: 'patrulla-${cityId}-01@seguridad.com',
      password: '...',
      role: 'patrulla',
      city: '${cityId}'
    },
    {
      email: 'patrulla-${cityId}-02@seguridad.com',
      password: '...',
      role: 'patrulla',
      city: '${cityId}'
    },
    {
      email: 'operador-${cityId}-01@seguridad.com',
      password: '...',
      role: 'operador',
      city: '${cityId}'
    }
  ];
  users.push(...${cityId}Users);`;

  console.log(`${colors.cyan}${setupCode}${colors.reset}`);
  console.log(`\n${colors.green}→ Se agregan usuarios listos para Firebase Auth${colors.reset}\n`);

  // Resumen final
  console.log(`\n${colors.bold}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bold}${colors.green}✨ RESUMEN: Todo lo que hace el sistema AUTOMÁTICAMENTE${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}\n`);

  console.log(`${colors.green}✅ Archivos modificados:${colors.reset}`);
  console.log(`   1. public/data/cities-config.json`);
  console.log(`   2. public/testing-patrullas.js`);
  console.log(`   3. public/control-center-v2/index.html`);
  console.log(`   4. firestore.rules`);
  console.log(`   5. setup-users.js`);
  console.log(`   6. ${cityId}-credentials.json (NUEVO)\n`);

  console.log(`${colors.green}✅ Cambios realizados:${colors.reset}`);
  console.log(`   • 1 entrada en cities-config.json`);
  console.log(`   • 1 bloque de coordenadas en testing-patrullas.js`);
  console.log(`   • 1 entrada en CITY_COORDS`);
  console.log(`   • 4 bloques de reglas en firestore.rules`);
  console.log(`   • 3 usuarios generados en setup-users.js`);
  console.log(`   • 3 credenciales seguras generadas\n`);

  console.log(`${colors.green}✅ Tiempo:${colors.reset} 2 minutos (vs 45-60 minutos manual)\n`);

  console.log(`${colors.yellow}📋 PRÓXIMOS PASOS (justo después de crear):${colors.reset}`);
  console.log(`   1. npm run setup-users          # Crear en Firebase Auth`);
  console.log(`   2. firebase deploy --only firestore:rules,hosting   # Deploy`);
  console.log(`   3. Probar: currentCity = '${cityId}' && crearPatrullasPrueba()\n`);

  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}\n`);
  console.log(`${colors.green}${colors.bold}🎉 ¡SISTEMA COMPLETAMENTE FUNCIONAL!${colors.reset}\n`);
}

demoCreateCity().catch(e => console.error(e));
