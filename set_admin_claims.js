// Script para asignar claims de superadministrador y administrador de ciudad en Firebase Auth
// Ejecutar con: node set_admin_claims.js

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Debes descargar tu clave de servicio desde Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setClaims() {
  // Superadministrador global
  await admin.auth().setCustomUserClaims(
    (await admin.auth().getUserByEmail('admin@trafico-map.com')).uid,
    { role: 'superadmin' }
  );
  console.log('✅ Claim superadmin asignado a admin@trafico-map.com');

  // Administrador de La Plata
  await admin.auth().setCustomUserClaims(
    (await admin.auth().getUserByEmail('admin@laplata.com')).uid,
    { role: 'admin', city: 'laplata' }
  );
  console.log('✅ Claim admin/city asignado a admin@laplata.com');

  // Ejemplo: agregar más administradores de ciudad aquí
  // await admin.auth().setCustomUserClaims(
  //   (await admin.auth().getUserByEmail('admin@cordoba.com')).uid,
  //   { role: 'admin', city: 'cordoba' }
  // );
  // console.log('✅ Claim admin/city asignado a admin@cordoba.com');

  process.exit(0);
}

setClaims().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
