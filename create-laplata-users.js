/**
 * Crear usuarios de La Plata con las credenciales exactas del import modal
 * Ejecutar: node create-laplata-users.js
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar la clave de servicio
const serviceAccountPath = join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccountData = readFileSync(serviceAccountPath, 'utf8');
  const serviceAccount = JSON.parse(serviceAccountData);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'trafico-map-general-v2'
  });
} catch (error) {
  console.error('❌ Error: No se encontró serviceAccountKey.json');
  process.exit(1);
}

const auth = admin.auth();
const db = admin.firestore();

// Usuarios La Plata con credenciales del modal de import
const LA_PLATA_USERS = [
  {
    email: 'patrulla-la-plata-01@seguridad.com',
    password: 'RezW6Ds06gUF',
    displayName: 'Patrulla La Plata 01',
    role: 'patrulla',
    city: 'laplata'
  },
  {
    email: 'patrulla-la-plata-02@seguridad.com',
    password: 'RTJEbfHIV#3s',
    displayName: 'Patrulla La Plata 02',
    role: 'patrulla',
    city: 'laplata'
  },
  {
    email: 'patrulla-la-plata-03@seguridad.com',
    password: '!pvi@D6JVni%',
    displayName: 'Patrulla La Plata 03',
    role: 'patrulla',
    city: 'laplata'
  },
  {
    email: 'operador-la-plata-01@seguridad.com',
    password: 'J1VmqDc$6Y5V',
    displayName: 'Operador La Plata 01',
    role: 'operador',
    city: 'laplata'
  }
];

async function createLaPlatUsers() {
  let created = 0;
  let existed = 0;
  let errors = 0;

  for (const user of LA_PLATA_USERS) {
    try {
      // Intentar obtener usuario existente
      let firebaseUser;
      try {
        firebaseUser = await auth.getUserByEmail(user.email);
        console.log(`♻️  ${user.email} - Ya existe, actualizando...`);
        // Actualizar contraseña
        await auth.updateUser(firebaseUser.uid, {
          password: user.password
        });
        existed++;
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          // Crear nuevo usuario
          firebaseUser = await auth.createUser({
            email: user.email,
            password: user.password,
            displayName: user.displayName
          });
          console.log(`✅ ${user.email} - Creado exitosamente`);
          created++;
        } else {
          throw err;
        }
      }

      // Establecer custom claims
      await auth.setCustomUserClaims(firebaseUser.uid, {
        role: user.role,
        city: user.city
      });

      // Guardar documento de usuario
      await db.collection('users').doc(firebaseUser.uid).set({
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        city: user.city,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

    } catch (error) {
      console.error(`❌ Error con ${user.email}:`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`✅ Creados: ${created}`);
  console.log(`♻️  Existentes: ${existed}`);
  console.log(`❌ Errores: ${errors}`);

  process.exit(errors > 0 ? 1 : 0);
}

createLaPlatUsers().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
