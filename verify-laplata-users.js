/**
 * Verificar usuarios de La Plata en Firebase
 * Ejecutar: node verify-laplata-users.js
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccountPath = join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccountData = readFileSync(serviceAccountPath, 'utf8');
  const serviceAccount = JSON.parse(serviceAccountData);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'trafico-map-general-v2'
  });
} catch (error) {
  console.error('❌ serviceAccountKey.json no encontrado');
  process.exit(1);
}

const auth = admin.auth();

const emails = [
  'patrulla-la-plata-01@seguridad.com',
  'patrulla-la-plata-02@seguridad.com',
  'patrulla-la-plata-03@seguridad.com',
  'operador-la-plata-01@seguridad.com'
];

async function verifyUsers() {
  console.log('🔍 Verificando usuarios...\n');
  
  for (const email of emails) {
    try {
      const user = await auth.getUserByEmail(email);
      console.log(`✅ ${email}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Custom claims:`, user.customClaims || 'Ninguno');
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        console.log(`❌ ${email} - NO EXISTE`);
      } else {
        console.log(`⚠️  ${email} - Error:`, err.message);
      }
    }
  }
  
  process.exit(0);
}

verifyUsers().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
