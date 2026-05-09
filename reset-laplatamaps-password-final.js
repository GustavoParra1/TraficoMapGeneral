import admin from 'firebase-admin';
import fs from 'fs';

const generalCredentialsPath = 'c:\\Users\\gparra\\Downloads\\trafico-map-general-v2-firebase-adminsdk-fbsvc-85301b19d1.json';
const userEmail = 'admin@laplatamaps.com.ar';
const newPassword = 'TestPass123456!';

async function resetPassword() {
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
    
    // Buscar usuario por email
    console.log(`\n🔍 Buscando usuario: ${userEmail}...`);
    const user = await auth.getUserByEmail(userEmail);
    console.log(`✅ Usuario encontrado (UID: ${user.uid})`);
    
    // Actualizar contraseña
    console.log(`\n🔧 Actualizando contraseña...`);
    await auth.updateUser(user.uid, {
      password: newPassword
    });
    
    console.log(`✅ Contraseña actualizada`);
    
    console.log("\n========================================");
    console.log("✅ CREDENCIALES ACTUALES");
    console.log("========================================");
    console.log(`Email:    ${userEmail}`);
    console.log(`Password: ${newPassword}`);
    console.log(`UID:      ${user.uid}`);
    console.log("----------------------------------------");
    console.log("🌐 Intenta entrar a: https://trafico-map-general-v2.web.app/client/");
    console.log("========================================\n");
    
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

resetPassword();
