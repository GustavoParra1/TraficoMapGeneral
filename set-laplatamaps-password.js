// Script para setear contraseña en Firebase LAPLATAMAPS usando Admin SDK
import admin from 'firebase-admin';
import fs from 'fs';

const credentialsPath = 'c:\\Users\\gparra\\Downloads\\laplatamaps-52a3b-firebase-adminsdk-fbsvc-1bbee791ac.json';
const userEmail = 'admin@laplatamaps.com.ar';
const userUid = 'Fv9Ye5MpgHXjgEm2o1DB0cDxF053';
const newPassword = 'LaPlata2026!Temporal';

async function setPassword() {
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
    console.log(`📧 Actualizando contraseña para: ${userEmail}`);
    
    // Setear nueva contraseña
    await auth.updateUser(userUid, {
      password: newPassword
    });
    
    console.log("✅ ¡Contraseña actualizada exitosamente!");
    console.log("========================================");
    console.log("📋 CREDENCIALES TEMPORALES");
    console.log("========================================");
    console.log(`Email:    ${userEmail}`);
    console.log(`Password: ${newPassword}`);
    console.log("----------------------------------------");
    console.log("🌐 Acceso: https://trafico-map-general-v2.web.app/client/");
    console.log("========================================");
    
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

setPassword();
