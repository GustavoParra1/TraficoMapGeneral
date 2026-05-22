// Script para asignar custom claims a todos los patrullas y operarios de La Plata
// Ejecuta con Node.js y firebase-admin instalado

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Lista de emails de patrullas y operarios de La Plata
const emails = [
  // Agrega aquí todos los emails de patrullas y operarios
  'patrulla_001@seguridad.com',
  'patrulla_002@seguridad.com',
  'patrulla_003@seguridad.com',
  'patrulla_007@seguridad.com',
  // ...
];

async function asignarClaims() {
  for (const email of emails) {
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: 'patrulla', // legacy
        rol: 'patrulla',  // multitenant
        city: 'laplata',
        clienteId: 'laplata'
      });
      console.log(`✅ Claims asignados a ${email}`);
    } catch (error) {
      console.error(`❌ Error con ${email}:`, error.message);
    }
  }
  process.exit(0);
}

asignarClaims();
