// Script para asignar custom claims a patrulla_007@seguridad.com en Firebase
// Ejecuta con Node.js y firebase-admin instalado

const admin = require('firebase-admin');
const serviceAccount = require('./trafico-map-general-v2-firebase-adminsdk-fbsvc-c8f1cfe957.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Cambia este UID por el UID real del usuario patrulla_007@seguridad.com
const uid = 'REEMPLAZAR_UID_AQUI';

admin.auth().setCustomUserClaims(uid, {
  role: 'patrulla',
  city: 'laplata',
  clienteId: 'laplata'
}).then(() => {
  console.log('✅ Custom claims asignados correctamente');
  return admin.auth().getUser(uid);
}).then(userRecord => {
  console.log('Claims actuales:', userRecord.customClaims);
  process.exit(0);
}).catch(error => {
  console.error('Error asignando claims:', error);
  process.exit(1);
});
