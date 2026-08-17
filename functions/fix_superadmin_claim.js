// Script para corregir el claim de tu cuenta de superadmin real.
// Ejecutar con: node fix_superadmin_claim.js
// (necesita estar en la carpeta donde tengas serviceAccountKey.json)

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function fixClaims() {
  const email = 'admin@traficomap.com'; // tu cuenta real, la que usás hoy

  const user = await admin.auth().getUserByEmail(email);

  await admin.auth().setCustomUserClaims(user.uid, {
    role: 'superadmin',
    name: 'Super Admin'
    // Ya no incluimos cliente_id: 'admin' — un superadmin no pertenece
    // a ningún cliente en particular, pertenece a todos.
  });

  console.log(`✅ Claim role: 'superadmin' asignado correctamente a ${email}`);
  console.log('⚠️ Importante: cerrá sesión y volvé a entrar en /admin/ para que el token se actualice con el claim nuevo.');

  process.exit(0);
}

fixClaims().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
