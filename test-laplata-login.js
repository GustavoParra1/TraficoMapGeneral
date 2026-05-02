/**
 * Probar login con credenciales de La Plata
 * Ejecutar: node test-laplata-login.js
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

// Credenciales del modal de importación
const credentials = [
  {
    email: 'patrulla-la-plata-01@seguridad.com',
    password: 'RezW6Ds06gUF'
  },
  {
    email: 'patrulla-la-plata-02@seguridad.com',
    password: 'RTJEbfHIV#3s'
  },
  {
    email: 'patrulla-la-plata-03@seguridad.com',
    password: '!pvi@D6JVni%'
  },
  {
    email: 'operador-la-plata-01@seguridad.com',
    password: 'J1VmqDc$6Y5V'
  }
];

async function testLogin() {
  console.log('🔐 Probando credenciales del modal de importación...\n');
  
  for (const cred of credentials) {
    try {
      const user = await auth.getUserByEmail(cred.email);
      console.log(`✅ ${cred.email}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Contraseña en BD: ${cred.password}`);
      console.log(`   Email verificado: ${user.emailVerified}`);
      console.log(`   Habilitado: ${user.disabled ? 'NO ⚠️' : 'SÍ ✓'}`);
    } catch (err) {
      console.log(`❌ ${cred.email} - Error:`, err.message);
    }
    console.log();
  }
  
  process.exit(0);
}

testLogin().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
