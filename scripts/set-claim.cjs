const admin = require('firebase-admin');

// Inicializa tu app con tu serviceAccountKey.json
try {
  admin.initializeApp({
    credential: admin.credential.cert(require('./service-account-key.json'))
  });
} catch (e) {
  // Ya inicializado
}

const uid = 'isB8SwuYeqSZncizuwA783wb6sX2'; // UID completo de admin@laplata.com

admin.auth().setCustomUserClaims(uid, { clienteId: 'laplata' })
  .then(() => {
    console.log('✅ Claim clienteId: laplata asignado a UID', uid);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
