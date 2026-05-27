// fix-admin-claims.cjs
// Ejecutar UNA VEZ con: node fix-admin-claims.cjs
// Corrige los custom claims de admin@laplata.com para que incluya admin:true


const admin = require('firebase-admin');
const serviceAccount = require('./functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'trafico-map-general-v2'
});

async function fixAdminClaims() {
  const email = 'admin@laplata.com';
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log('Usuario encontrado:', user.uid);
    console.log('Claims actuales:', user.customClaims);

    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,       // <-- este es el que faltaba
      role: 'admin',
      rol: 'admin',
      city: 'laplata'
    });

    // Verificar
    const updated = await admin.auth().getUser(user.uid);
    console.log('✅ Claims actualizados:', updated.customClaims);
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

fixAdminClaims();
