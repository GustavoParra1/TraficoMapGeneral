// Script para asignar claims admin, role y clienteId a admin@laplata.com
// Ejecutar con: node set_admin_claims_cliente.js

const admin = require('firebase-admin');
const serviceAccount = require('./trafico-map-general-v2-firebase-adminsdk-fbsvc-c8f1cfe957.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setClaims() {
  const email = 'admin@laplata.com';
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
      role: 'admin',
      clienteId: 'laplata'
    });
    console.log('✅ Claims admin, role y clienteId asignados correctamente a', email);
    const updated = await admin.auth().getUser(user.uid);
    console.log('Claims actuales:', updated.customClaims);
    process.exit(0);
  } catch (e) {
    console.error('❌ Error asignando claims:', e);
    process.exit(1);
  }
}

setClaims();
