const admin = require('firebase-admin');

// Inicializa tu app con tu serviceAccountKey.json
admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json'))
});

const email = 'admin@laplata.com';

admin.auth().getUserByEmail(email)
  .then(user => {
    return admin.auth().setCustomUserClaims(user.uid, { clienteId: 'laplata' });
  })
  .then(() => {
    console.log('✅ Claim clienteId: laplata asignado a', email);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });