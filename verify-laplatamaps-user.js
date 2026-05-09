// Script para verificar usuario en Firebase LAPLATAMAPS
import admin from 'firebase-admin';
import fs from 'fs';

const credentialsPath = 'c:\\Users\\gparra\\Downloads\\laplatamaps-52a3b-firebase-adminsdk-fbsvc-1bbee791ac.json';
const userEmail = 'admin@laplatamaps.com.ar';
const userUid = 'Fv9Ye5MpgHXjgEm2o1DB0cDxF053';

async function verifyUser() {
  try {
    console.log("🔐 Inicializando Firebase Admin SDK con credenciales de LAPLATAMAPS...");
    
    // Leer credenciales
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    // Inicializar Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    
    const auth = admin.auth();
    
    console.log(`✅ Conectado a Firebase LAPLATAMAPS`);
    console.log(`🔍 Buscando usuario con UID: ${userUid}`);
    
    try {
      // Buscar usuario por UID
      const user = await auth.getUser(userUid);
      console.log("\n✅ ¡Usuario encontrado!");
      console.log("========================================");
      console.log("📋 INFORMACIÓN DEL USUARIO");
      console.log("========================================");
      console.log(`UID:              ${user.uid}`);
      console.log(`Email:            ${user.email}`);
      console.log(`Email verificado: ${user.emailVerified}`);
      console.log(`Deshabilitado:    ${user.disabled}`);
      console.log(`Creado:           ${user.metadata.creationTime}`);
      console.log(`Última login:     ${user.metadata.lastSignInTime || 'Nunca'}`);
      console.log("----------------------------------------");
      
      // Intentar crear una nueva contraseña
      console.log("\n🔧 Intentando setear nueva contraseña...");
      const newPassword = 'TestPass123456!';
      
      await auth.updateUser(userUid, {
        password: newPassword
      });
      
      console.log("✅ Contraseña actualizada!");
      console.log(`Password: ${newPassword}`);
      
    } catch (error) {
      console.log(`❌ Usuario NO encontrado con ese UID`);
      console.log(`Error: ${error.message}`);
      
      console.log("\n🔍 Buscando por email...");
      try {
        const user = await auth.getUserByEmail(userEmail);
        console.log("✅ Usuario encontrado por email!");
        console.log(`UID: ${user.uid}`);
        console.log(`Email: ${user.email}`);
      } catch (err) {
        console.log(`❌ Usuario tampoco encontrado por email`);
        console.log(`Error: ${err.message}`);
      }
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

verifyUser();
