// Script para sincronizar patrullas y operarios de Firestore a Firebase Auth
// Guarda este archivo como sync_patrullas_auth.js y ejecútalo con: node sync_patrullas_auth.js


import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function syncUsuarios(coleccion) {
  const snapshot = await db.collection(coleccion).get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const usuarioRaw = data.usuario || '';
    if (!usuarioRaw) {
      console.warn(`⚠️ Documento ${doc.id} sin campo 'usuario', omitido.`);
      continue;
    }
    const email = usuarioRaw.includes('@') ? usuarioRaw : `${usuarioRaw}@seguridad.com`;
    const password = data.password || 'Temporal123!';
    const displayName = data.nombre || usuarioRaw;
    try {
      // Verificar si ya existe en Auth
      await admin.auth().getUserByEmail(email);
      console.log(`🟡 Usuario ya existe en Auth: ${email}`);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        // Crear usuario
        await admin.auth().createUser({
          email,
          password,
          displayName
        });
        console.log(`🟢 Usuario creado en Auth: ${email}`);
      } else {
        console.error(`🔴 Error verificando/creando usuario ${email}:`, e.message);
      }
    }
  }
}

(async () => {
  // Cambia los nombres de colección según tu estructura
  await syncUsuarios('patrullas_laplata');
  await syncUsuarios('operarios_laplata');
  console.log('✅ Sincronización completa.');
  process.exit(0);
})();
