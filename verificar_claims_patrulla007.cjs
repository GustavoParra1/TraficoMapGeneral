// Script para verificar los custom claims de un usuario por email
// Ejecuta con Node.js y firebase-admin instalado

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = 'patrulla_020@seguridad.com';

async function verificarClaims() {
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log('Email:', userRecord.email);
    console.log('UID:', userRecord.uid);
    console.log('Custom Claims:', userRecord.customClaims);
  } catch (error) {
    console.error('Error al obtener usuario:', error.message);
  }
  process.exit(0);
}

verificarClaims();
