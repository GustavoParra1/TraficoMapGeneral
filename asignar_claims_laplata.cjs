// Script para asignar custom claims a un usuario en Firebase
// Requiere Node.js y el paquete firebase-admin instalado

const admin = require('firebase-admin');
const serviceAccount = require('./trafico-map-general-v2-firebase-adminsdk-fbsvc-c8f1cfe957.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Cambia este UID por el del usuario que quieres modificar
const uid = '6j8mmephFeXxDWrnWO1lr7uuU892';

admin.auth().setCustomUserClaims(uid, {
  role: 'admin',
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
