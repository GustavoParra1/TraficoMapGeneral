// Script para asignar claims admin a un usuario en Firebase Auth
// USO: node set_admin_claim.js <email>

const admin = require('firebase-admin');
admin.initializeApp();

async function setAdmin(email) {
  if (!email) {
    console.error('Falta el email. Uso: node set_admin_claim.js <email>');
    process.exit(1);
  }
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true, role: 'admin', rol: 'admin' });
    console.log(`✅ Claims admin asignados a ${email}`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

setAdmin(process.argv[2]);
