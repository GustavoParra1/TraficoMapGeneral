import admin from 'firebase-admin';
import fs from 'fs';

const generalCredentialsPath = 'c:\\Users\\gparra\\Downloads\\trafico-map-general-v2-firebase-adminsdk-fbsvc-85301b19d1.json';
const userEmail = 'admin@laplatamaps.com.ar';
const newPassword = 'LaPlata2024!Secure';

async function recreateUser() {
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
    
    // Buscar usuarioconsole.log(`\n🔍 Eliminando usuario existente: ${userEmail}...`);
    try {
      const user = await auth.getUserByEmail(userEmail);
      await auth.deleteUser(user.uid);
      console.log(`✅ Usuario anterior eliminado (UID: ${user.uid})`);
    } catch (err) {
      if (err.code !== 'auth/user-not-found') {
        throw err;
      }
      console.log(`ℹ️  Usuario no existía`);
    }
    
    // Crear usuario nuevo
    console.log(`\n🆕 Creando usuario nuevo...`);
    const newUser = await auth.createUser({
      email: userEmail,
      password: newPassword,
      emailVerified: true
    });
    
    console.log(`✅ Usuario creado: ${newUser.uid}`);
    
    console.log("\n========================================");
    console.log("✅ USUARIO RECREADO EXITOSAMENTE");
    console.log("========================================");
    console.log(`Email:    ${userEmail}`);
    console.log(`Password: ${newPassword}`);
    console.log(`UID:      ${newUser.uid}`);
    console.log("----------------------------------------");
    console.log("🌐 URL: https://trafico-map-general-v2.web.app/client/");
    console.log("========================================\n");
    
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

recreateUser();
