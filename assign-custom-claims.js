import admin from 'firebase-admin';
import fs from 'fs';

const generalCredentialsPath = 'c:\\Users\\gparra\\Downloads\\trafico-map-general-v2-firebase-adminsdk-fbsvc-85301b19d1.json';
const userEmail = 'admin@laplata.com';
const clientId = 'laplata';

async function assignCustomClaims() {
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
    console.log(`\n🔍 Buscando usuario: ${userEmail}...`);
    const user = await auth.getUserByEmail(userEmail);
    console.log(`✅ Usuario encontrado (UID: ${user.uid})`);
    
    // Asignar custom claims
    console.log(`\n🔧 Asignando custom claims...`);
    await auth.setCustomUserClaims(user.uid, {
      role: 'admin',
      clienteId: clientId
    });
    
    console.log(`✅ Custom claims asignados`);
    
    console.log("\n========================================");
    console.log("✅ CUSTOM CLAIMS ASIGNADOS");
    console.log("========================================");
    console.log(`UID:         ${user.uid}`);
    console.log(`Email:       ${userEmail}`);
    console.log(`cliente_id:  ${clientId}`);
    console.log(`role:        admin`);
    console.log("----------------------------------------");
    console.log("🌐 URL: https://trafico-map-general-v2.web.app/client/");
    console.log("========================================\n");
    
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

assignCustomClaims();
