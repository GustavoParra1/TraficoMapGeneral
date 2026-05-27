// Script para borrar todos los usuarios de Auth cuyo email empiece con 'operario_' o 'patrulla_'
// Ejecutar con: node delete_by_prefix.js

const admin = require('firebase-admin');
const serviceAccount = require('./trafico-map-general-v2-firebase-adminsdk-fbsvc-c8f1cfe957.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const PREFIXES = ['operario_', 'patrulla_'];

async function deleteUsersByPrefix() {
  let nextPageToken;
  let deleted = 0;
  do {
    const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
    for (const userRecord of listUsersResult.users) {
      const email = userRecord.email || '';
      if (PREFIXES.some(prefix => email.startsWith(prefix))) {
        try {
          await admin.auth().deleteUser(userRecord.uid);
          console.log(`✅ Usuario eliminado: ${email}`);
          deleted++;
        } catch (err) {
          console.error(`❌ No se pudo eliminar ${email}:`, err.message);
        }
      }
    }
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);
  console.log(`\nTotal eliminados: ${deleted}`);
  process.exit();
}

deleteUsersByPrefix();
