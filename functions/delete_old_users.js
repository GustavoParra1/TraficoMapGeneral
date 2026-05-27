// Script para borrar usuarios de Firebase Auth por email
// Ejecutar con: node delete_old_users.js

const admin = require('firebase-admin');
const serviceAccount = require('./trafico-map-general-v2-firebase-adminsdk-fbsvc-c8f1cfe957.json'); // Debes descargar tu serviceAccountKey desde Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Lista de emails a borrar (completa con los emails que quieras eliminar)
const emailsToDelete = [
  'operario_gustavo@seguridad.com',
  'operario_andres@seguridad.com',
  'operario_silvia@seguridad.com',
  'operario_alejandra@seguridad.com',
  'operario_pedro@seguridad.com',
  'operario_maria@seguridad.com',
  'operario_juancito@seguridad.com',
  'operario_sandra@seguridad.com',
  'operario_martina@seguridad.com',
  'operario_juan@seguridad.com',
];

async function deleteUsersByEmail(emails) {
  for (const email of emails) {
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().deleteUser(user.uid);
      console.log(`✅ Usuario eliminado: ${email}`);
    } catch (err) {
      console.error(`❌ No se pudo eliminar ${email}:`, err.message);
    }
  }
  process.exit();
}

deleteUsersByEmail(emailsToDelete);
