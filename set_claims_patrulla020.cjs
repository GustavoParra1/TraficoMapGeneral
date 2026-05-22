// Script para asignar claims a patrulla_020
// Ejecutar con: node set_claims_patrulla020.cjs

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setClaims() {
  const user = await admin.auth().getUserByEmail('patrulla_020@seguridad.com');
  await admin.auth().setCustomUserClaims(user.uid, {
    rol: 'patrulla',
    city: 'laplata'
  });
  console.log('✅ Claims asignados a patrulla_020@seguridad.com');
  process.exit(0);
}

setClaims().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
