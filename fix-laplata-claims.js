import admin from 'firebase-admin';
import fs from 'fs';

const generalCredentialsPath = 'c:\\Users\\gparra\\Downloads\\trafico-map-general-v2-firebase-adminsdk-fbsvc-85301b19d1.json';
const adminEmail = 'admin@laplata.com';

async function fixLaplataClaims() {
  try {
    console.log("🔐 Inicializando Firebase General...");
    const serviceAccount = JSON.parse(fs.readFileSync(generalCredentialsPath, 'utf8'));
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    }
    const auth = admin.auth();
    console.log(`✅ Conectado a Firebase General`);
    // Buscar usuario
    console.log(`\n🔍 Buscando: ${adminEmail}...`);
    const user = await auth.getUserByEmail(adminEmail);
    console.log(`✅ Usuario encontrado (UID: ${user.uid})`);
    // Asignar custom claims
    console.log(`\n🔧 Asignando custom claims de admin y clienteId...`);
    await auth.setCustomUserClaims(user.uid, {
      role: 'admin',
      clienteId: 'laplata'
    });
    console.log(`✅ Custom claims asignados: role=admin, clienteId=laplata`);
    console.log("\n========================================");
    console.log("✅ CUSTOM CLAIMS ACTUALIZADOS");
    console.log("========================================");
    console.log(`Email: ${adminEmail}`);
    console.log(`UID:   ${user.uid}`);
    console.log(`Role:  admin`);
    console.log(`clienteId: laplata`);
    console.log("----------------------------------------");
    console.log("🌐 Intenta entrar a: https://trafico-map-general-v2.web.app/client/");
    console.log("========================================\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

fixLaplataClaims();
