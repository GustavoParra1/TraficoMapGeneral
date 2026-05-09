import admin from 'firebase-admin';
import fs from 'fs';

const generalCredentialsPath = 'c:\\Users\\gparra\\Downloads\\trafico-map-general-v2-firebase-adminsdk-fbsvc-85301b19d1.json';
const userEmail = 'admin@laplatamaps.com.ar';

async function checkUserStatus() {
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
    
    console.log("\n========================================");
    console.log("📋 ESTADO DEL USUARIO EN FIREBASE GENERAL");
    console.log("========================================");
    console.log(`UID:               ${user.uid}`);
    console.log(`Email:             ${user.email}`);
    console.log(`Email verificado:  ${user.emailVerified}`);
    console.log(`Deshabilitado:     ${user.disabled}`);
    console.log(`Tel:               ${user.phoneNumber || 'No'}`);
    console.log(`Creado:            ${user.metadata.creationTime}`);
    console.log(`Última actualización: ${user.metadata.lastSignInTime || 'Nunca'}`);
    console.log("----------------------------------------");
    
    if (user.disabled) {
      console.log("⚠️  USUARIO DESHABILITADO!");
      console.log("Habilitando usuario...");
      await auth.updateUser(user.uid, { disabled: false });
      console.log("✅ Usuario habilitado");
    }
    
    console.log("=========================================\n");
    
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

checkUserStatus();
