// Script para asignar custom claims a patrulla_007@seguridad.com automáticamente por email
// Ejecuta con Node.js y firebase-admin instalado

const admin = require('firebase-admin');
const serviceAccount = require('./trafico-map-general-v2-firebase-adminsdk-fbsvc-c8f1cfe957.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = 'patrulla_007@seguridad.com';

admin.auth().getUserByEmail(email)
  .then(userRecord => {
    const uid = userRecord.uid;
    console.log('UID encontrado:', uid);
    return admin.auth().setCustomUserClaims(uid, {
      role: 'patrulla',
      city: 'laplata',
      clienteId: 'laplata'
    }).then(() => {
      console.log('✅ Custom claims asignados correctamente');
      return admin.auth().getUser(uid);
    });
  })
  .then(userRecord => {
    console.log('Claims actuales:', userRecord.customClaims);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
