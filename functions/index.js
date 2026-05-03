/**
 * CLOUD FUNCTIONS - TraficoMap
 * Autom atiza creación de ciudades, usuarios y patrullas
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Inicializar Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// Express app
const app = express();
app.use(express.json());

/**
 * ENDPOINT: POST /api/create-city
 * Crea ciudad con usuarios en Firebase Auth y patrullas en Firestore
 */
app.post('/api/create-city', async (req, res) => {
  try {
    const { cityName, cityId, province, lat, lng, numPatrullas, numOperadores } = req.body;

    // Validar inputs
    if (!cityName || !cityId || isNaN(lat) || isNaN(lng) || numPatrullas < 1 || numOperadores < 1) {
      return res.status(400).json({ error: 'Inputs inválidos' });
    }

    console.log(`\n🏙️  Cloud Function: Creando ciudad ${cityName}...`);

    // 1. CREAR USUARIOS EN FIREBASE AUTH
    const patrullaCredentials = [];
    const operadorCredentials = [];

    // Patrullas
    for (let i = 1; i <= numPatrullas; i++) {
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
        console.log(`   ✅ Patrulla ${i}: ${email}`);
      } catch (error) {
        if (error.code !== 'auth/email-already-exists') {
          console.error(`   ❌ Error patrulla ${i}: ${error.message}`);
        }
      }
    }

    // Operadores
    for (let i = 1; i <= numOperadores; i++) {
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
        console.log(`   ✅ Operador ${i}: ${email}`);
      } catch (error) {
        if (error.code !== 'auth/email-already-exists') {
          console.error(`   ❌ Error operador ${i}: ${error.message}`);
        }
      }
    }

    // 2. CREAR PATRULLAS EN FIRESTORE
    const coleccion = `patrullas_${cityId}`;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    console.log(`\n📍 Creando patrullas en Firestore (colección: ${coleccion})...`);

    for (let i = 1; i <= numPatrullas; i++) {
      const patrolId = `patrulla-${String(i).padStart(2, '0')}`;
      const offsetLat = Math.random() * 0.05 - 0.025;
      const offsetLng = Math.random() * 0.05 - 0.025;

      await db.collection(coleccion).doc(patrolId).set({
        lat: latNum + offsetLat,
        lng: lngNum + offsetLng,
        online: i === 1 ? false : true,
        emergencia: false,
        estado: i === 1 ? 'offline' : 'activo',
        speed: 0,
        heading: 0,
        accuracy: 10,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`   ✅ ${patrolId} creado`);
    }

    // 3. RESPUESTA
    console.log(`\n✅ Ciudad creada: ${cityName}\n`);

    res.json({
      success: true,
      message: `Ciudad ${cityName} creada exitosamente`,
      city: {
        id: cityId,
        name: cityName,
        coordinates: { lat, lng }
      },
      patrullas: patrullaCredentials.length,
      operadores: operadorCredentials.length,
      credentials: {
        patrullas: patrullaCredentials,
        operadores: operadorCredentials
      },
      nextSteps: [
        'Recargar página en navegador',
        'Verificar patrullas en el mapa'
      ]
    });

  } catch (error) {
    console.error('❌ Error en Cloud Function:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generar contraseña segura
 */
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

/**
 * Exportar Cloud Function HTTP
 */
exports.api = functions.https.onRequest(app);
