const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, 'trafico-map-general-v2-firebase-adminsdk-sv0oe-7b2dfa8c4b.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ No se encontró el archivo de clave: trafico-map-general-v2-firebase-adminsdk-*.json');
  console.log('Por favor, descrega la clave desde Firebase Console > Project Settings > Service Accounts');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();

// Update custom claims
async function updateUserClaims() {
  try {
    await auth.setCustomUserClaims('nW7Qh3fNS9ypbU3pa8k...', { role: 'admin' });
    console.log('✅ Custom claims actualizado: role=admin');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

updateUserClaims();
